import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/push/config
 * Returns all push notification configs (one per cron notification type)
 */
export async function GET() {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('push_notification_config')
        .select('*')
        .order('key');

    if (error) {
        console.error('[Push/Config] GET error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ configs: data || [] });
}

/**
 * PATCH /api/admin/push/config
 * Update groups and/or enabled for a push config key
 * Body: { key: string, groups?: string[], enabled?: boolean }
 */
export async function PATCH(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { key, groups, enabled } = await request.json();

        if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

        const update: Record<string, any> = { updated_at: new Date().toISOString() };
        if (groups !== undefined) update.groups = groups;
        if (enabled !== undefined) update.enabled = enabled;

        const { data, error } = await supabase
            .from('push_notification_config')
            .update(update)
            .eq('key', key)
            .select()
            .single();

        if (error) throw error;

        console.log(`[Push/Config] Updated ${key}:`, update);
        return NextResponse.json({ success: true, config: data });
    } catch (error: any) {
        console.error('[Push/Config] PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
