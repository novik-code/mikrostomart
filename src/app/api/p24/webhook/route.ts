/**
 * POST /api/p24/webhook
 *
 * Przelewy24 IPN handler. Two-step verification:
 *   1. Local: SHA-384 sign of (sessionId, orderId, amount, currency, crcKey)
 *      matches the `sign` field in the body.
 *   2. Remote: PUT /api/v1/transaction/verify back to P24 confirms the
 *      transaction exists on their side. P24 docs require this — without
 *      it an attacker who knew our crcKey could forge a payment.
 *
 * After both pass we flip orders.status via markOrderPaid (atomic + idempotent).
 *
 * Local-order lookup: in /api/p24/register (S2-2) we set
 *     sessionId = `order_${orderId}`
 * so we extract our local orderId from the prefix. The legacy
 * `// TODO: Mark order as paid` comment from pre-S2-3 is gone.
 */

import { NextResponse } from "next/server";
import { getP24Config, calcP24WebhookSign, getP24BaseUrl } from "@/lib/p24Service";
import { markOrderPaid } from "@/lib/paymentWebhooks";

function extractOrderIdFromSessionId(sessionId: string): string | null {
    if (typeof sessionId !== "string") return null;
    if (sessionId.startsWith("order_")) return sessionId.slice("order_".length);
    // Legacy: old code used `p24_<timestamp>` — we no longer accept those
    return null;
}

export async function POST(request: Request) {
    try {
        const config = await getP24Config();

        if (!config.enabled || !config.crcKey || !config.apiKey || !config.merchantId || !config.posId) {
            console.error("[P24 webhook] P24 not configured");
            return NextResponse.json({ error: "Not configured" }, { status: 503 });
        }

        const body = await request.json();
        const { merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, sign } = body;

        console.log("[P24 webhook] Received IPN:", { sessionId, amount, orderId, methodId });

        // 1. Local signature verification
        const expectedSign = calcP24WebhookSign(sessionId, orderId, amount, currency, config.crcKey);
        if (sign !== expectedSign) {
            console.error("[P24 webhook] Invalid signature — rejected");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // 2. Remote verify with P24
        const baseUrl = getP24BaseUrl(config.sandbox);
        const credentials = Buffer.from(`${config.posId}:${config.apiKey}`).toString("base64");

        const verifyRes = await fetch(`${baseUrl}/api/v1/transaction/verify`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${credentials}`,
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
            console.error("[P24 webhook] Remote verification failed:", verifyData);
            return NextResponse.json({ error: "Verification failed" }, { status: 400 });
        }

        // 3. Extract local orderId from sessionId
        const localOrderId = extractOrderIdFromSessionId(sessionId);
        if (!localOrderId) {
            console.error("[P24 webhook] Cannot extract orderId from sessionId:", sessionId);
            // Still ack — P24 has the money, we just can't link it locally.
            // Manual reconciliation needed.
            return NextResponse.json({ status: 200, note: "unmatched_session" });
        }

        // 4. Mark order paid (idempotent — provider may retry)
        const amountPaid = Number(amount) / 100; // P24 sends grosze, we store PLN
        const result = await markOrderPaid({
            orderId: localOrderId,
            providerOrderId: sessionId,
            provider: "p24",
            amountPaid,
        });

        if (!result.ok) {
            console.error("[P24 webhook] markOrderPaid failed:", result);
            if (result.reason === "amount_mismatch") {
                return NextResponse.json(
                    { error: "Amount mismatch", expected: result.expected, received: result.received },
                    { status: 400 }
                );
            }
            if (result.reason === "not_found") {
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }
            return NextResponse.json({ error: result.reason }, { status: 500 });
        }

        console.log(
            `[P24 webhook] ✅ ${result.status === "already_paid" ? "Already paid (idempotent)" : "Marked paid"}:`,
            localOrderId,
            { sessionId, p24OrderId: orderId, amount, methodId, statement, originAmount }
        );

        // P24 requires HTTP 200 to acknowledge
        return NextResponse.json({ status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[P24 webhook] Exception:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
