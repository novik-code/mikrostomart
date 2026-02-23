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

/**
 * Send push notification to ALL subscribed employees (broadcast).
 * Optionally exclude a specific user (e.g., the one who triggered the action).
 */
export async function sendPushToAllEmployees(
    payload: PushPayload,
    excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
    let query = supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_type', 'employee');

    if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
    }

    const { data: subs } = await query;

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
            if (error.statusCode === 404 || error.statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            failed++;
        }
    }

    return { sent, failed };
}

// ----------------------------------------------------------------
// Group-targeted push notifications
// ----------------------------------------------------------------

export type PushGroup = 'patients' | 'doctors' | 'hygienists' | 'reception' | 'assistant' | 'admin';

/**
 * Send push notification to one or more user groups.
 * groups: array of PushGroup identifiers — can mix any combination.
 */
export async function sendPushToGroups(
    groups: PushGroup[],
    payload: PushPayload
): Promise<{ sent: number; failed: number; byGroup: Record<string, { sent: number; failed: number }> }> {
    let totalSent = 0;
    let totalFailed = 0;
    const byGroup: Record<string, { sent: number; failed: number }> = {};

    const sendBatch = async (subs: any[], groupName: string) => {
        let s = 0; let f = 0;
        for (const sub of subs) {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify(payload)
                );
                s++;
            } catch (error: any) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                f++;
            }
        }
        byGroup[groupName] = { sent: s, failed: f };
        totalSent += s;
        totalFailed += f;
    };

    for (const group of groups) {
        if (group === 'patients') {
            const { data: subs } = await supabase
                .from('push_subscriptions').select('*').eq('user_type', 'patient');
            await sendBatch(subs || [], 'patients');

        } else if (group === 'admin') {
            const { data: subs } = await supabase
                .from('push_subscriptions').select('*').eq('user_type', 'admin');
            await sendBatch(subs || [], 'admin');

        } else {
            // Employee sub-groups: doctors, hygienists, reception, assistant
            const groupMap: Record<string, string> = {
                doctors: 'doctor',
                hygienists: 'hygienist',
                reception: 'reception',
                assistant: 'assistant',
            };
            const dbGroup = groupMap[group];
            if (!dbGroup) continue;

            // Use array containment to support multi-group employees.
            // Falls back to employee_group (single TEXT) for backwards compat.
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_type', 'employee')
                .or(`employee_groups.cs.{"${dbGroup}"},employee_group.eq.${dbGroup}`);
            await sendBatch(subs || [], group);
        }
    }

    return { sent: totalSent, failed: totalFailed, byGroup };
}

/**
 * Config-driven push: reads push_notification_config for the given key,
 * respects enabled flag, and sends to the configured groups.
 *
 * This is the CORRECT way to send task/event notifications — it honours
 * the admin-panel configuration instead of bypassing it.
 *
 * @param configKey   — e.g. 'task-new', 'task-status', 'task-comment'
 * @param payload     — notification content
 * @param excludeUserId — optional user to exclude (e.g. person who triggered the event)
 */
export async function sendPushByConfig(
    configKey: string,
    payload: PushPayload,
    excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
    // 1. Fetch config
    const { data: config } = await supabase
        .from('push_notification_config')
        .select('enabled, groups, recipient_types')
        .eq('key', configKey)
        .single();

    // 2. Skip if config not found or disabled
    if (!config || !config.enabled) {
        console.log(`[WebPush] sendPushByConfig: key="${configKey}" not found or disabled — skipped`);
        return { sent: 0, failed: 0 };
    }

    const groups: PushGroup[] = (config.groups || []) as PushGroup[];
    if (groups.length === 0) {
        console.log(`[WebPush] sendPushByConfig: key="${configKey}" has no groups configured — skipped`);
        return { sent: 0, failed: 0 };
    }

    // 3. Send to configured groups (with optional user exclusion)
    let totalSent = 0;
    let totalFailed = 0;

    const sendBatch = async (subs: any[]) => {
        for (const sub of subs) {
            if (excludeUserId && sub.user_id === excludeUserId) continue;
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify(payload)
                );
                totalSent++;
            } catch (error: any) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                totalFailed++;
            }
        }
    };

    // Normalise group value: config stores singular DB values ('doctor','hygienist')
    // PushGroup aliases may be plural ('doctors','hygienists') — handle both
    const normaliseGroupToDbValue = (g: string): string | null => {
        const map: Record<string, string> = {
            // plural aliases
            doctors: 'doctor',
            hygienists: 'hygienist',
            // singular DB values (stored directly in push_notification_config)
            doctor: 'doctor',
            hygienist: 'hygienist',
            reception: 'reception',
            assistant: 'assistant',
        };
        return map[g] ?? null;
    };

    for (const group of groups) {
        if ((group as string) === 'patients' || (group as string) === 'patient') {

            const { data: subs } = await supabase
                .from('push_subscriptions').select('*').eq('user_type', 'patient');
            await sendBatch(subs || []);
        } else if (group === 'admin') {
            const { data: subs } = await supabase
                .from('push_subscriptions').select('*').eq('user_type', 'admin');
            await sendBatch(subs || []);
        } else {
            const dbGroup = normaliseGroupToDbValue(group);
            if (!dbGroup) {
                console.warn(`[WebPush] sendPushByConfig: unknown group "${group}" — skipped`);
                continue;
            }
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_type', 'employee')
                .or(`employee_groups.cs.{"${dbGroup}"},employee_group.eq.${dbGroup}`);
            await sendBatch(subs || []);
        }
    }

    console.log(`[WebPush] sendPushByConfig: key="${configKey}" groups=[${groups.join(',')}] → sent=${totalSent} failed=${totalFailed}`);
    return { sent: totalSent, failed: totalFailed };
}


/**
 * Send push notification to specific users by user_id array.
 * Used for individual employee targeting in manual push send.
 */
export async function sendPushToSpecificUsers(
    userIds: string[],
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    if (!userIds || userIds.length === 0) return { sent: 0, failed: 0 };

    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds);

    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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

    return { sent, failed };
}

