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
                // Data-only message — no 'notification' key!
                // This prevents FCM from auto-displaying a notification,
                // letting our service worker (background) and onMessage handler
                // (foreground) be the SOLE handlers. Avoids duplicate notifications.
                data: {
                    title: payload.title,
                    body: payload.body,
                    url: payload.url || '/',
                    tag: payload.tag || 'notification',
                    icon: payload.icon || '/icon-192x192.png',
                    requireInteraction: String(payload.requireInteraction || false),
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

// ─── Resolve target users per group (regardless of FCM tokens) ──

async function resolveGroupUsers(group: PushGroup): Promise<{ user_id: string; user_type: string }[]> {
    if (group === 'patients') {
        // Patients don't have an employees row — resolve from user_roles
        const { data } = await supabase
            .from('user_roles').select('user_id')
            .eq('role', 'patient');
        return (data || []).map(r => ({ user_id: r.user_id, user_type: 'patient' }));
    }
    if (group === 'admin') {
        const { data } = await supabase
            .from('user_roles').select('user_id')
            .eq('role', 'admin');
        return (data || []).map(r => ({ user_id: r.user_id, user_type: 'admin' }));
    }
    // Employee sub-groups
    const groupMap: Record<string, string> = {
        doctors: 'doctor', hygienists: 'hygienist',
        reception: 'reception', assistant: 'assistant',
    };
    const dbGroup = groupMap[group];
    if (!dbGroup) return [];
    const { data: employees } = await supabase
        .from('employees').select('user_id')
        .eq('is_active', true)
        .contains('push_groups', [dbGroup]);
    return (employees || []).filter(e => e.user_id).map(e => ({ user_id: e.user_id, user_type: 'employee' }));
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Send push notification to a specific user (all their devices).
 * Always logs to history, even if user has no FCM tokens.
 */
export async function pushToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    // Always log to history regardless of delivery
    await logPush(userId, userType, payload);

    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .eq('user_type', userType);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    return sendToTokens(tokens, payload);
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

    // Log for ALL target users regardless of FCM tokens
    for (const uid of userIds) {
        await logPush(uid, 'employee', payload);
    }

    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .in('user_id', userIds);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    if (tokens.length === 0) {
        console.log(`[Push] pushToUsers: ${userIds.length} users (logged), no FCM tokens`);
        return { sent: 0, failed: 0 };
    }

    const result = await sendToTokens(tokens, payload);
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
    // Log for ALL active employees (regardless of FCM tokens)
    const { data: allEmps } = await supabase
        .from('employees').select('user_id')
        .eq('is_active', true);
    for (const emp of allEmps || []) {
        if (emp.user_id && emp.user_id !== excludeUserId) {
            await logPush(emp.user_id, 'employee', payload);
        }
    }

    // Send push only to those with FCM tokens
    let query = supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .in('user_type', ['employee', 'admin']);

    if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
    }

    const { data: tokenRows } = await query;
    const tokens = (tokenRows || []).map(r => r.fcm_token);
    return sendToTokens(tokens, payload);
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
    const loggedUsers = new Set<string>();

    for (const group of groups) {
        // 1. Resolve ALL target users (for history logging)
        const allUsers = await resolveGroupUsers(group);
        for (const u of allUsers) {
            if (!loggedUsers.has(u.user_id)) {
                loggedUsers.add(u.user_id);
                await logPush(u.user_id, u.user_type, payload);
            }
        }

        // 2. Find FCM tokens for delivery
        const userIds = allUsers.map(u => u.user_id);
        let tokenRows: any[] = [];
        if (userIds.length > 0) {
            const { data } = await supabase
                .from('fcm_tokens').select('fcm_token, user_id, user_type')
                .in('user_id', userIds);
            tokenRows = data || [];
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

    // 3. Resolve ALL target users and log for history
    const loggedUsers = new Set<string>();
    const allTargetUserIds: string[] = [];

    for (const group of groups) {
        const allUsers = await resolveGroupUsers(group);
        for (const u of allUsers) {
            if (excludeUserId && u.user_id === excludeUserId) continue;
            if (mutedUserIds.has(u.user_id)) continue;
            if (!loggedUsers.has(u.user_id)) {
                loggedUsers.add(u.user_id);
                allTargetUserIds.push(u.user_id);
                await logPush(u.user_id, u.user_type, payload);
            }
        }
    }

    // 4. Find FCM tokens for delivery
    if (allTargetUserIds.length === 0) {
        console.log(`[Push] pushByConfig: key="${configKey}" no target users after filtering`);
        return { sent: 0, failed: 0 };
    }

    const { data: tokenRows } = await supabase
        .from('fcm_tokens').select('fcm_token, user_id, user_type')
        .in('user_id', allTargetUserIds);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    const result = await sendToTokens(tokens, payload);

    console.log(`[Push] pushByConfig: key="${configKey}" groups=[${groups.join(',')}] logged=${loggedUsers.size} → sent=${result.sent} failed=${result.failed}`);
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
    const payload = { title, body, url };

    // Log for ALL users of this type (regardless of FCM tokens)
    if (userType === 'employee') {
        const { data: allEmps } = await supabase
            .from('employees').select('user_id').eq('is_active', true);
        for (const emp of allEmps || []) {
            if (emp.user_id) await logPush(emp.user_id, 'employee', payload);
        }
    } else {
        const { data: allUsers } = await supabase
            .from('user_roles').select('user_id').eq('role', userType);
        for (const u of allUsers || []) {
            if (u.user_id) await logPush(u.user_id, userType, payload);
        }
    }

    // Send push only to those with FCM tokens
    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .eq('user_type', userType);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    return sendToTokens(tokens, payload);
};
