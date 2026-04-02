/**
 * Push Notification Service — Firebase Cloud Messaging (FCM)
 *
 * Replaces the old web-push VAPID system. All push notifications go through FCM.
 * This is the single source of truth for sending pushes.
 */
import { getMessaging } from './firebase';
import { createClient } from '@supabase/supabase-js';
import { getPushTranslation, PushNotificationType } from './pushTranslations';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
}

export type PushGroup = 'patients' | 'doctors' | 'hygienists' | 'reception' | 'assistant' | 'admin';

// ─── Log Push (AWAITED — fixes empty alerts tab) ─────────────

async function logPush(
    userId: string,
    userType: string,
    payload: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
    try {
        const { error } = await supabase.from('push_notifications_log').insert({
            user_id: userId,
            user_type: userType,
            title: payload.title,
            body: payload.body,
            url: payload.url ?? null,
            tag: payload.tag ?? null,
        });
        if (error) {
            console.error('[Push] Log insert error:', error.message);
        }
    } catch (err: any) {
        console.error('[Push] Log exception:', err.message);
    }
}

// ─── Core: Send to FCM tokens ────────────────────────────────

/**
 * Send a push notification to a list of FCM tokens.
 * Handles batch sending (up to 500 per call) and stale token cleanup.
 */
async function sendToTokens(
    tokens: string[],
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const messaging = getMessaging();
    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    // FCM supports up to 500 tokens per multicast
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);

        try {
            const response = await messaging.sendEachForMulticast({
                tokens: batch,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: {
                    url: payload.url || '/',
                    tag: payload.tag || 'notification',
                    icon: payload.icon || '/icon-192x192.png',
                    requireInteraction: String(payload.requireInteraction || false),
                },
                webpush: {
                    fcmOptions: {
                        link: payload.url || '/',
                    },
                },
            });

            response.responses.forEach((res, idx) => {
                if (res.success) {
                    sent++;
                } else {
                    failed++;
                    // Clean up invalid tokens
                    const errorCode = res.error?.code;
                    if (
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token'
                    ) {
                        staleTokens.push(batch[idx]);
                    }
                }
            });
        } catch (err: any) {
            console.error('[Push] Batch send error:', err.message);
            failed += batch.length;
        }
    }

    // Clean up stale tokens
    if (staleTokens.length > 0) {
        console.log(`[Push] Cleaning ${staleTokens.length} stale tokens`);
        await supabase.from('fcm_tokens').delete().in('fcm_token', staleTokens);
    }

    return { sent, failed };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Send push notification to a specific user (all their devices).
 */
export async function pushToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .eq('user_type', userType);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const result = await sendToTokens(tokens, payload);

    if (result.sent > 0) {
        await logPush(userId, userType, payload);
    }

    return result;
}

/**
 * Send translated push notification to a user based on the notification type.
 */
export async function pushTranslatedToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    notificationType: PushNotificationType,
    params: Record<string, string> = {},
    url?: string
): Promise<{ sent: number; failed: number }> {
    // FCM tokens don't store locale — use 'pl' as default for now
    const { title, body } = getPushTranslation(notificationType, 'pl', params);
    return pushToUser(userId, userType, { title, body, url });
}

/**
 * Send push notification to specific users by user_id array.
 */
export async function pushToUsers(
    userIds: string[],
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    if (!userIds || userIds.length === 0) return { sent: 0, failed: 0 };

    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .in('user_id', userIds);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    if (tokens.length === 0) {
        console.warn('[Push] pushToUsers: no FCM tokens for', userIds.length, 'users');
        return { sent: 0, failed: 0 };
    }

    const result = await sendToTokens(tokens, payload);

    // Log once per user
    const loggedUsers = new Set<string>();
    for (const row of tokenRows || []) {
        if (!loggedUsers.has(row.user_id)) {
            loggedUsers.add(row.user_id);
            await logPush(row.user_id, row.user_type, payload);
        }
    }

    console.log(`[Push] pushToUsers: ${userIds.length} users → sent=${result.sent} failed=${result.failed}`);
    return result;
}

/**
 * Send push notification to ALL subscribed employees.
 * Optionally exclude a specific user.
 */
export async function pushToAllEmployees(
    payload: PushPayload,
    excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
    let query = supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .in('user_type', ['employee', 'admin']);

    if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
    }

    const { data: tokenRows } = await query;
    const tokens = (tokenRows || []).map(r => r.fcm_token);
    const result = await sendToTokens(tokens, payload);

    // Log once per user
    const loggedUsers = new Set<string>();
    for (const row of tokenRows || []) {
        if (!loggedUsers.has(row.user_id)) {
            loggedUsers.add(row.user_id);
            await logPush(row.user_id, row.user_type, payload);
        }
    }

    return result;
}

/**
 * Send push notification to specific employee groups.
 */
export async function pushToGroups(
    groups: PushGroup[],
    payload: PushPayload
): Promise<{ sent: number; failed: number; byGroup: Record<string, { sent: number; failed: number }> }> {
    let totalSent = 0;
    let totalFailed = 0;
    const byGroup: Record<string, { sent: number; failed: number }> = {};
    const sentTokens = new Set<string>();

    for (const group of groups) {
        let tokenRows: any[] = [];

        if (group === 'patients') {
            const { data } = await supabase
                .from('fcm_tokens').select('fcm_token, user_id, user_type')
                .eq('user_type', 'patient');
            tokenRows = data || [];
        } else if (group === 'admin') {
            const { data } = await supabase
                .from('fcm_tokens').select('fcm_token, user_id, user_type')
                .eq('user_type', 'admin');
            tokenRows = data || [];
        } else {
            // Employee sub-groups: map plural → singular DB value
            const groupMap: Record<string, string> = {
                doctors: 'doctor', hygienists: 'hygienist',
                reception: 'reception', assistant: 'assistant',
            };
            const dbGroup = groupMap[group];
            if (!dbGroup) continue;

            // Get employees in this group, then find their FCM tokens
            const { data: employees } = await supabase
                .from('employees')
                .select('user_id')
                .eq('is_active', true)
                .contains('push_groups', [dbGroup]);

            const empUserIds = (employees || []).map(e => e.user_id).filter(Boolean);
            if (empUserIds.length > 0) {
                const { data } = await supabase
                    .from('fcm_tokens').select('fcm_token, user_id, user_type')
                    .in('user_id', empUserIds);
                tokenRows = data || [];
            }
        }

        // Dedup across groups
        const uniqueTokens = tokenRows.filter(r => {
            if (sentTokens.has(r.fcm_token)) return false;
            sentTokens.add(r.fcm_token);
            return true;
        });

        const tokens = uniqueTokens.map(r => r.fcm_token);
        const result = await sendToTokens(tokens, payload);
        byGroup[group] = result;
        totalSent += result.sent;
        totalFailed += result.failed;

        // Log once per user
        const loggedUsers = new Set<string>();
        for (const row of uniqueTokens) {
            if (!loggedUsers.has(row.user_id)) {
                loggedUsers.add(row.user_id);
                await logPush(row.user_id, row.user_type || 'employee', payload);
            }
        }
    }

    return { sent: totalSent, failed: totalFailed, byGroup };
}

/**
 * Config-driven push: reads push_notification_config,
 * respects enabled flag and muted preferences.
 */
export async function pushByConfig(
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

    if (!config || !config.enabled) {
        console.log(`[Push] pushByConfig: key="${configKey}" not found or disabled — skipped`);
        return { sent: 0, failed: 0 };
    }

    const groups: PushGroup[] = (config.groups || []) as PushGroup[];
    if (groups.length === 0) {
        console.log(`[Push] pushByConfig: key="${configKey}" has no groups — skipped`);
        return { sent: 0, failed: 0 };
    }

    // 2. Fetch muted preferences
    const { data: mutedPrefs } = await supabase
        .from('employee_notification_preferences')
        .select('user_id')
        .contains('muted_keys', [configKey]);
    const mutedUserIds = new Set((mutedPrefs || []).map(p => p.user_id));

    // 3. Collect tokens across groups
    const sentTokens = new Set<string>();
    const allTokenRows: any[] = [];

    const groupMap: Record<string, string> = {
        doctors: 'doctor', doctor: 'doctor',
        hygienists: 'hygienist', hygienist: 'hygienist',
        reception: 'reception', assistant: 'assistant',
    };

    for (const group of groups) {
        let tokenRows: any[] = [];

        if (group === 'patients' || (group as string) === 'patient') {
            const { data } = await supabase
                .from('fcm_tokens').select('fcm_token, user_id, user_type')
                .eq('user_type', 'patient');
            tokenRows = data || [];
        } else if (group === 'admin') {
            const { data } = await supabase
                .from('fcm_tokens').select('fcm_token, user_id, user_type')
                .eq('user_type', 'admin');
            tokenRows = data || [];
        } else {
            const dbGroup = groupMap[group];
            if (!dbGroup) continue;

            const { data: employees } = await supabase
                .from('employees')
                .select('user_id')
                .eq('is_active', true)
                .contains('push_groups', [dbGroup]);

            const empUserIds = (employees || []).map(e => e.user_id).filter(Boolean);
            if (empUserIds.length > 0) {
                const { data } = await supabase
                    .from('fcm_tokens').select('fcm_token, user_id, user_type')
                    .in('user_id', empUserIds);
                tokenRows = data || [];
            }
        }

        for (const row of tokenRows) {
            if (sentTokens.has(row.fcm_token)) continue;
            if (excludeUserId && row.user_id === excludeUserId) continue;
            if (mutedUserIds.has(row.user_id)) continue;
            sentTokens.add(row.fcm_token);
            allTokenRows.push(row);
        }
    }

    const tokens = allTokenRows.map(r => r.fcm_token);
    const result = await sendToTokens(tokens, payload);

    // Log once per user
    const loggedUsers = new Set<string>();
    for (const row of allTokenRows) {
        if (!loggedUsers.has(row.user_id)) {
            loggedUsers.add(row.user_id);
            await logPush(row.user_id, row.user_type || 'employee', payload);
        }
    }

    console.log(`[Push] pushByConfig: key="${configKey}" groups=[${groups.join(',')}] → sent=${result.sent} failed=${result.failed}`);
    return result;
}

// ─── Legacy compatibility aliases ────────────────────────────
// These map old function names to new ones for callers that haven't been updated yet.

export const sendPushToUser = pushToUser;
export const sendTranslatedPushToUser = pushTranslatedToUser;
export const sendPushToAllEmployees = pushToAllEmployees;
export const sendPushToGroups = pushToGroups;
export const sendPushByConfig = pushByConfig;
export const sendPushToSpecificUsers = pushToUsers;
export const broadcastPush = async (
    userType: 'patient' | 'employee' | 'admin',
    notificationType: PushNotificationType,
    params: Record<string, string> = {},
    url?: string
): Promise<{ sent: number; failed: number }> => {
    const { title, body } = getPushTranslation(notificationType, 'pl', params);
    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .eq('user_type', userType);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    const result = await sendToTokens(tokens, { title, body, url });

    const loggedUsers = new Set<string>();
    for (const row of tokenRows || []) {
        if (!loggedUsers.has(row.user_id)) {
            loggedUsers.add(row.user_id);
            await logPush(row.user_id, row.user_type || userType, { title, body, url });
        }
    }

    return result;
};
