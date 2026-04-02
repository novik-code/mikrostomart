import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/push/subscribe
 * Register an FCM token for push notifications.
 * Body: { fcmToken, userType, userId, deviceLabel? }
 */
export async function POST(request: NextRequest) {
    try {
        const { fcmToken, userType, userId, deviceLabel } = await request.json();

        if (!fcmToken || !userType || !userId) {
            return NextResponse.json(
                { error: 'fcmToken, userType, and userId are required' },
                { status: 400 }
            );
        }

        // Upsert — if token already exists, update user info
        const { error } = await supabase
            .from('fcm_tokens')
            .upsert(
                {
                    user_id: userId,
                    user_type: userType,
                    fcm_token: fcmToken,
                    device_label: deviceLabel || null,
                    last_active_at: new Date().toISOString(),
                },
                { onConflict: 'fcm_token' }
            );

        if (error) throw error;

        console.log(`[Push] FCM token registered: ${userType}/${userId} device=${deviceLabel || 'unknown'}`);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[Push] Subscribe error:', error);
        return NextResponse.json({ error: 'Failed to subscribe', details: String(error) }, { status: 500 });
    }
}

/**
 * DELETE /api/push/subscribe
 * Remove an FCM token.
 * Body: { fcmToken } or { endpoint } (legacy compatibility)
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const token = body.fcmToken || body.endpoint; // support legacy endpoint field

        if (!token) {
            return NextResponse.json({ error: 'fcmToken required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('fcm_tokens')
            .delete()
            .eq('fcm_token', token);

        if (error) throw error;

        console.log(`[Push] FCM token removed: ${token.substring(0, 30)}...`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
}
