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
    const { data: updated, error: updateError } = await supabase
        .from('site_settings')
        .update({
            value: value,
            updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .select('key');

    if (updateError) {
        const { data: updated2, error: updateError2 } = await supabase
            .from('site_settings')
            .update({ value: value })
            .eq('key', key)
            .select('key');

        if (updateError2) return updateError2;
        if (updated2 && updated2.length > 0) return null;
    } else if (updated && updated.length > 0) {
        return null;
    }

    const { error: insertError } = await supabase
        .from('site_settings')
        .insert({ key: key, value: value });

    return insertError;
}

// GET — returns current page overrides
export async function GET() {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'page_overrides')
        .maybeSingle();

    if (error) {
        return NextResponse.json({ value: {} });
    }

    return NextResponse.json(data || { value: {} });
}

// PUT — save page overrides
export async function PUT(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const overrides = await request.json();
        const error = await saveSetting('page_overrides', overrides);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
