/**
 * GET /api/payment-methods
 *
 * Returns which payment methods are available/enabled for this tenant.
 * Used by CheckoutForm to show/hide payment method cards.
 *
 * Response: { stripe: boolean, p24: boolean, payu: boolean }
 */

import { NextResponse } from 'next/server';
import { getPayUConfig } from '@/lib/payuService';
import { getStripeConfig } from '@/lib/stripeService';
import { getP24Config } from '@/lib/p24Service';

export const dynamic = 'force-dynamic';

export async function GET() {
    const [stripe, p24, payu] = await Promise.all([
        getStripeConfig().then(c => ({ enabled: c.enabled && !!c.secretKey })).catch(() => ({ enabled: false })),
        getP24Config().then(c => ({ enabled: c.enabled && !!c.posId && !!c.crcKey && !!c.apiKey })).catch(() => ({ enabled: false })),
        getPayUConfig().then(c => ({ enabled: c.enabled && !!c.posId && !!c.clientId && !!c.clientSecret })).catch(() => ({ enabled: false })),
    ]);

    return NextResponse.json({
        stripe: stripe.enabled,
        p24: p24.enabled,
        payu: payu.enabled,
    });
}
