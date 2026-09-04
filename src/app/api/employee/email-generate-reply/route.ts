/**
 * On-demand AI reply generation — employee clicks "🤖 Wygeneruj odpowiedź" in compose window
 *
 * 🔒 Treść maila i tożsamość nadawcy przechodzą przez `prepareEmailForModel`
 *    (pseudonimizacja) ZANIM trafią do promptu; odpowiedź modelu wraca przez
 *    `restoreForHuman`, więc człowiek widzi prawdziwe dane, a OpenAI nigdy ich nie
 *    dostaje. Baza wiedzy gabinetu celowo NIE jest czyszczona — patrz nota
 *    „co zamieniamy, a czego nie" w `lib/emailAiPrivacy.ts`.
 *
 * POST body: { subject: string, emailBody: string, from: string, inline_feedback?: { previous_draft: string, rating?: number, tags?: string[], note?: string } }
 * Returns:   { draft_html: string, reasoning: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { zbudujKontekstTerminow } from '@/lib/prodentisSlots';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { buildContextPrompt } from '@/lib/unifiedAI';
import { prepareEmailForModel, residualIdentifiers, restoreForHuman } from '@/lib/emailAiPrivacy';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // AI generation can take a few seconds

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    // Auth
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { subject, emailBody, from, inline_feedback } = await req.json();

    if (!subject && !emailBody) {
        return NextResponse.json({ error: 'Subject or email body required' }, { status: 400 });
    }

    try {
        // Load training context (resilient — works even if migration 072 tables missing)
        let activeInstructions: any[] = [];
        let recentFeedback: any[] = [];
        let effectiveKnowledgeBase = '';

        try {
            const { data } = await supabase.from('email_ai_instructions').select('*').eq('is_active', true);
            activeInstructions = data || [];
        } catch { /* table may not exist */ }

        try {
            const { data } = await supabase.from('email_ai_feedback')
                .select('ai_analysis, feedback_note')
                .order('created_at', { ascending: false })
                .limit(10);
            recentFeedback = data || [];
        } catch { /* table may not exist */ }

        try {
            effectiveKnowledgeBase = await buildContextPrompt('email_draft');
        } catch {
            // fallback — will use empty string, route-specific prompt still works
            console.warn('[Generate Reply] Could not load KB from unifiedAI');
        }

        // Load uploaded knowledge files
        let knowledgeFilesContext = '';
        try {
            const { data: kFiles } = await supabase
                .from('email_ai_knowledge_files')
                .select('filename, content_text, description')
                .order('created_at', { ascending: false })
                .limit(10);
            if (kFiles && kFiles.length > 0) {
                knowledgeFilesContext = '\n\n## DODATKOWE MATERIAŁY WIEDZY (WGRANE PLIKI)\n' +
                    kFiles.map((f: any) =>
                        `### Plik: ${f.filename}${f.description ? ` — ${f.description}` : ''}\n${f.content_text.substring(0, 5000)}`
                    ).join('\n\n');
            }
        } catch { /* table may not exist yet */ }

        // Fetch available appointment slots from Prodentis (next 7 days)
        let appointmentSlotsContext = '';
        try {
            // 🔑 3e (2026-09-04): JEDNO żądanie na siedem dni zamiast siedmiu, i z `meta=1` —
            // czyli asystent dostaje też statusy. Dotąd dzień z kompletem zapisów był dla niego
            // nieodróżnialny od dnia wolnego: po prostu go pomijał, więc na pytanie „kiedy się
            // dostanę?" milczał, zamiast napisać „tego dnia komplet, najbliższy wolny 11 września".
            const dzisiaj = new Date();
            dzisiaj.setDate(dzisiaj.getDate() + 1);
            const odKiedy = dzisiaj.toISOString().split('T')[0];
            let kontekstDni = '';
            try {
                const res = await prodentisFetch(
                    `/api/slots/free?date=${odKiedy}&days=7&duration=30&meta=1`,
                    { timeoutMs: 12000 },
                );
                if (res.ok) {
                    kontekstDni = zbudujKontekstTerminow(await res.json(), (data) => {
                        const d = new Date(`${data}T12:00:00`);
                        return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                    });
                }
            } catch (e) {
                /* brak kontekstu terminów jest lepszy niż zły kontekst — ale awaria ma zostawić ślad */
                console.error('[Generate Reply] Nie udało się pobrać wolnych terminów z PMS:', e);
            }

            if (kontekstDni) {
                appointmentSlotsContext = '\n\n## WOLNE TERMINY WIZYT (NAJBLIŻSZE 7 DNI)\n'
                    + 'Poniżej aktualny stan terminów. Podawaj godziny pacjentom, gdy pytają o umówienie wizyty.\n'
                    + '🔴 Gdy przy dniu stoi „BRAK PEWNEJ INFORMACJI" — NIE pisz, że terminów nie ma;\n'
                    + 'zaproponuj kontakt telefoniczny z rejestracją.\n\n' + kontekstDni;
            }
        } catch {
            console.log('[Generate Reply] Could not fetch Prodentis slots');
        }

        // Build context strings
        const instructionsContext = activeInstructions.length > 0
            ? `\n\n## INSTRUKCJE OD ADMINA (OBOWIĄZKOWE)\n${activeInstructions.map((i: any, idx: number) => `${idx + 1}. [${(i.category || 'other').toUpperCase()}] ${i.instruction}`).join('\n')}`
            : '';

        // ─── PSEUDONIMIZACJA ────────────────────────────────────────────────
        // Wszystko, co pochodzi od PACJENTA (nadawca, temat, treść) oraz historia
        // poprawek (to zapis wcześniejszej korespondencji) idzie do modelu
        // w postaci żetonów. Odpowiedź odtwarzamy niżej przez `restoreForHuman`.
        const prepared = prepareEmailForModel(
            { fromName: from, fromAddress: from, subject, body: (emailBody || '').substring(0, 4000) },
            recentFeedback,
        );
        const safe = prepared.safe;
        recentFeedback = prepared.safeFeedback;

        const leftovers = residualIdentifiers(`${safe.subject}\n${safe.body}`);
        if (leftovers.length > 0) {
            // Czujka, nie blokada — patrz nota przy `residualIdentifiers`.
            console.warn('[Generate Reply] pozostałe identyfikatory po pseudonimizacji:', leftovers.join(','));
        }

        const feedbackContext = recentFeedback.length > 0
            ? `\n\n## WNIOSKI Z POPRZEDNICH POPRAWEK\n${recentFeedback.map((f: any, idx: number) => {
                let entry = `${idx + 1}. `;
                if (f.ai_analysis) entry += f.ai_analysis;
                if (f.feedback_note) entry += ` (Uwaga admina: ${f.feedback_note})`;
                return entry;
            }).join('\n')}`
            : '';

        // Call GPT
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.3,
                max_tokens: 2000,
                messages: (() => {
                    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
                        {
                            role: 'system',
                            content: `Jesteś asystentem recepcji gabinetu stomatologicznego Mikrostomart w Opolu.

TWOJE ZADANIE:
Pracownik kliniki odpowiada na email pacjenta/klienta i poprosił Cię o wygenerowanie propozycji odpowiedzi.

Napisz profesjonalną, ciepłą odpowiedź po polsku w imieniu recepcji kliniki Mikrostomart. Odpowiedź powinna:
- Być profesjonalna ale ciepła i naturalna
- Zawierać KONKRETNE ceny z cennika kliniki gdy pacjent pyta o koszty (dodaj "ceny orientacyjne, ostateczna wycena po konsultacji")
- Gdy pacjent pyta o termin wizyty — sprawdź WOLNE TERMINY poniżej i zaproponuj konkretne daty
- Być zakończona zachętą do kontaktu telefonicznego (+48 570 270 470) lub rezerwacji online (/rezerwacja)
- Nie zawierać linii powitania "Szanowny/a Pani/Panie" — zaczynaj od "Dzień dobry" lub prostego powitania
- Być zwięzła (nie za długa, nie za krótka — adekwatna do pytania)

BAZA WIEDZY KLINIKI:
${effectiveKnowledgeBase}${knowledgeFilesContext}${appointmentSlotsContext}
${instructionsContext}${feedbackContext}

ODPOWIEDZ W FORMACIE JSON:
{
  "draft_html": "<p>Treść odpowiedzi w HTML...</p>",
  "reasoning": "Krótkie wyjaśnienie co wziąłeś pod uwagę (1-2 zdania)"
}`
                        },
                        {
                            role: 'user',
                            // ⚠️ WYŁĄCZNIE wartości po pseudonimizacji — nigdy surowe `from`,
                            // `subject`, `emailBody`. Zmiana tego miejsca na oryginały
                            // przywraca dokładnie tę dziurę, którą zamyka ten moduł.
                            content: `Od: ${safe.fromName}
Temat: ${safe.subject}

Treść emaila na który odpowiadamy:
${safe.body}`
                        }
                    ];

                    // If regenerating with inline feedback, add the correction context
                    if (inline_feedback && inline_feedback.previous_draft) {
                        const corrections: string[] = [];
                        if (inline_feedback.tags && inline_feedback.tags.length > 0) {
                            corrections.push(`Problemy z poprzednią wersją: ${inline_feedback.tags.join(', ')}`);
                        }
                        if (inline_feedback.rating) {
                            corrections.push(`Ocena poprzedniej wersji: ${inline_feedback.rating}/5`);
                        }
                        if (inline_feedback.note) {
                            corrections.push(`Uwagi od pracownika: ${prepared.scrubber.scrub(inline_feedback.note)}`);
                        }

                        messages.push({
                            role: 'assistant' as const,
                            // Poprzednia wersja draftu ZAWIERA imię pacjenta („Dzień dobry Panie…")
                            // — bez czyszczenia regeneracja wysyłałaby je do modelu bocznymi drzwiami.
                            content: JSON.stringify(
                                prepared.scrubber.scrubDeep({ draft_html: inline_feedback.previous_draft, reasoning: 'Poprzednia wersja' }),
                            ),
                        });
                        messages.push({
                            role: 'user' as const,
                            content: `Poprzednia odpowiedź NIE była satysfakcjonująca. Popraw ją według poniższych wskazówek:\n\n${corrections.join('\n')}\n\nWygeneruj POPRAWIONĄ wersję odpowiedzi w tym samym formacie JSON.`,
                        });
                    }

                    return messages;
                })(),
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('[Generate Reply] OpenAI error:', errText);
            return NextResponse.json({ error: 'Błąd AI — spróbuj ponownie' }, { status: 502 });
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI nie zwróciło poprawnej odpowiedzi' }, { status: 500 });
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Model pisze „Dzień dobry PACJENT_1" — człowiek ma zobaczyć prawdziwe imię.
        // Odtwarzamy na STRUKTURZE, nie na stringu JSON-a (ta sama zasada co przy czyszczeniu).
        const restored = restoreForHuman(prepared.scrubber, {
            draft_html: parsed.draft_html || '',
            reasoning: parsed.reasoning || '',
        });

        return NextResponse.json(restored);
    } catch (err: any) {
        console.error('[Generate Reply] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
    }
}
