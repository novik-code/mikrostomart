import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAdmin() {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    return isAdmin ? user : null;
}

// Bulletproof save: try UPDATE first, INSERT only if 0 rows updated
async function saveSetting(key: string, value: any) {
    // First attempt: UPDATE existing row
    const { data: updated, error: updateError } = await supabase
        .from('site_settings')
        .update({
            value: value,
            updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .select('key');

    if (updateError) {
        // If update fails (e.g. updated_at column missing), try without it
        const { data: updated2, error: updateError2 } = await supabase
            .from('site_settings')
            .update({ value: value })
            .eq('key', key)
            .select('key');

        if (updateError2) return updateError2;
        if (updated2 && updated2.length > 0) return null;
    } else if (updated && updated.length > 0) {
        return null; // Successfully updated
    }

    // No rows updated — need to insert
    const { error: insertError } = await supabase
        .from('site_settings')
        .insert({
            key: key,
            value: value,
        });

    return insertError;
}

// Admin GET — returns current sections config
export async function GET() {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'sections')
        .maybeSingle();

    if (error) {
        return NextResponse.json({ value: [], updated_at: null });
    }

    return NextResponse.json(data || { value: [] });
}

// Admin PUT — save sections config
export async function PUT(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const sections = await request.json();
        const error = await saveSetting('sections', sections);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

// Admin POST — reset to defaults
export async function POST() {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const error = await saveSetting('sections', []);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Sections reset to defaults' });
}
