import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

const supabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * S10-3 (audyt P1 #2): comments też wymagają employee/admin auth.
 */

/**
 * GET /api/employee/suggestions/[id]/comments — list comments for a suggestion
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

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
 * Body: { content }
 * Author email/name pochodzą z sesji (auth.user.email).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
        return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const authorEmail = auth.user.email || 'unknown';
    const authorName = (auth.user.user_metadata?.name as string | undefined) || authorEmail;

    const { data, error } = await supabase()
        .from('feature_suggestion_comments')
        .insert({
            suggestion_id: id,
            author_email: authorEmail,
            author_name: authorName,
            content: body.content.trim().slice(0, 5000),
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
