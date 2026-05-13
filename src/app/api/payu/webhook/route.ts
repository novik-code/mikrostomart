/**
 * POST /api/payu/webhook
 *
 * PayU IPN handler — verifies the OpenPayU-Signature header, looks up the
 * local order via extOrderId (which we set to our own orders.id in
 * /api/payu/create-order), then flips orders.status to 'paid' through
 * paymentWebhooks.markOrderPaid (atomic + idempotent).
 *
 * Audit P0-07 closed: previous code did
 *     if (signatureHeader && !verifyPayUSignature(...)) return 400
 * which short-circuited when the header was missing — a webhook sent
 * with no signature header would be accepted. Now any request without
 * a valid signature is rejected with 400 unconditionally.
 *
 * Status transitions handled:
 *   COMPLETED                    → markOrderPaid
 *   CANCELED                     → markOrderTerminal('cancelled')
 *   PENDING / WAITING_FOR_*      → ack only (don't mutate)
 *
 * Returns HTTP 200 with body `{ status: 200 }` on success so PayU stops
 * retrying. On a verifiable problem (bad signature, missing extOrderId,
 * amount mismatch) returns 400 + alert in logs so PayU retries — useful
 * because a retry may carry corrected data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayUConfig, verifyPayUSignature } from "@/lib/payuService";
import { markOrderPaid, markOrderTerminal } from "@/lib/paymentWebhooks";

export async function POST(request: NextRequest) {
    try {
        const config = await getPayUConfig();

        if (!config.enabled || !config.secondKey) {
            console.error("[PayU webhook] PayU not configured (missing secondKey)");
            return NextResponse.json({ error: "Not configured" }, { status: 503 });
        }

        const rawBody = await request.text();
        const signatureHeader = request.headers.get("OpenPayU-Signature");

        // S2-3 fix: ALWAYS require a signature. Previously this was a soft
        // check (`if (signatureHeader && !verify) reject`) which silently
        // accepted unsigned requests.
        if (!signatureHeader) {
            console.error("[PayU webhook] Missing OpenPayU-Signature header — rejected");
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }
        if (!verifyPayUSignature(rawBody, signatureHeader, config.secondKey)) {
            console.error("[PayU webhook] Invalid signature — rejected");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const body = JSON.parse(rawBody);
        const order = body.order;
        const status: string | undefined = order?.status;
        const payuOrderId: string | undefined = order?.orderId;
        const extOrderId: string | undefined = order?.extOrderId;
        const totalAmountGrosze: number | undefined = order?.totalAmount;

        console.log("[PayU webhook] Verified notification:", {
            payuOrderId,
            extOrderId,
            status,
            totalAmountGrosze,
        });

        if (!extOrderId) {
            console.error("[PayU webhook] Missing extOrderId in body — cannot match to local order");
            return NextResponse.json({ error: "Missing extOrderId" }, { status: 400 });
        }

        switch (status) {
            case "COMPLETED": {
                const amountPaid = Number(totalAmountGrosze ?? 0) / 100;
                const result = await markOrderPaid({
                    orderId: extOrderId,
                    providerOrderId: payuOrderId || extOrderId,
                    provider: "payu",
                    amountPaid,
                });

                if (!result.ok) {
                    console.error("[PayU webhook] markOrderPaid failed:", result);
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
                    `[PayU webhook] ✅ ${result.status === "already_paid" ? "Already paid (idempotent)" : "Marked paid"}:`,
                    extOrderId
                );
                break;
            }

            case "CANCELED":
                console.log("[PayU webhook] ❌ Payment CANCELED:", extOrderId);
                await markOrderTerminal(extOrderId, "cancelled", "payu", payuOrderId);
                break;

            case "PENDING":
            case "WAITING_FOR_CONFIRMATION":
                console.log("[PayU webhook] ⏳ Intermediate status:", status, extOrderId);
                // No DB change — keep status='pending'
                break;

            default:
                console.log("[PayU webhook] Unknown status:", status, extOrderId);
        }

        // PayU requires HTTP 200 to stop sending notifications
        return NextResponse.json({ status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[PayU webhook] Exception:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
