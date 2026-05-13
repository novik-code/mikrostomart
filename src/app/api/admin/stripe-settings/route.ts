/**
 * Admin API: Stripe provider configuration per tenant
 *
 * GET    /api/admin/stripe-settings  — returns config status (key masked, source)
 * PATCH  /api/admin/stripe-settings  — saves publishable_key + secret_key to DB
 * POST   /api/admin/stripe-settings?action=test — creates test PaymentIntent
 *
 * Note: separate from /api/admin/sms-settings (which toggles SMS types)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { requireAdmin } from '@/lib/authGuards';
import { getStripeConfig } from '@/lib/stripeService';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

function maskKey(key: string | null | undefined): string | null {
    if (!key) return null;
    const prefix = key.startsWith('sk_live') ? 'sk_live' : key.startsWith('sk_test') ? 'sk_test' : 'sk';
    return `${prefix}_...${key.slice(-4)}`;
}

function maskWebhookSecret(secret: string | null | undefined): string | null {
    if (!secret) return null;
    // Stripe webhook secrets are `whsec_...` (always — we validate the prefix on save)
    return `whsec_...${secret.slice(-4)}`;
}

// GET — return current config status (API keys + webhook secret, all masked)
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    // Use stripeService so the resolution logic stays in one place
    const config = await getStripeConfig();

    return NextResponse.json({
        source: config.source,
        enabled: config.enabled,
        publishable_key: config.publishableKey,
        secret_key_masked: maskKey(config.secretKey),
        webhook_secret_masked: maskWebhookSecret(config.webhookSecret),
        has_webhook_secret: !!config.webhookSecret,
        webhook_source: config.webhookSource,
    });
}

// PATCH — save keys / webhook secret to DB
// Accepts any subset of: { publishable_key, secret_key, webhook_secret, enabled }.
// Empty-string values for *_key / webhook_secret clear that field (fall back to env).
export async function PATCH(request: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();
        const { publishable_key, secret_key, webhook_secret, enabled } = body as {
            publishable_key?: string;
            secret_key?: string;
            webhook_secret?: string;
            enabled?: boolean;
        };

        // Validate non-empty submitted values. Empty string is treated as "clear".
        if (typeof publishable_key === 'string' && publishable_key.length > 0 && !publishable_key.startsWith('pk_')) {
            return NextResponse.json({ error: 'Invalid publishable key (must start with pk_)' }, { status: 400 });
        }
        if (typeof secret_key === 'string' && secret_key.length > 0 && !secret_key.startsWith('sk_')) {
            return NextResponse.json({ error: 'Invalid secret key (must start with sk_)' }, { status: 400 });
        }
        if (typeof webhook_secret === 'string' && webhook_secret.length > 0 && !webhook_secret.startsWith('whsec_')) {
            return NextResponse.json({ error: 'Invalid webhook secret (must start with whsec_)' }, { status: 400 });
        }

        const supabase = getSupabase();

        // Read existing so we preserve fields the caller didn't touch
        const { data: existing } = await supabase
            .from('clinic_settings')
            .select('value')
            .eq('key', 'stripe_settings')
            .maybeSingle();
        const current = (existing?.value as Record<string, unknown> | null) || {};

        const value: Record<string, unknown> = { ...current };
        if (publishable_key !== undefined) {
            if (publishable_key.length > 0) value.publishable_key = publishable_key;
            else delete value.publishable_key;
        }
        if (secret_key !== undefined) {
            if (secret_key.length > 0) value.secret_key = secret_key;
            else delete value.secret_key;
        }
        if (webhook_secret !== undefined) {
            if (webhook_secret.length > 0) value.webhook_secret = webhook_secret;
            else delete value.webhook_secret;
        }
        if (enabled !== undefined) value.enabled = enabled;
        else if (value.enabled === undefined) value.enabled = true;

        const { error } = await supabase
            .from('clinic_settings')
            .upsert({ key: 'stripe_settings', value }, { onConflict: 'key' });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            secret_key_masked: maskKey(typeof value.secret_key === 'string' ? value.secret_key : null),
            webhook_secret_masked: maskWebhookSecret(typeof value.webhook_secret === 'string' ? value.webhook_secret : null),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST?action=test — verify keys by creating a test PaymentIntent
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { searchParams } = new URL(request.url);
        if (searchParams.get('action') !== 'test') {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        const { secret_key } = await request.json();
        if (!secret_key) {
            return NextResponse.json({ error: 'secret_key required' }, { status: 400 });
        }

        const stripe = new Stripe(secret_key);

        // Create a minimal PaymentIntent (50 gr = 50 groszy) to verify keys
        const pi = await stripe.paymentIntents.create({
            amount: 50,
            currency: 'pln',
            automatic_payment_methods: { enabled: true },
        });

        // Immediately cancel so no money is charged
        await stripe.paymentIntents.cancel(pi.id);

        const mode = secret_key.includes('_test_') ? 'test' : 'live';
        return NextResponse.json({ ok: true, mode, message: `Klucze ${mode.toUpperCase()} działają poprawnie ✅` });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
}
