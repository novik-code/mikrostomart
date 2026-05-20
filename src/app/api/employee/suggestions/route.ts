import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

const supabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * S10-3 (audyt P1 #2): wszystkie handlery wymagają employee/admin sesji.
 * Wcześniej GET/POST/PUT były otwarte z service-role clientem → spam +
 * manipulacja backlogu wewnętrznego przez nieautoryzowanych userów.
 */

/**
 * GET /api/employee/suggestions — list all suggestions (newest first)
 */
export async function GET() {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { data, error } = await supabase()
        .from('feature_suggestions')
        .select('*, feature_suggestion_comments(count)')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

/**
 * POST /api/employee/suggestions — create a new suggestion
 * Body: { content, category? }
 * Author email/name pochodzą z sesji (auth.user.email) — body's author fields ignorowane.
 */
export async function POST(req: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { content, category } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const authorEmail = auth.user.email || 'unknown';
    const authorName = (auth.user.user_metadata?.name as string | undefined) || authorEmail;

    const { data, error } = await supabase()
        .from('feature_suggestions')
        .insert({
            author_email: authorEmail,
            author_name: authorName,
            content: content.trim().slice(0, 5000),
            category: category || 'funkcja',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}

/**
 * PUT /api/employee/suggestions — upvote or update status
 * Body: { id, action: 'upvote' | 'status', status? }
 *
 * - 'upvote': toggle dla aktualnie zalogowanego (email pochodzi z sesji)
 * - 'status': tylko admin może zmieniać status
 */
export async function PUT(req: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, action, status } = body;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (action === 'upvote') {
        const email = auth.user.email;
        if (!email) {
            return NextResponse.json({ error: 'Email required on user' }, { status: 400 });
        }

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
        // Status change is admin-only — zwykli employees mogą upvote'ować ale nie
        // zmieniać status (np. "wdrożona", "odrzucona") — to admin/PM decyzja.
        if (!auth.roles.includes('admin')) {
            return NextResponse.json({ error: 'Forbidden: status change is admin-only' }, { status: 403 });
        }

        const { error } = await supabase()
            .from('feature_suggestions')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
