/**
 * /api/admin/ai-trainer
 *
 * Persistent AI Trainer — conversational education chat for admin.
 *
 * GET  — load conversation history (paginated)
 * POST — send message (style example or instruction), AI responds
 * PATCH — approve/reject proposed KB changes
 *
 * Auth: Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { getAICompletion } from '@/lib/unifiedAI';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const maxDuration = 60;

// ── GET — Load conversation history ────────────────────────────

export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Load all messages (newest last)
        const { data: messages, error } = await supabase
            .from('ai_trainer_messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Count style lessons learned
        const styleCount = (messages || []).filter(m => m.message_type === 'style_analysis').length;
        const kbAppliedCount = (messages || []).filter(m => m.message_type === 'kb_applied').length;

        return NextResponse.json({
            messages: messages || [],
            stats: {
                total_messages: (messages || []).length,
                style_lessons: styleCount,
                kb_changes_applied: kbAppliedCount,
            },
        });
    } catch (err: any) {
        console.error('[AI Trainer GET] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── POST — Send message to trainer ─────────────────────────────

export async function POST(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { message, message_type, metadata: inputMetadata } = body;

        if (!message?.trim()) {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }

        // Determine message type
        const msgType = message_type || 'general';

        // 1. Save user message to DB
        await supabase.from('ai_trainer_messages').insert({
            role: 'user',
            content: message,
            message_type: msgType,
            metadata: inputMetadata || {},
            created_by: user.email,
        });

        // 2. Load conversation history (sliding window — last 50 messages)
        const { data: history } = await supabase
            .from('ai_trainer_messages')
            .select('role, content, message_type, metadata, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        const orderedHistory = (history || []).reverse();

        // 3. Load ALL style lessons (always included as learned rules)
        const { data: styleLessons } = await supabase
            .from('ai_trainer_messages')
            .select('content, metadata')
            .eq('role', 'assistant')
            .eq('message_type', 'style_analysis')
            .order('created_at', { ascending: true });

        const learnedRules = (styleLessons || [])
            .map(s => s.content)
            .join('\n---\n');

        // 4. Load current KB sections for context
        const { data: kbSections } = await supabase
            .from('ai_knowledge_base')
            .select('section, title, content, context_tags')
            .eq('is_active', true)
            .order('priority', { ascending: true });

        const kbSummary = (kbSections || []).map(s =>
            `### Sekcja: "${s.section}" (${s.title})\nKonteksty: ${s.context_tags.join(', ')}\nTreść (${s.content.length} znaków):\n${s.content.substring(0, 500)}${s.content.length > 500 ? '...' : ''}`
        ).join('\n\n---\n\n');

        // 5. Build conversation messages for GPT
        const conversationMessages = orderedHistory.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        // 6. Build extra context
        const extraContext = `
TWOJA ROLA:
Jesteś AI Trenerem kliniki stomatologicznej. Prowadzisz CIĄGŁĄ rozmowę edukacyjną z administratorem.
Twoje zadanie to uczyć AI asystentów kliniki lepszego pisania i zachowywania się.

ZASADY KONWERSACJI:
1. ANALIZA STYLU — gdy admin wkleja parę (draft AI + poprawiona wersja):
   - Porównaj OBA teksty szczegółowo
   - Wyciągnij KONKRETNE różnice (ton, zwroty, format, emoji, podpis, powitanie, zakończenie)
   - Zaproponuj regułę do brand_voice/email_guidelines jako zmiany w KB
   - DOPYTUJ: "Czy to jest Wasz standardowy styl? Czy chcesz żebym zawsze..."
   - Podsumuj wyciągnięte wnioski jako bulletpointy

2. INSTRUKCJE — gdy admin mówi co zmienić:
   - Znajdź odpowiednią sekcję KB
   - Zaproponuj konkretne zmiany
   - Wyjaśnij CO i DLACZEGO zmienisz

3. CIĄGŁOŚĆ — pamiętasz WSZYSTKIE poprzednie rozmowy.
   Odwołuj się do wcześniejszych ustaleń. Nigdy nie mów "nie mam kontekstu".
   Buduj spójny obraz stylu komunikacji kliniki.

4. PROAKTYWNOŚĆ — po każdej analizie:
   - Zadaj 1-2 pytania doprecyzowujące
   - Zaproponuj powiązane zmiany ("Skoro zmieniliśmy powitanie w mailach, czy chcesz żebym tak samo zmienił w chatbocie?")

5. FORMAT ODPOWIEDZI:
   - Odpowiadaj po polsku, naturalnie
   - Gdy proponujesz zmiany KB, MUSZĄ być w formacie JSON w polu changes
   - Bez zmian KB → zwykły tekst (explanation)

${learnedRules ? `\nWCZEŚNIEJ WYCIĄGNIĘTE REGUŁY STYLU:\n${learnedRules}\n` : ''}

AKTUALNA BAZA WIEDZY:
${kbSummary}

FORMAT ODPOWIEDZI — ZAWSZE JSON:
{
    "analysis": "Co przeanalizowałem / zrozumiałem",
    "explanation": "Pełna odpowiedź tekstowa dla admina (markdown OK)",
    "changes": [
        {
            "section": "brand_voice",
            "change_type": "append|replace|delete",
            "content_to_add": "nowa treść do dodania",
            "content_to_remove": "treść do usunięcia (tylko dla delete)",
            "description": "opis zmiany"
        }
    ],
    "follow_up_questions": ["Pytanie 1?", "Pytanie 2?"],
    "is_style_lesson": true
}

Jeśli nie proponujesz zmian KB, ustaw "changes": [] — ale ZAWSZE zawieraj "explanation".
Jeśli analizujesz styl, ustaw "is_style_lesson": true.`;

        // 7. Call GPT
        const result = await getAICompletion({
            context: 'ai_trainer',
            messages: conversationMessages,
            extraSystemContext: extraContext,
            responseFormat: 'json',
            temperature: 0.3,
            maxTokens: 4096,
        });

        // 8. Parse response
        let parsed: any;
        try {
            parsed = JSON.parse(result.reply || '{}');
        } catch {
            parsed = { explanation: result.reply, changes: [], is_style_lesson: false };
        }

        // Build the reply text
        const replyText = parsed.explanation || parsed.analysis || result.reply || 'Nie otrzymałem odpowiedzi.';
        const followUpText = parsed.follow_up_questions?.length
            ? '\n\n' + parsed.follow_up_questions.map((q: string) => `❓ ${q}`).join('\n')
            : '';

        const fullReply = replyText + followUpText;

        // 9. Enrich proposed changes
        const changes = parsed.changes || [];
        const enrichedChanges = [];

        for (const change of changes) {
            const currentSection = kbSections?.find(s => s.section === change.section);
            let newContent = '';

            if (change.change_type === 'append' && currentSection) {
                newContent = currentSection.content + '\n' + (change.content_to_add || change.proposed_change || '');
            } else if (change.change_type === 'replace') {
                newContent = change.proposed_change || change.content_to_add || '';
            } else if (change.change_type === 'delete' && currentSection) {
                const toRemove = change.content_to_remove || change.proposed_change || '';
                newContent = currentSection.content.replace(toRemove, '');
            } else {
                newContent = change.content_to_add || change.proposed_change || '';
            }

            enrichedChanges.push({
                section: change.section,
                section_title: currentSection?.title || change.section,
                change_type: change.change_type || 'append',
                old_content: currentSection?.content || null,
                new_content: newContent.trim(),
                description: change.description || parsed.explanation || '',
            });
        }

        // 10. Determine assistant message type
        const assistantMsgType = parsed.is_style_lesson
            ? 'style_analysis'
            : enrichedChanges.length > 0
                ? 'kb_proposal'
                : 'general';

        // 11. Save assistant response to DB
        await supabase.from('ai_trainer_messages').insert({
            role: 'assistant',
            content: fullReply,
            message_type: assistantMsgType,
            metadata: {
                proposed_changes: enrichedChanges.length > 0 ? enrichedChanges : undefined,
                analysis: parsed.analysis,
                follow_up_questions: parsed.follow_up_questions,
            },
            created_by: 'ai_trainer',
        });

        return NextResponse.json({
            reply: fullReply,
            analysis: parsed.analysis,
            proposed_changes: enrichedChanges,
            requires_approval: enrichedChanges.length > 0,
            is_style_lesson: parsed.is_style_lesson || false,
        });

    } catch (err: any) {
        console.error('[AI Trainer POST] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── PATCH — Approve/reject proposed KB changes ─────────────────

export async function PATCH(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { action, changes } = await req.json();

        if (!action || !['apply', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'action must be "apply" or "reject"' }, { status: 400 });
        }

        if (action === 'apply' && changes?.length > 0) {
            // Apply each change to KB
            for (const change of changes) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/ai-knowledge`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': req.headers.get('cookie') || '',
                    },
                    body: JSON.stringify({
                        section: change.section,
                        content: change.new_content,
                        change_reason: `AI Trainer: ${change.description}`,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Failed to apply change to ${change.section}: ${err.error}`);
                }
            }

            // Log approval
            const sectionNames = changes.map((c: any) => c.section_title || c.section).join(', ');
            await supabase.from('ai_trainer_messages').insert({
                role: 'assistant',
                content: `✅ Zmiany zatwierdzone i zapisane! Dotyczyły sekcji: ${sectionNames}. AI będzie korzystać z zaktualizowanej wiedzy w ciągu 5 minut.`,
                message_type: 'kb_applied',
                metadata: { applied_changes: changes },
                created_by: user.email,
            });

            return NextResponse.json({ success: true, message: `Applied ${changes.length} changes` });
        }

        if (action === 'reject') {
            // Log rejection
            await supabase.from('ai_trainer_messages').insert({
                role: 'assistant',
                content: '🔄 Zmiany odrzucone. Powiedz mi co chcesz zmienić inaczej — spróbuję zaproponować lepszą wersję.',
                message_type: 'kb_rejected',
                metadata: { rejected_changes: changes },
                created_by: user.email,
            });

            return NextResponse.json({ success: true, message: 'Changes rejected' });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[AI Trainer PATCH] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
