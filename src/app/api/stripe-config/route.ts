/**
 * GET /api/stripe-config
 *
 * Public endpoint — returns ONLY the Stripe publishable key (never the secret).
 * Used by CheckoutForm to dynamically load Stripe with the per-tenant key.
 */

import { NextResponse } from 'next/server';
import { getStripeConfig } from '@/lib/stripeService';

export async function GET() {
    const config = await getStripeConfig();

    return NextResponse.json({
        publishableKey: config.publishableKey,
        enabled: config.enabled,
        source: config.source,
    });
}
