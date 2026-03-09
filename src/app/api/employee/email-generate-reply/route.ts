/**
 * On-demand AI reply generation — employee clicks "🤖 Wygeneruj odpowiedź" in compose window
 *
 * POST body: { subject: string, emailBody: string, from: string }
 * Returns:   { draft_html: string, reasoning: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase';

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

    const { subject, emailBody, from } = await req.json();

    if (!subject && !emailBody) {
        return NextResponse.json({ error: 'Subject or email body required' }, { status: 400 });
    }

    try {
        // Load training context (resilient — works even if migration 072 tables missing)
        let activeInstructions: any[] = [];
        let recentFeedback: any[] = [];
        let effectiveKnowledgeBase = KNOWLEDGE_BASE;

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
            const { data: kbRow } = await supabase.from('site_settings').select('value').eq('key', 'ai_knowledge_base').maybeSingle();
            if (kbRow?.value) effectiveKnowledgeBase = kbRow.value;
        } catch { /* fallback to static */ }

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
                messages: [
                    {
                        role: 'system',
                        content: `Jesteś asystentem recepcji gabinetu stomatologicznego Mikrostomart w Opolu.

TWOJE ZADANIE:
Pracownik kliniki odpowiada na email pacjenta/klienta i poprosił Cię o wygenerowanie propozycji odpowiedzi.

Napisz profesjonalną, ciepłą odpowiedź po polsku w imieniu recepcji kliniki Mikrostomart. Odpowiedź powinna:
- Być profesjonalna ale ciepła i naturalna
- Zawierać konkretne informacje z bazy wiedzy kliniki (cennik, godziny, kontakt) jeśli pasują do tematu
- Być zakończona zachętą do kontaktu telefonicznego lub wizyty
- Nie zawierać linii powitania "Szanowny/a Pani/Panie" — zaczynaj od "Dzień dobry" lub prostego powitania
- Być zwięzła (nie za długa, nie za krótka — adekwatna do pytania)

BAZA WIEDZY KLINIKI:
${effectiveKnowledgeBase}
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
                ],
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
