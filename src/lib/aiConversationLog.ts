import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type AIContext = 'patient_chat' | 'cennik_chat' | 'simulator' | 'asystent';

export type AIMessage = {
    role: 'user' | 'assistant';
    content: string;
    ts: string; // ISO timestamp
};

/**
 * Hash an IP address using HMAC-SHA256 with secret salt.
 * Returns non-reversible 16-char hex prefix. Per RODO Recital 26, hashed IPs
 * are no longer personal data when the salt is properly secured.
 *
 * Used for rate limiting + abuse detection only. Cannot be reversed to IP
 * without the secret (stored in MFA_SESSION_SECRET env var).
 */
export function hashIp(ip: string | null | undefined): string | null {
    if (!ip) return null;
    const secret = process.env.MFA_SESSION_SECRET;
    if (!secret) return null;
    try {
        return crypto.createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16);
    } catch {
        return null;
    }
}

/**
 * Extract IP address from Next.js request headers.
 */
export function getIpFromRequest(req: Request | { headers: { get: (k: string) => string | null } }): string | null {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip');
}

/**
 * Persist (or append to) an AI conversation in Supabase.
 *
 * Behavior per D4=C+ from PLAN_RODO_PII_AUDIT.md:
 *  - Logged-in patient (userId present): always persist (disclosed in privacy §11)
 *  - Anonymous (anonId present): persist ONLY when consent_given=true (cookie opt-in)
 *  - 90-day retention enforced by data-retention-cleanup cron
 *
 * Strategy: one row per session (matched by user_id/anon_id + context + same day).
 * Appends to messages JSONB array on each call.
 *
 * NON-BLOCKING: errors logged but never thrown — AI response must not depend on logging.
 */
export async function logAIConversation(params: {
    userId?: string | null;
    anonId?: string | null;
    ipHash?: string | null;
    context: AIContext;
    userMessage: string;
    assistantMessage: string;
    consentGiven: boolean;
}): Promise<void> {
    // Anonymous users without consent: don't persist
    if (!params.userId && !params.consentGiven) {
        return;
    }

    // Need either user_id or anon_id
    if (!params.userId && !params.anonId) {
        return;
    }

    try {
        const now = new Date().toISOString();
        const newMessages: AIMessage[] = [
            { role: 'user', content: params.userMessage, ts: now },
            { role: 'assistant', content: params.assistantMessage, ts: now },
        ];

        // Try to find existing session (same user/anon + context + today)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        let query = supabase
            .from('ai_conversations')
            .select('id, messages')
            .eq('context', params.context)
            .gte('last_message_at', since)
            .order('last_message_at', { ascending: false })
            .limit(1);

        if (params.userId) {
            query = query.eq('user_id', params.userId);
        } else if (params.anonId) {
            query = query.eq('anon_id', params.anonId);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            // Append to existing session
            const merged = [...(Array.isArray(existing.messages) ? existing.messages : []), ...newMessages];
            await supabase
                .from('ai_conversations')
                .update({
                    messages: merged,
                    last_message_at: now,
                    // Reset expires_at to 90 days from last message
                    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .eq('id', existing.id);
        } else {
            // Start new session
            await supabase.from('ai_conversations').insert({
                user_id: params.userId || null,
                anon_id: params.anonId || null,
                ip_hash: params.ipHash || null,
                context: params.context,
                messages: newMessages,
                consent_given: params.consentGiven,
                started_at: now,
                last_message_at: now,
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }
    } catch (err) {
        console.error('[AIConversationLog] persist error:', err);
        // Non-blocking — AI response continues regardless
    }
}

/**
 * Read AI conversation history for a specific user (for export-data / RODO Art. 15).
 */
export async function getUserAIConversations(userId: string): Promise<Array<{
    id: string;
    context: string;
    messages: AIMessage[];
    started_at: string;
    last_message_at: string;
}>> {
    const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, context, messages, started_at, last_message_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

    if (error) {
        console.error('[AIConversationLog] read error:', error);
        return [];
    }

    return (data || []).map(r => ({
        ...r,
        messages: Array.isArray(r.messages) ? r.messages : [],
    }));
}
