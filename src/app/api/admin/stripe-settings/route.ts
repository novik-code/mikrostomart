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

// GET — return current config status
export async function GET() {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('clinic_settings')
        .select('value')
        .eq('key', 'stripe_settings')
        .single();

    const envSecret = process.env.STRIPE_SECRET_KEY || null;
    const envPublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;

    if (error || !data?.value) {
        return NextResponse.json({
            source: envSecret ? 'env' : 'none',
            enabled: !!envSecret,
            publishable_key: envPublishable,
            secret_key_masked: maskKey(envSecret),
        });
    }

    const s = data.value as { publishable_key?: string; secret_key?: string; enabled?: boolean };
    const hasDb = !!(s.publishable_key && s.secret_key);

    return NextResponse.json({
        source: hasDb ? 'db' : (envSecret ? 'env' : 'none'),
        enabled: hasDb ? (s.enabled ?? false) : !!envSecret,
        publishable_key: s.publishable_key || envPublishable || null,
        secret_key_masked: hasDb ? maskKey(s.secret_key) : maskKey(envSecret),
    });
}

// PATCH — save keys to DB
export async function PATCH(request: Request) {
    try {
        const { publishable_key, secret_key, enabled } = await request.json();

        if (!publishable_key || !secret_key) {
            return NextResponse.json({ error: 'publishable_key and secret_key required' }, { status: 400 });
        }

        if (!publishable_key.startsWith('pk_') || !secret_key.startsWith('sk_')) {
            return NextResponse.json({ error: 'Invalid Stripe key format (pk_... / sk_...)' }, { status: 400 });
        }

        const supabase = getSupabase();

        const { error } = await supabase
            .from('clinic_settings')
            .upsert({
                key: 'stripe_settings',
                value: { publishable_key, secret_key, enabled: enabled ?? true },
            }, { onConflict: 'key' });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, secret_key_masked: maskKey(secret_key) });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST?action=test — verify keys by creating a test PaymentIntent
export async function POST(request: Request) {
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
