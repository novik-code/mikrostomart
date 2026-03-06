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
        const { id, draft_subject, draft_html, status, admin_notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
        }

        const updates: Record<string, any> = {};
        if (draft_subject !== undefined) updates.draft_subject = draft_subject;
        if (draft_html !== undefined) updates.draft_html = draft_html;
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;
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
