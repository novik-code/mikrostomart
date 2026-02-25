import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/suggestions/[id]/comments — list comments for a suggestion
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data, error } = await supabase()
        .from('feature_suggestion_comments')
        .select('*')
        .eq('suggestion_id', id)
        .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

/**
 * POST /api/employee/suggestions/[id]/comments — add a comment
 * Body: { author_email, author_name, content }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabase()
        .from('feature_suggestion_comments')
        .insert({
            suggestion_id: id,
            author_email: body.author_email,
            author_name: body.author_name || body.author_email,
            content: body.content,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
