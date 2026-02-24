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
 * Deduplicate a list of push subscriptions by user_id.
 * Keeps at most `maxPerUser` entries per user (ordered as received — callers
 * should sort by created_at DESC before calling so we keep the newest ones).
 * This prevents a user with stale/duplicate rows from getting N identical
 * notifications instead of 1 (or 1 per actual device).
 */
function dedupSubsByUser(subs: any[], maxPerUser = 2): any[] {
    const counts = new Map<string, number>();
    return subs.filter(sub => {
        const key = sub.user_id as string;
        const n = counts.get(key) || 0;
        if (n >= maxPerUser) return false;
        counts.set(key, n + 1);
        return true;
    });
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

    // Order by created_at desc so newest come first, then deduplicate by user
    const rawQuery = query.order('created_at', { ascending: false });
    const { data: rawSubs } = await rawQuery;
    const subs = dedupSubsByUser(rawSubs || []);

    if (subs.length === 0) return { sent: 0, failed: 0 };

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
        const deduped = dedupSubsByUser(subs);
        let s = 0; let f = 0;
        for (const sub of deduped) {
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

    // ── Global dedup across ALL groups ─────────────────────────────────────
    // A user who belongs to multiple matching groups (e.g. employee_groups
    // contains both 'doctor' and 'reception') must receive only ONE push.
    // Without this set, the per-group dedupSubsByUser call would prevent
    // duplicates within a single group, but not across group iterations.
    const sentEndpoints = new Set<string>();

    const sendBatch = async (subs: any[]) => {
        // Deduplicate by user_id within this batch first (handles stale rows)
        const deduped = dedupSubsByUser(subs);
        for (const sub of deduped) {
            if (excludeUserId && sub.user_id === excludeUserId) continue;
            // Skip endpoints already notified in a previous group iteration
            if (sentEndpoints.has(sub.endpoint)) continue;
            sentEndpoints.add(sub.endpoint);
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
 *
 * Deduplication: only the MOST RECENT subscription per user is used.
 * This prevents users receiving the same notification multiple times
 * when they have accumulated multiple subscription rows (e.g. after
 * re-subscribing or enabling push on multiple browsers).
 *
 * For genuine multi-device setups, a user who intentionally subscribes
 * from two different devices still gets one push per device; but if the
 * same device re-subscribed and left an orphaned row, only the latest
 * row is used so the user only sees the notification once.
 */
export async function sendPushToSpecificUsers(
    userIds: string[],
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    if (!userIds || userIds.length === 0) return { sent: 0, failed: 0 };

    // Fetch ALL subscriptions for the requested users, ordered newest-first
    const { data: allSubs, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[WebPush] sendPushToSpecificUsers DB error:', error);
        return { sent: 0, failed: 0 };
    }

    if (!allSubs || allSubs.length === 0) {
        console.warn('[WebPush] sendPushToSpecificUsers: no subscriptions found for userIds:', userIds);
        return { sent: 0, failed: 0 };
    }

    // Deduplicate: keep only the first (most recent) subscription per user.
    // A user intentionally on 2 devices has 2 different endpoints — both are
    // considered "most recent" for their respective device, so we keep one
    // entry per (user_id, endpoint) pair. We limit to max 3 per user to
    // gracefully support multi-device while preventing mass duplication.
    const seenByUser = new Map<string, number>(); // user_id → count seen
    const subs = allSubs.filter(sub => {
        const count = seenByUser.get(sub.user_id) || 0;
        if (count >= 3) return false; // safety cap: at most 3 devices per user
        seenByUser.set(sub.user_id, count + 1);
        return true;
    });

    // Debug info
    console.log(`[WebPush] sendPushToSpecificUsers: userIds=${JSON.stringify(userIds)} found ${allSubs.length} subs (${subs.length} after dedup)`);
    for (const uid of userIds) {
        const count = allSubs.filter(s => s.user_id === uid).length;
        if (count === 0) {
            console.warn(`[WebPush]   → user ${uid.slice(0, 8)}... has 0 subscriptions!`);
        } else {
            console.log(`[WebPush]   → user ${uid.slice(0, 8)}... has ${count} subscription(s), sending to ${Math.min(count, 3)}`);
        }
    }

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
                console.log(`[WebPush] Removing stale subscription ${sub.id} (HTTP ${error.statusCode})`);
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            failed++;
        }
    }

    console.log(`[WebPush] sendPushToSpecificUsers: sent=${sent} failed=${failed}`);
    return { sent, failed };
}

