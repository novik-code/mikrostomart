/**
 * Stripe configuration service — DB-first, env fallback.
 *
 * Resolution order (per field):
 *  1. clinic_settings.stripe_settings (Supabase) — admin-managed via
 *     /admin → Stripe tab
 *  2. STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY /
 *     STRIPE_WEBHOOK_SECRET env vars
 *  3. null (field disabled)
 *
 * The webhook secret was added in S2-3-bis (2026-05-13) so it can be
 * rotated from the admin panel without touching Vercel env. It's
 * resolved independently from secret_key — you can keep API keys in env
 * and only paste webhook_secret in admin, or vice versa.
 *
 * SAFETY: try/catch — if DB unreachable, env fallback is always used.
 */

import { createClient } from '@supabase/supabase-js';

export interface StripeConfig {
    secretKey: string | null;
    publishableKey: string | null;
    webhookSecret: string | null;
    source: 'db' | 'env' | 'mixed' | 'none';
    enabled: boolean;
    webhookSource: 'db' | 'env' | 'none';
}

interface StripeSettings {
    secret_key?: string | null;
    publishable_key?: string | null;
    webhook_secret?: string | null;
    enabled?: boolean;
}

/**
 * Load Stripe config: DB-first with env fallback.
 * Safe to call from any API route — never throws.
 */
export async function getStripeConfig(): Promise<StripeConfig> {
    // Env fallback values
    const envSecret = process.env.STRIPE_SECRET_KEY || null;
    const envPublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
    const envWebhook = process.env.STRIPE_WEBHOOK_SECRET || null;

    let dbSecret: string | null = null;
    let dbPublishable: string | null = null;
    let dbWebhook: string | null = null;
    let dbEnabled = false;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from('clinic_settings')
            .select('value')
            .eq('key', 'stripe_settings')
            .maybeSingle();

        if (!error && data?.value) {
            const settings = data.value as StripeSettings;
            dbSecret = settings.secret_key || null;
            dbPublishable = settings.publishable_key || null;
            dbWebhook = settings.webhook_secret || null;
            dbEnabled = settings.enabled ?? false;
        }
    } catch (err) {
        console.error('[stripeService] DB read failed, using env fallback:', err);
    }

    // API keys resolution (secret + publishable resolved together —
    // Stripe needs both for any flow to work).
    let secretKey: string | null;
    let publishableKey: string | null;
    let source: StripeConfig['source'];
    let enabled: boolean;
    if (dbEnabled && dbSecret && dbPublishable) {
        secretKey = dbSecret;
        publishableKey = dbPublishable;
        source = 'db';
        enabled = true;
    } else if (envSecret && envPublishable) {
        secretKey = envSecret;
        publishableKey = envPublishable;
        source = 'env';
        enabled = true;
    } else {
        secretKey = null;
        publishableKey = null;
        source = 'none';
        enabled = false;
    }

    // Webhook secret resolved independently — admin may want to manage it
    // separately from the API keys (e.g. keep API keys in env, rotate
    // webhook secret via panel when re-creating the Stripe endpoint after
    // changing webhook events).
    let webhookSecret: string | null;
    let webhookSource: StripeConfig['webhookSource'];
    if (dbWebhook) {
        webhookSecret = dbWebhook;
        webhookSource = 'db';
    } else if (envWebhook) {
        webhookSecret = envWebhook;
        webhookSource = 'env';
    } else {
        webhookSecret = null;
        webhookSource = 'none';
    }

    // If API keys come from one source and webhook from another, mark as 'mixed'.
    if (source !== 'none' && webhookSource !== 'none' && source !== webhookSource) {
        source = 'mixed';
    }

    return { secretKey, publishableKey, webhookSecret, source, enabled, webhookSource };
}
