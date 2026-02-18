import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { getPushTranslation, PushNotificationType } from './pushTranslations';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure VAPID
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:gabinet@mikrostomart.pl',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
}

/**
 * Send push notification to a specific user (all their subscriptions)
 */
export async function sendPushToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('user_type', userType);

    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                JSON.stringify(payload)
            );
            sent++;
        } catch (error: any) {
            console.error(`[WebPush] Failed to send to ${sub.endpoint}:`, error.statusCode);
            // Remove invalid subscriptions (gone/expired)
            if (error.statusCode === 404 || error.statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Send translated push notification to a user based on their subscription locale
 */
export async function sendTranslatedPushToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    notificationType: PushNotificationType,
    params: Record<string, string> = {},
    url?: string
): Promise<{ sent: number; failed: number }> {
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('user_type', userType);

    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    // Group by locale for efficiency
    const byLocale = new Map<string, typeof subs>();
    for (const sub of subs) {
        const locale = sub.locale || 'pl';
        if (!byLocale.has(locale)) byLocale.set(locale, []);
        byLocale.get(locale)!.push(sub);
    }

    for (const [locale, localeSubs] of byLocale) {
        const { title, body } = getPushTranslation(notificationType, locale, params);
        const payload: PushPayload = { title, body, url };

        for (const sub of localeSubs) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify(payload)
                );
                sent++;
            } catch (error: any) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                failed++;
            }
        }
    }

    return { sent, failed };
}

/**
 * Broadcast push to all subscriptions of a given type (e.g., all patients)
 */
export async function broadcastPush(
    userType: 'patient' | 'employee' | 'admin',
    notificationType: PushNotificationType,
    params: Record<string, string> = {},
    url?: string
): Promise<{ sent: number; failed: number }> {
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_type', userType);

    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    const byLocale = new Map<string, typeof subs>();
    for (const sub of subs) {
        const locale = sub.locale || 'pl';
        if (!byLocale.has(locale)) byLocale.set(locale, []);
        byLocale.get(locale)!.push(sub);
    }

    for (const [locale, localeSubs] of byLocale) {
        const { title, body } = getPushTranslation(notificationType, locale, params);
        const payload: PushPayload = { title, body, url };

        for (const sub of localeSubs) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify(payload)
                );
                sent++;
            } catch (error: any) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                failed++;
            }
        }
    }

    return { sent, failed };
}
