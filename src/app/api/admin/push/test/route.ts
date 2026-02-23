import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { sendPushByConfig, sendPushToSpecificUsers, sendPushToGroups, type PushGroup } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/push/test
 *
 * Send a test push notification. Admin only.
 * One of the following modes:
 *   { configKey: string }   — test a specific notification config by sending to its groups
 *   { userId: string }      — test push to a specific user (all their subscriptions)
 */
export async function POST(request: NextRequest) {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { configKey, userId, label } = body;

        if (!configKey && !userId) {
            return NextResponse.json({ error: 'configKey or userId required' }, { status: 400 });
        }

        const testLabel = label || configKey || 'Test';
        const testPayload = {
            title: '🧪 Test powiadomienia',
            body: `To jest testowe powiadomienie: ${testLabel}`,
            url: '/pracownik',
            tag: `test-${Date.now()}`,
        };

        if (configKey) {
            // Test a specific notification type — uses its own config (groups, enabled)
            const result = await sendPushByConfig(configKey, testPayload);
            console.log(`[Admin/PushTest] configKey="${configKey}" result:`, result);
            return NextResponse.json({ mode: 'config', configKey, ...result });
        }

        if (userId) {
            // Test push to a specific user
            const result = await sendPushToSpecificUsers([userId], testPayload);
            console.log(`[Admin/PushTest] userId="${userId}" result:`, result);
            return NextResponse.json({ mode: 'user', userId, ...result });
        }

        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    } catch (error: any) {
        console.error('[Admin/PushTest] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
