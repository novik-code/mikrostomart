/**
 * POST /api/admin/ai-trainer
 *
 * AI Trainer — meta-AI that helps admins modify the knowledge base
 * through natural language instructions.
 *
 * Flow:
 * 1. Admin sends instruction in NL (e.g. "naucz AI żeby nie zachęcał do wizyt w komentarzach")
 * 2. AI Trainer analyzes which KB section to modify
 * 3. Returns proposed changes with diff for admin approval
 * 4. If admin approves → PUT /api/admin/ai-knowledge to apply
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

export async function POST(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { message, conversation } = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }

        // Load current KB sections for context
        const { data: kbSections } = await supabase
            .from('ai_knowledge_base')
            .select('section, title, content, context_tags')
            .eq('is_active', true)
            .order('priority', { ascending: true });

        const kbSummary = (kbSections || []).map(s =>
            `### Sekcja: "${s.section}" (${s.title})\nKonteksty: ${s.context_tags.join(', ')}\nTreść (${s.content.length} znaków):\n${s.content.substring(0, 500)}${s.content.length > 500 ? '...' : ''}`
        ).join('\n\n---\n\n');

        // Build conversation history
        const messages = [
            ...(conversation || []).map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user' as const, content: message },
        ];

        const extraContext = `
AKTUALNA BAZA WIEDZY (wszystkie sekcje):
${kbSummary}

ZASADY MODYFIKACJI:
- Analizuj prośbę admina i zidentyfikuj właściwą sekcję do zmiany
- Jeśli sekcja nie istnieje, zaproponuj dodanie nowej
- Odpowiadaj po polsku
- Pokaż CO dokładnie zmienisz i DLACZEGO
- Format odpowiedzi MUSI być JSON z kluczami: analysis, changes (array), explanation

Przykład formatu:
{
    "analysis": "Admin chce żeby AI nie zachęcał do wizyt w każdym komentarzu",
    "changes": [{
        "section": "social_guidelines",
        "change_type": "append",
        "content_to_add": "\\n- NIE zachęcaj do wizyty/konsultacji w KAŻDEJ odpowiedzi. Odpowiadaj merytorycznie na temat komentarza."
    }],
    "explanation": "Dodałem regułę do sekcji zasad social media, która nakazuje merytoryczne odpowiedzi zamiast CTA."
}`;

        const result = await getAICompletion({
            context: 'ai_trainer',
            messages,
            extraSystemContext: extraContext,
            responseFormat: 'json',
            temperature: 0.3,
            maxTokens: 4096,
        });

        // Parse AI response
        let parsed: any;
        try {
            parsed = JSON.parse(result.reply || '{}');
        } catch {
            // If not valid JSON, return as plain text response
            return NextResponse.json({
                reply: result.reply,
                proposed_changes: null,
                requires_approval: false,
            });
        }

        // Enrich proposed changes with current section content for diffing
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
                // Remove specific text from section
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

        return NextResponse.json({
            reply: parsed.explanation || parsed.analysis || result.reply,
            analysis: parsed.analysis,
            proposed_changes: enrichedChanges,
            requires_approval: enrichedChanges.length > 0,
        });

    } catch (err: any) {
        console.error('[AI Trainer] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
