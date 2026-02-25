import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/suggestions — list all suggestions (newest first)
 */
export async function GET() {
    const { data, error } = await supabase()
        .from('feature_suggestions')
        .select('*, feature_suggestion_comments(count)')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

/**
 * POST /api/employee/suggestions — create a new suggestion
 * Body: { author_email, author_name, content, category? }
 */
export async function POST(req: Request) {
    const body = await req.json();
    const { author_email, author_name, content, category } = body;

    if (!author_email || !content) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await supabase()
        .from('feature_suggestions')
        .insert({
            author_email,
            author_name: author_name || author_email,
            content,
            category: category || 'funkcja',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}

/**
 * PUT /api/employee/suggestions — upvote or update status
 * Body: { id, action: 'upvote' | 'status', email?, status? }
 */
export async function PUT(req: Request) {
    const body = await req.json();
    const { id, action, email, status } = body;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (action === 'upvote' && email) {
        // Toggle upvote
        const { data: existing } = await supabase()
            .from('feature_suggestions')
            .select('upvotes')
            .eq('id', id)
            .single();

        const upvotes: string[] = existing?.upvotes || [];
        const newUpvotes = upvotes.includes(email)
            ? upvotes.filter((e: string) => e !== email)
            : [...upvotes, email];

        const { error } = await supabase()
            .from('feature_suggestions')
            .update({ upvotes: newUpvotes, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ upvotes: newUpvotes });
    }

    if (action === 'status' && status) {
        const { error } = await supabase()
            .from('feature_suggestions')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
