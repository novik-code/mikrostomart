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

// Admin GET — returns current theme config + brand config
export async function GET() {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load both theme and brand from site_settings
    const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['theme', 'brand']);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const theme = data?.find(r => r.key === 'theme')?.value || {};
    const brand = data?.find(r => r.key === 'brand')?.value || {};

    return NextResponse.json({ value: theme, brand });
}

// Admin PUT — save full theme config + optional brand config
export async function PUT(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Save theme (everything except 'brand' field)
        const { brand: brandData, ...theme } = body;
        const themeError = await saveSetting('theme', theme);
        if (themeError) {
            return NextResponse.json({ error: themeError.message }, { status: 500 });
        }

        // Save brand if provided
        if (brandData && typeof brandData === 'object' && Object.keys(brandData).length > 0) {
            const brandError = await saveSetting('brand', brandData);
            if (brandError) {
                return NextResponse.json({ error: brandError.message }, { status: 500 });
            }
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

    const themeError = await saveSetting('theme', {});
    if (themeError) {
        return NextResponse.json({ error: themeError.message }, { status: 500 });
    }

    // Also reset brand
    const brandError = await saveSetting('brand', {});
    if (brandError) {
        return NextResponse.json({ error: brandError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Theme and brand reset to defaults' });
}
