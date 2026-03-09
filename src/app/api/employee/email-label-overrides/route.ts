/**
 * Employee Email Label Overrides API — admin-only CRUD for manual label reassignment
 * 
 * GET:    Fetch all label overrides
 * PUT:    Set label override for an email (upsert by uid+folder)
 * DELETE: Remove label override (revert to auto-classification)
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

// ─── GET: Fetch all label overrides ──────────────────────────

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from('email_label_overrides')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ overrides: data || [] });
    } catch (err: any) {
        console.error('[LabelOverrides] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── PUT: Set label override (upsert) ───────────────────────

export async function PUT(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { email_uid, email_folder, label } = body;

        if (!email_uid || !label) {
            return NextResponse.json(
                { error: 'Missing required fields: email_uid, label' },
                { status: 400 }
            );
        }

        const folder = email_folder || 'INBOX';

        const { data, error } = await supabase
            .from('email_label_overrides')
            .upsert(
                {
                    email_uid,
                    email_folder: folder,
                    label,
                    created_by: admin.userId,
                },
                { onConflict: 'email_uid,email_folder' }
            )
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ override: data });
    } catch (err: any) {
        console.error('[LabelOverrides] PUT error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── DELETE: Remove label override ───────────────────────────

export async function DELETE(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get('uid');
        const folder = searchParams.get('folder') || 'INBOX';

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
        }

        const { error } = await supabase
            .from('email_label_overrides')
            .delete()
            .eq('email_uid', parseInt(uid))
            .eq('email_folder', folder);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[LabelOverrides] DELETE error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
