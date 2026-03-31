/**
 * POST /api/payu/create-order
 *
 * Creates a PayU order and returns redirect URL.
 * Uses OAuth2 Bearer token (fresh per request).
 *
 * Body: { amount: number (PLN), email: string, firstName: string, lastName: string,
 *         description: string, orderId: string }
 * Response: { redirectUrl: string, payuOrderId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPayUConfig, getPayUToken, getPayUBaseUrl } from '@/lib/payuService';

export async function POST(request: NextRequest) {
    try {
        const config = await getPayUConfig();

        if (!config.enabled || !config.posId || !config.clientId || !config.clientSecret) {
            return NextResponse.json({ error: 'PayU not configured' }, { status: 503 });
        }

        const { amount, email, firstName, lastName, description, orderId } = await request.json();

        if (!amount || !email) {
            return NextResponse.json({ error: 'amount i email są wymagane' }, { status: 400 });
        }

        // Get client IP (needed by PayU)
        const customerIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

        // Step 1: Get OAuth2 token
        const token = await getPayUToken(config);

        // Step 2: Create order
        const baseUrl = getPayUBaseUrl(config.sandbox);
        const amountInGrosze = Math.round(amount * 100);
        const sessionId = orderId || `session_${Date.now()}`;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        const orderBody = {
            notifyUrl: `${appUrl}/api/payu/webhook`,
            continueUrl: `${appUrl}/platnosc?status=return&provider=payu`,
            customerIp,
            merchantPosId: config.posId,
            description: description || 'Płatność DensFlow',
            currencyCode: 'PLN',
            totalAmount: amountInGrosze,
            extOrderId: sessionId,
            buyer: {
                email,
                firstName: firstName || 'Klient',
                lastName: lastName || 'DensFlow',
                language: 'pl',
            },
            products: [
                {
                    name: description || 'Zadatek za wizytę',
                    unitPrice: amountInGrosze,
                    quantity: 1,
                },
            ],
            payMethods: {
                payMethod: { type: 'PBL' } // Polish bank/BLIK redirect
            },
        };

        // PayU returns 302 redirect — we must NOT follow it, capture the redirect URL
        const res = await fetch(`${baseUrl}/api/v2_1/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderBody),
            redirect: 'manual', // Don't follow redirects
        });

        // PayU 302: Location header = payment page URL
        if (res.status === 302) {
            const redirectUrl = res.headers.get('location');
            const data = await res.text();
            let payuOrderId = '';
            try {
                const json = JSON.parse(data);
                payuOrderId = json.orderId || '';
            } catch { /* ok */ }
            return NextResponse.json({ redirectUrl, payuOrderId, sessionId });
        }

        // PayU 201: JSON with redirectUri
        if (res.status === 200 || res.status === 201) {
            const data = await res.json();
            return NextResponse.json({
                redirectUrl: data.redirectUri,
                payuOrderId: data.orderId,
                sessionId,
            });
        }

        const err = await res.text();
        console.error('[PayU create-order] Error:', res.status, err);
        return NextResponse.json({ error: `PayU error ${res.status}: ${err}` }, { status: 400 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PayU create-order] Exception:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
