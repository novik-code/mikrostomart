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

// GET — list all templates
export async function GET() {
    const user = await checkAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('page_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

// POST — create template from current state
export async function POST(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, description } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        // Snapshot current site_settings
        const { data: settings } = await supabase
            .from('site_settings')
            .select('key, value')
            .in('key', ['theme', 'sections', 'page_overrides']);

        const config: Record<string, any> = {};
        settings?.forEach(s => { config[s.key] = s.value; });

        const { data, error } = await supabase
            .from('page_templates')
            .insert({
                name,
                description: description || '',
                config,
                created_by: user.email || user.id,
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

// PUT — update template
export async function PUT(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id, name, description } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const updates: any = { updated_at: new Date().toISOString() };
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;

        const { error } = await supabase
            .from('page_templates')
            .update(updates)
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

// DELETE — delete template
export async function DELETE(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const { error } = await supabase
        .from('page_templates')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
