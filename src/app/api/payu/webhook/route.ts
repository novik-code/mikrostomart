/**
 * POST /api/payu/webhook
 *
 * Receives IPN notifications from PayU after payment.
 * PayU sends: POST with JSON body + OpenPayU-Signature header
 * Must respond HTTP 200 to acknowledge.
 *
 * Signature format: sender=checkout;signature=HASH;algorithm=MD5;version=2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPayUConfig, verifyPayUSignature } from '@/lib/payuService';

export async function POST(request: NextRequest) {
    try {
        const config = await getPayUConfig();

        if (!config.enabled || !config.secondKey) {
            console.error('[PayU webhook] PayU not configured');
            return NextResponse.json({ error: 'Not configured' }, { status: 503 });
        }

        const rawBody = await request.text();
        const signatureHeader = request.headers.get('OpenPayU-Signature') || '';

        // Verify signature
        if (signatureHeader && !verifyPayUSignature(rawBody, signatureHeader, config.secondKey)) {
            console.error('[PayU webhook] Invalid signature!');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const body = JSON.parse(rawBody);
        const order = body.order;
        const status = body.order?.status;

        console.log('[PayU webhook] Received notification:', {
            orderId: order?.orderId,
            extOrderId: order?.extOrderId,
            status,
            totalAmount: order?.totalAmount,
        });

        // Handle different statuses
        switch (status) {
            case 'COMPLETED':
                // Payment confirmed — log and mark order as paid
                console.log('[PayU webhook] ✅ Payment COMPLETED:', {
                    orderId: order?.orderId,
                    extOrderId: order?.extOrderId,
                    amount: order?.totalAmount,
                    buyer: order?.buyer?.email,
                });
                // TODO: Mark order as paid in DB when order system is integrated
                // await supabase.from('orders').update({ status: 'paid', payu_order_id: order.orderId })
                //   .eq('session_id', order.extOrderId)
                break;

            case 'PENDING':
                console.log('[PayU webhook] ⏳ Payment PENDING:', order?.orderId);
                break;

            case 'CANCELED':
                console.log('[PayU webhook] ❌ Payment CANCELED:', order?.orderId);
                break;

            case 'WAITING_FOR_CONFIRMATION':
                console.log('[PayU webhook] ⏸️ Waiting for confirmation:', order?.orderId);
                break;

            default:
                console.log('[PayU webhook] Unknown status:', status, order?.orderId);
        }

        // PayU requires HTTP 200 to stop sending notifications
        return NextResponse.json({ status: 200 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PayU webhook] Exception:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
