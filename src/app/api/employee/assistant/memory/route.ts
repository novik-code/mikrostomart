import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/assistant/memory
 * Returns the current user's assistant memory (facts JSON)
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const { data, error } = await supabase
        .from('assistant_memory')
        .select('facts, updated_at')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[AssistantMemory] GET error:', error);
        return NextResponse.json({ error: 'Błąd bazy danych' }, { status: 500 });
    }

    return NextResponse.json({
        facts: data?.facts ?? {},
        updated_at: data?.updated_at ?? null,
    });
}

/**
 * POST /api/employee/assistant/memory
 * Merges new facts into the user's memory (deep merge at top level)
 * Body: { facts: Record<string, string | null> }
 * Passing null for a key removes it from memory.
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const { facts: newFacts } = await req.json();
    if (!newFacts || typeof newFacts !== 'object') {
        return NextResponse.json({ error: 'facts must be an object' }, { status: 400 });
    }

    // Fetch current facts
    const { data: existing } = await supabase
        .from('assistant_memory')
        .select('facts')
        .eq('user_id', user.id)
        .single();

    const currentFacts: Record<string, any> = existing?.facts ?? {};

    // Merge: null values = delete key, others = overwrite
    const merged = { ...currentFacts };
    for (const [k, v] of Object.entries(newFacts)) {
        if (v === null) {
            delete merged[k];
        } else {
            merged[k] = v;
        }
    }

    // Upsert
    const { error } = await supabase
        .from('assistant_memory')
        .upsert(
            { user_id: user.id, facts: merged, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('[AssistantMemory] POST error:', error);
        return NextResponse.json({ error: 'Błąd zapisu' }, { status: 500 });
    }

    return NextResponse.json({ success: true, facts: merged });
}
