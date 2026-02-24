import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/push/resubscribe
 *
 * Called by the service worker's `pushsubscriptionchange` event handler when
 * the browser rotates a push endpoint (e.g. after long inactivity).
 *
 * The SW doesn't know the userId — it only has the new subscription object.
 * We look up the old endpoint from the old subscription and update it in place,
 * OR insert a new row if not found (handles edge cases).
 *
 * No auth required — called from SW context which has no cookies/session.
 * Rate-limiting risk is minimal: this route is only called when a push endpoint
 * is rotated by the user agent, which is rare.
 */
export async function POST(request: NextRequest) {
    try {
        const { subscription, oldEndpoint } = await request.json();

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }

        const newEndpoint = subscription.endpoint;

        // Try to find the old row by either specified oldEndpoint or new endpoint (idempotent)
        let existingRow: any = null;

        if (oldEndpoint) {
            const { data } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('endpoint', oldEndpoint)
                .single();
            existingRow = data;
        }

        if (!existingRow) {
            // Maybe the endpoint was already rotated — check if new endpoint exists
            const { data } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('endpoint', newEndpoint)
                .single();
            existingRow = data;
        }

        if (existingRow) {
            // Update existing row with new endpoint and keys
            const { error } = await supabase
                .from('push_subscriptions')
                .update({
                    endpoint: newEndpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingRow.id);

            if (error) {
                // If update fails due to unique constraint (new endpoint already exists),
                // delete old row — the new endpoint will be registered separately
                if ((error as any).code === '23505') {
                    await supabase.from('push_subscriptions').delete().eq('id', existingRow.id);
                    console.log(`[PushResubscribe] Deleted duplicate old row (new endpoint already exists)`);
                    return NextResponse.json({ success: true, action: 'deleted_old' });
                }
                throw error;
            }

            console.log(`[PushResubscribe] Updated endpoint for user ${existingRow.user_id}`);
            return NextResponse.json({ success: true, action: 'updated' });
        }

        // No existing row found — this subscription is unknown to us, nothing to do.
        // The client-side renewal in PushNotificationPrompt will handle registration
        // on next app open.
        console.log(`[PushResubscribe] No existing row found for endpoint rotation`);
        return NextResponse.json({ success: true, action: 'not_found' });

    } catch (error: unknown) {
        console.error('[PushResubscribe] Error:', error);
        return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
    }
}
