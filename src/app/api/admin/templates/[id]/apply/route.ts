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

// POST — apply a template: write its config keys back into site_settings
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await checkAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Load template
    const { data: template, error: loadError } = await supabase
        .from('page_templates')
        .select('config')
        .eq('id', id)
        .single();

    if (loadError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Apply each config key to site_settings
    const config = template.config as Record<string, any>;
    const errors: string[] = [];

    for (const [key, value] of Object.entries(config)) {
        // Try update first
        const { data: updated, error: updateError } = await supabase
            .from('site_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select('key');

        if (updateError || !updated?.length) {
            // Try insert if update failed
            const { error: insertError } = await supabase
                .from('site_settings')
                .upsert({ key, value });

            if (insertError) errors.push(`${key}: ${insertError.message}`);
        }
    }

    if (errors.length > 0) {
        return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Template applied' });
}
