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

// Admin GET — returns current sections config
export async function GET() {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('site_settings')
        .select('value, updated_at')
        .eq('key', 'sections')
        .single();

    if (error) {
        // Key doesn't exist yet — return empty
        return NextResponse.json({ value: [], updated_at: null });
    }

    return NextResponse.json(data);
}

// Admin PUT — save sections config
export async function PUT(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const sections = await request.json();

        const { error } = await supabase
            .from('site_settings')
            .upsert({
                key: 'sections',
                value: sections,
                updated_at: new Date().toISOString(),
            });

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

    const { error } = await supabase
        .from('site_settings')
        .upsert({
            key: 'sections',
            value: [],
            updated_at: new Date().toISOString(),
        });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Sections reset to defaults' });
}
