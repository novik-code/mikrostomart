/**
 * Stripe configuration service — DB-first, env fallback.
 *
 * Priority:
 *  1. clinic_settings.stripe_settings (Supabase) — per-tenant keys
 *  2. STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env vars
 *  3. null (Stripe disabled)
 *
 * SAFETY: try/catch — if DB unreachable, env fallback is always used.
 */

import { createClient } from '@supabase/supabase-js';

export interface StripeConfig {
    secretKey: string | null;
    publishableKey: string | null;
    source: 'db' | 'env' | 'none';
    enabled: boolean;
}

interface StripeSettings {
    secret_key?: string | null;
    publishable_key?: string | null;
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

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from('clinic_settings')
            .select('value')
            .eq('key', 'stripe_settings')
            .single();

        if (!error && data?.value) {
            const settings = data.value as StripeSettings;
            const dbSecret = settings.secret_key || null;
            const dbPublishable = settings.publishable_key || null;
            const enabled = settings.enabled ?? false;

            if (dbSecret && dbPublishable && enabled) {
                return { secretKey: dbSecret, publishableKey: dbPublishable, source: 'db', enabled: true };
            }
        }
    } catch (err) {
        console.error('[stripeService] DB read failed, using env fallback:', err);
    }

    // Env fallback
    if (envSecret && envPublishable) {
        return { secretKey: envSecret, publishableKey: envPublishable, source: 'env', enabled: true };
    }

    return { secretKey: null, publishableKey: null, source: 'none', enabled: false };
}
