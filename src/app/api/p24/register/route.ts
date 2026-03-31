/**
 * POST /api/p24/register
 *
 * Registers a P24 transaction and returns the redirect URL.
 * Frontend should redirect the user to this URL to complete payment.
 *
 * Body: { amount: number (PLN), email: string, description: string, sessionId: string }
 * Response: { redirectUrl: string } or { error: string }
 */

import { NextResponse } from 'next/server';
import { getP24Config, calcP24Sign, getP24BaseUrl } from '@/lib/p24Service';

export async function POST(request: Request) {
    try {
        const config = await getP24Config();

        if (!config.enabled || !config.crcKey || !config.apiKey || !config.merchantId || !config.posId) {
            return NextResponse.json({ error: 'Przelewy24 not configured' }, { status: 503 });
        }

        const { amount, email, description, sessionId, returnUrl, notifyUrl } = await request.json();

        if (!amount || !email || !sessionId) {
            return NextResponse.json({ error: 'amount, email, sessionId required' }, { status: 400 });
        }

        const baseUrl = getP24BaseUrl(config.sandbox);
        const amountInGrosze = Math.round(amount * 100); // P24 uses grosze (like Stripe uses cents)

        // Calculate sign for registration
        const signParams = {
            sessionId,
            merchantId: config.merchantId,
            amount: amountInGrosze,
            currency: 'PLN',
            crc: config.crcKey,
        };
        const sign = calcP24Sign(signParams, config.crcKey);

        const body = {
            merchantId: config.merchantId,
            posId: config.posId,
            sessionId,
            amount: amountInGrosze,
            currency: 'PLN',
            description: description || 'Płatność DensFlow',
            email,
            country: 'PL',
            language: 'pl',
            urlReturn: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/platnosc?status=return`,
            urlStatus: notifyUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/p24/webhook`,
            timeLimit: 15, // minutes
            encoding: 'UTF-8',
            sign,
        };

        const credentials = Buffer.from(`${config.posId}:${config.apiKey}`).toString('base64');

        const res = await fetch(`${baseUrl}/api/v1/transaction/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            console.error('[P24 register] Error:', data);
            return NextResponse.json({ error: data.error || 'P24 registration failed' }, { status: 400 });
        }

        const token = data.data?.token;
        if (!token) {
            return NextResponse.json({ error: 'No token in P24 response' }, { status: 500 });
        }

        const redirectUrl = `${baseUrl}/trnRequest/${token}`;
        return NextResponse.json({ redirectUrl, token });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[P24 register] Exception:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
