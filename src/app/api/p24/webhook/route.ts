/**
 * POST /api/p24/webhook
 *
 * Receives IPN (Instant Payment Notification) from Przelewy24 after payment.
 * Verifies the signature, then calls P24 /transaction/verify to confirm payment.
 *
 * P24 expects HTTP 200 response to acknowledge receipt.
 */

import { NextResponse } from 'next/server';
import { getP24Config, calcP24WebhookSign, getP24BaseUrl } from '@/lib/p24Service';

export async function POST(request: Request) {
    try {
        const config = await getP24Config();

        if (!config.enabled || !config.crcKey || !config.apiKey || !config.merchantId || !config.posId) {
            console.error('[P24 webhook] P24 not configured');
            return NextResponse.json({ error: 'Not configured' }, { status: 503 });
        }

        const body = await request.json();
        const { merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, sign } = body;

        console.log('[P24 webhook] Received IPN:', { sessionId, amount, orderId, methodId });

        // Verify webhook signature
        const expectedSign = calcP24WebhookSign(
            sessionId,
            orderId,
            amount,
            currency,
            config.crcKey
        );

        if (sign !== expectedSign) {
            console.error('[P24 webhook] Invalid signature!', { received: sign, expected: expectedSign });
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // Verify transaction with P24
        const baseUrl = getP24BaseUrl(config.sandbox);
        const credentials = Buffer.from(`${config.posId}:${config.apiKey}`).toString('base64');

        const verifyRes = await fetch(`${baseUrl}/api/v1/transaction/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                merchantId,
                posId,
                sessionId,
                amount,
                currency,
                orderId,
                sign: expectedSign,
            }),
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || verifyData.error) {
            console.error('[P24 webhook] Verification failed:', verifyData);
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
        }

        // Payment confirmed — log details
        console.log('[P24 webhook] ✅ Payment verified:', {
            sessionId,
            orderId,
            amount,
            originAmount,
            currency,
            methodId,
            statement,
        });

        // TODO: Mark order as paid in DB (integrate with order system when ready)
        // Example: await supabase.from('orders').update({ status: 'paid' }).eq('session_id', sessionId)

        // P24 requires HTTP 200 to acknowledge
        return NextResponse.json({ status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[P24 webhook] Exception:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
