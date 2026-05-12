/**
 * POST /api/p24/register
 *
 * Step 2 of the S2-2 checkout flow for Przelewy24. Client posts
 * `{ orderId, email, description?, returnUrl?, notifyUrl? }` — NOT an
 * amount. The server loads the pending order, uses `amount_total` as
 * the source of truth (in grosze), registers the P24 transaction, and
 * links the P24 sessionId back via `provider_order_id`. Status stays
 * 'pending' until the S2-3 webhook verifies the response.
 *
 * Response: { redirectUrl, token, orderId, sessionId }
 */

import { NextResponse } from "next/server";
import { getP24Config, calcP24Sign, getP24BaseUrl } from "@/lib/p24Service";
import { attachProviderOrder, CartValidationError, loadPendingOrder } from "@/lib/cartCalculator";

export async function POST(request: Request) {
    try {
        const config = await getP24Config();

        if (!config.enabled || !config.crcKey || !config.apiKey || !config.merchantId || !config.posId) {
            return NextResponse.json({ error: "Przelewy24 not configured" }, { status: 503 });
        }

        const body = await request.json().catch(() => ({}));
        const { orderId, email, description, returnUrl, notifyUrl } = body as {
            orderId?: string;
            email?: string;
            description?: string;
            returnUrl?: string;
            notifyUrl?: string;
        };

        if (!orderId || !email) {
            return NextResponse.json(
                { error: "orderId, email required (call /api/cart/calculate-total first)" },
                { status: 400 }
            );
        }

        let pending;
        try {
            pending = await loadPendingOrder(orderId);
        } catch (err) {
            if (err instanceof CartValidationError) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
            throw err;
        }

        const baseUrl = getP24BaseUrl(config.sandbox);
        const amountInGrosze = Math.round(pending.amountTotal * 100);

        // P24 sessionId must be unique per transaction. We derive it from the
        // order row id so a single pending order maps to a single P24 session
        // (and lets us correlate webhooks deterministically).
        const sessionId = `order_${orderId}`;

        const signParams = {
            sessionId,
            merchantId: config.merchantId,
            amount: amountInGrosze,
            currency: "PLN",
            crc: config.crcKey,
        };
        const sign = calcP24Sign(signParams, config.crcKey);

        const p24Body = {
            merchantId: config.merchantId,
            posId: config.posId,
            sessionId,
            amount: amountInGrosze,
            currency: "PLN",
            description: description || "Płatność DensFlow",
            email,
            country: "PL",
            language: "pl",
            urlReturn: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/platnosc?status=return&provider=p24&orderId=${orderId}`,
            urlStatus: notifyUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/p24/webhook`,
            timeLimit: 15,
            encoding: "UTF-8",
            sign,
        };

        const credentials = Buffer.from(`${config.posId}:${config.apiKey}`).toString("base64");

        const res = await fetch(`${baseUrl}/api/v1/transaction/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${credentials}`,
            },
            body: JSON.stringify(p24Body),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            console.error("[P24 register] Error:", data);
            return NextResponse.json({ error: data.error || "P24 registration failed" }, { status: 400 });
        }

        const token = data.data?.token;
        if (!token) {
            return NextResponse.json({ error: "No token in P24 response" }, { status: 500 });
        }

        await attachProviderOrder({
            orderId,
            paymentProvider: "p24",
            providerOrderId: sessionId,
        });

        const redirectUrl = `${baseUrl}/trnRequest/${token}`;
        return NextResponse.json({ redirectUrl, token, orderId, sessionId });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[P24 register] Exception:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
