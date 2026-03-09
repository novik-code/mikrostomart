/**
 * Employee Email Compose Drafts API — admin-only CRUD for saved compose drafts
 * 
 * GET:    List all compose drafts for the current user
 * POST:   Save/update a compose draft (upsert by id)
 * DELETE: Delete a compose draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(): Promise<{ userId: string } | null> {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return null;
    return { userId: user.id };
}

// ─── GET: List compose drafts ────────────────────────────────

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from('email_compose_drafts')
            .select('*')
            .eq('user_id', admin.userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ drafts: data || [] });
    } catch (err: any) {
        console.error('[ComposeDrafts] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── POST: Save/update a compose draft ───────────────────────

export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, to_address, cc_address, subject, body: draftBody, in_reply_to, references } = body;

        if (id) {
            // Update existing draft
            const { data, error } = await supabase
                .from('email_compose_drafts')
                .update({
                    to_address: to_address || '',
                    cc_address: cc_address || '',
                    subject: subject || '',
                    body: draftBody || '',
                    in_reply_to: in_reply_to || '',
                    references: references || [],
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .eq('user_id', admin.userId)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ draft: data });
        } else {
            // Create new draft
            const { data, error } = await supabase
                .from('email_compose_drafts')
                .insert({
                    user_id: admin.userId,
                    to_address: to_address || '',
                    cc_address: cc_address || '',
                    subject: subject || '',
                    body: draftBody || '',
                    in_reply_to: in_reply_to || '',
                    references: references || [],
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ draft: data });
        }
    } catch (err: any) {
        console.error('[ComposeDrafts] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── DELETE: Remove a compose draft ──────────────────────────

export async function DELETE(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const { error } = await supabase
            .from('email_compose_drafts')
            .delete()
            .eq('id', id)
            .eq('user_id', admin.userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[ComposeDrafts] DELETE error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
