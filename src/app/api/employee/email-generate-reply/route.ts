/**
 * On-demand AI reply generation — employee clicks "🤖 Wygeneruj odpowiedź" in compose window
 *
 * POST body: { subject: string, emailBody: string, from: string, inline_feedback?: { previous_draft: string, rating?: number, tags?: string[], note?: string } }
 * Returns:   { draft_html: string, reasoning: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { buildContextPrompt } from '@/lib/unifiedAI';

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
            const PRODENTIS_API_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
            const slotsByDay: string[] = [];
            for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
                const d = new Date();
                d.setDate(d.getDate() + dayOffset);
                const dateStr = d.toISOString().split('T')[0];
                try {
                    const slotsRes = await fetch(`${PRODENTIS_API_URL}/api/slots/free?date=${dateStr}&duration=30`, {
                        signal: AbortSignal.timeout(3000),
                    });
                    if (slotsRes.ok) {
                        const slotsData = await slotsRes.json();
                        if (slotsData.slots && slotsData.slots.length > 0) {
                            const dayName = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                            const doctorSlots = slotsData.slots.reduce((acc: Record<string, string[]>, slot: any) => {
                                const doc = slot.doctorName || 'Nieprzypisany';
                                if (!acc[doc]) acc[doc] = [];
                                acc[doc].push(slot.time || slot.startTime);
                                return acc;
                            }, {} as Record<string, string[]>);
                            const summary = Object.entries(doctorSlots).map(([doc, times]) =>
                                `  - ${doc}: ${(times as string[]).slice(0, 5).join(', ')}${(times as string[]).length > 5 ? ` (+${(times as string[]).length - 5} więcej)` : ''}`
                            ).join('\n');
                            slotsByDay.push(`${dayName}:\n${summary}`);
                        }
                    }
                } catch { /* skip */ }
            }
            if (slotsByDay.length > 0) {
                appointmentSlotsContext = '\n\n## WOLNE TERMINY WIZYT (NAJBLIŻSZE 7 DNI)\nPoniżej aktualne wolne terminy. Podawaj je pacjentom gdy pytają o umówienie wizyty:\n\n' +
                    slotsByDay.join('\n');
            }
        } catch {
            console.log('[Generate Reply] Could not fetch Prodentis slots');
        }

        // Build context strings
        const instructionsContext = activeInstructions.length > 0
            ? `\n\n## INSTRUKCJE OD ADMINA (OBOWIĄZKOWE)\n${activeInstructions.map((i: any, idx: number) => `${idx + 1}. [${(i.category || 'other').toUpperCase()}] ${i.instruction}`).join('\n')}`
            : '';

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
                            content: `Od: ${from || 'Nieznany nadawca'}
Temat: ${subject}

Treść emaila na który odpowiadamy:
${(emailBody || '').substring(0, 4000)}`
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
                            corrections.push(`Uwagi od pracownika: ${inline_feedback.note}`);
                        }

                        messages.push({
                            role: 'assistant' as const,
                            content: JSON.stringify({ draft_html: inline_feedback.previous_draft, reasoning: 'Poprzednia wersja' }),
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

        return NextResponse.json({
            draft_html: parsed.draft_html || '',
            reasoning: parsed.reasoning || '',
        });
    } catch (err: any) {
        console.error('[Generate Reply] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
    }
}
