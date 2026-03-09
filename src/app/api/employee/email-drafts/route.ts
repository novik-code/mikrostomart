/**
 * Employee Email Drafts API — admin-only CRUD for AI-generated email drafts
 * 
 * GET:    List drafts (?status=pending|approved|sent|rejected|all)
 * PUT:    Update draft (edit content, change status)
 * POST:   Send a draft (?action=send&id=UUID)
 * DELETE: Remove a draft (?id=UUID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendEmail } from '@/lib/imapService';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(): Promise<{ userId: string; email: string } | null> {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return null;
    return { userId: user.id, email: user.email || '' };
}

// ─── GET: List drafts ────────────────────────────────────────

export async function GET(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    try {
        let query = supabase
            .from('email_ai_drafts')
            .select('*')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        } else {
            // 'all' means all user-visible drafts, not internal 'skipped' records
            query = query.neq('status', 'skipped');
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;

        return NextResponse.json({ drafts: data || [] });
    } catch (err: any) {
        console.error('[Email Drafts API] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── PUT: Update draft ───────────────────────────────────────

export async function PUT(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, draft_subject, draft_html, status, admin_notes, admin_rating, admin_tags, action } = body;

        // ─── Action: Reset email for reprocessing (by UID) ───
        if (action === 'reset_by_uid') {
            const { email_uid } = body;
            if (!email_uid) {
                return NextResponse.json({ error: 'Missing email_uid' }, { status: 400 });
            }
            const { error: delErr, count } = await supabase
                .from('email_ai_drafts')
                .delete()
                .eq('email_uid', email_uid);

            if (delErr) throw delErr;
            return NextResponse.json({ success: true, deleted: count || 0 });
        }

        if (!id) {
            return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
        }

        // ─── Action: Return for learning ───────────────────
        if (action === 'return_for_learning') {
            // Fetch original draft
            const { data: draft, error: fetchErr } = await supabase
                .from('email_ai_drafts')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchErr || !draft) {
                return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
            }

            const correctedHtml = draft_html || draft.draft_html;
            const feedbackNote = admin_notes || '';

            // Ask GPT to analyze the corrections
            let aiAnalysis = '';
            try {
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        temperature: 0.2,
                        max_tokens: 500,
                        messages: [
                            {
                                role: 'system',
                                content: `Jesteś analitykiem jakości AI. Porównaj ORYGINALNY draft (napisany przez AI) z POPRAWIONYM draftem (wyedytowanym przez pracownika kliniki). Wyciągnij WNIOSKI co było źle i jak poprawić odpowiedzi w przyszłości.

Odpowiedz w 2-4 zdaniach PO POLSKU. Skup się na: zmianach w tonie, brakujących informacjach, nieprawidłowych danych, zbyt formany/nieformalny styl, etc.`,
                            },
                            {
                                role: 'user',
                                content: `ORYGINALNY (AI):
${draft.draft_html}

POPRAWIONY (pracownik):
${correctedHtml}

${feedbackNote ? `UWAGA OD PRACOWNIKA: ${feedbackNote}` : ''}`,
                            },
                        ],
                    }),
                });

                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    aiAnalysis = aiData.choices?.[0]?.message?.content || '';
                }
            } catch (err) {
                console.error('[Email Drafts] AI analysis error:', err);
                aiAnalysis = 'Nie udało się wygenerować analizy.';
            }

            // Save feedback
            await supabase.from('email_ai_feedback').insert({
                draft_id: id,
                original_draft_html: draft.draft_html,
                corrected_draft_html: correctedHtml,
                feedback_note: feedbackNote,
                ai_analysis: aiAnalysis,
                created_by: admin.email,
            });

            // Update draft status
            await supabase
                .from('email_ai_drafts')
                .update({
                    status: 'learned',
                    draft_html: correctedHtml,
                    admin_notes: feedbackNote,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: admin.email,
                })
                .eq('id', id);

            return NextResponse.json({
                success: true,
                ai_analysis: aiAnalysis,
            });
        }

        // ─── Action: Learn from compose-generated AI reply ─
        if (action === 'learn_from_compose') {
            const { original_html, corrected_html, feedback_note, rating, tags } = body;

            if (!original_html || !corrected_html) {
                return NextResponse.json({ error: 'Missing original_html or corrected_html' }, { status: 400 });
            }

            // Ask GPT to analyze the corrections
            let aiAnalysis = '';
            try {
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        temperature: 0.2,
                        max_tokens: 500,
                        messages: [
                            {
                                role: 'system',
                                content: `Jesteś analitykiem jakości AI. Porównaj ORYGINALNY draft (napisany przez AI) z POPRAWIONYM draftem (wyedytowanym przez pracownika kliniki). Wyciągnij WNIOSKI co było źle i jak poprawić odpowiedzi w przyszłości.\n\nOdpowiedz w 2-4 zdaniach PO POLSKU. Skup się na: zmianach w tonie, brakujących informacjach, nieprawidłowych danych, zbyt formany/nieformalny styl, etc.`,
                            },
                            {
                                role: 'user',
                                content: `ORYGINALNY (AI):\n${original_html}\n\nPOPRAWIONY (pracownik):\n${corrected_html}\n\n${feedback_note ? `UWAGA OD PRACOWNIKA: ${feedback_note}` : ''}${tags?.length ? `\nTAGI: ${tags.join(', ')}` : ''}`,
                            },
                        ],
                    }),
                });

                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    aiAnalysis = aiData.choices?.[0]?.message?.content || '';
                }
            } catch (err) {
                console.error('[Email Drafts] AI analysis error (compose):', err);
                aiAnalysis = 'Nie udało się wygenerować analizy.';
            }

            // Save feedback (no draft_id — compose-generated)
            try {
                await supabase.from('email_ai_feedback').insert({
                    draft_id: null,
                    original_draft_html: original_html,
                    corrected_draft_html: corrected_html,
                    feedback_note: feedback_note || (tags?.length ? `Tagi: ${tags.join(', ')}` : '') + (rating ? ` | Ocena: ${rating}/5` : ''),
                    ai_analysis: aiAnalysis,
                    created_by: admin.email,
                });
            } catch (fbErr) {
                console.error('[Email Drafts] Feedback insert error:', fbErr);
                // Don't fail the whole request — feedback table might not exist
            }

            return NextResponse.json({
                success: true,
                ai_analysis: aiAnalysis,
            });
        }

        // ─── Standard update ──────────────────────────────
        const updates: Record<string, any> = {};
        if (draft_subject !== undefined) updates.draft_subject = draft_subject;
        if (draft_html !== undefined) updates.draft_html = draft_html;
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;
        if (admin_rating !== undefined) updates.admin_rating = admin_rating;
        if (admin_tags !== undefined) updates.admin_tags = admin_tags;
        if (status !== undefined) {
            updates.status = status;
            if (status === 'approved' || status === 'rejected') {
                updates.reviewed_at = new Date().toISOString();
                updates.reviewed_by = admin.email;
            }
        }

        const { data, error } = await supabase
            .from('email_ai_drafts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ draft: data });
    } catch (err: any) {
        console.error('[Email Drafts API] PUT error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── POST: Send a draft via SMTP ─────────────────────────────

export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
        }

        // Fetch draft
        const { data: draft, error: fetchErr } = await supabase
            .from('email_ai_drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !draft) {
            return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
        }

        if (draft.status === 'sent') {
            return NextResponse.json({ error: 'Draft already sent' }, { status: 400 });
        }

        // Send via SMTP
        const result = await sendEmail({
            to: draft.email_from_address,
            subject: draft.draft_subject,
            html: draft.draft_html,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'SMTP send failed' }, { status: 500 });
        }

        // Update status to 'sent'
        await supabase
            .from('email_ai_drafts')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                reviewed_at: new Date().toISOString(),
                reviewed_by: admin.email,
            })
            .eq('id', id);

        return NextResponse.json({ success: true, messageId: result.messageId });
    } catch (err: any) {
        console.error('[Email Drafts API] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── DELETE: Remove a draft ──────────────────────────────────

export async function DELETE(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('email_ai_drafts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Email Drafts API] DELETE error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
