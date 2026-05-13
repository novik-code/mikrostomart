/**
 * POST /api/stripe-webhook
 *
 * Stripe events handler — verifies the `Stripe-Signature` header via
 * `stripe.webhooks.constructEvent` and flips orders.status accordingly.
 *
 * Setup (Marcin manual, see PLAN_HOTFIX_STATUS.md S2-3):
 *   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
 *      URL:    https://www.mikrostomart.pl/api/stripe-webhook
 *              ^^^ www IS MANDATORY. apex mikrostomart.pl returns
 *              307 → www, and Stripe webhooks do NOT follow redirects
 *              for POST (would lose body integrity for the signature).
 *              Make sure the Stripe dashboard "Test mode" toggle
 *              (top-right) matches the mode you intend to receive
 *              events from — live and test webhooks are separate lists.
 *      Events: payment_intent.succeeded, payment_intent.payment_failed,
 *              payment_intent.canceled
 *   2. Copy the Signing secret (whsec_...)
 *   3. Either paste it into /admin → Stripe → Webhook Signing Secret
 *      (S2-3-bis, DB-first) OR set Vercel env var STRIPE_WEBHOOK_SECRET
 *      on both projects (mikrostomart + densflow-demo) ×
 *      Production + Preview.
 *
 * We use the live config from getStripeConfig() for the API secret key,
 * but the WEBHOOK signing secret stays in env vars: it's a separate
 * value, rotated separately, and Stripe Dashboard is the only source.
 *
 * orderId lookup: we attach `metadata.orderId` to every PaymentIntent we
 * create (S2-2's /api/create-payment-intent). The webhook reads it back
 * to find the local order.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeConfig } from "@/lib/stripeService";
import { markOrderPaid, markOrderTerminal } from "@/lib/paymentWebhooks";

// Stripe requires the raw body for signature verification — no automatic JSON parse.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        console.error("[Stripe webhook] Missing stripe-signature header");
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Both secret_key (for the Stripe SDK) and webhook_secret (for
    // constructEvent) come from getStripeConfig — DB first, env fallback.
    // After S2-3-bis the admin can paste the webhook signing secret in
    // /admin → Stripe tab; before that we still read from env so existing
    // deployments keep working.
    const config = await getStripeConfig();
    if (!config.secretKey) {
        console.error("[Stripe webhook] Stripe API secret not configured");
        return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }
    if (!config.webhookSecret) {
        console.error("[Stripe webhook] Webhook signing secret not configured (DB or STRIPE_WEBHOOK_SECRET env)");
        return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    const webhookSecret = config.webhookSecret;
    const stripe = new Stripe(config.secretKey);

    let event: Stripe.Event;
    const rawBody = await req.text();
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error("[Stripe webhook] Signature verification failed:", message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded": {
                const pi = event.data.object as Stripe.PaymentIntent;
                const orderId = (pi.metadata?.orderId as string | undefined) || "";
                if (!orderId) {
                    console.error("[Stripe webhook] PI.succeeded without metadata.orderId:", pi.id);
                    // Acknowledge anyway — retrying won't fix a missing metadata
                    return NextResponse.json({ received: true, note: "missing_order_id" });
                }
                const amountPaid = pi.amount_received / 100; // PLN

                const result = await markOrderPaid({
                    orderId,
                    providerOrderId: pi.id,
                    provider: "stripe",
                    amountPaid,
                });

                if (!result.ok) {
                    console.error("[Stripe webhook] markOrderPaid failed:", result);
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
                    `[Stripe webhook] ✅ ${result.status === "already_paid" ? "Already paid (idempotent)" : "Marked paid"}:`,
                    orderId,
                    pi.id
                );
                break;
            }

            case "payment_intent.payment_failed": {
                const pi = event.data.object as Stripe.PaymentIntent;
                const orderId = (pi.metadata?.orderId as string | undefined) || "";
                if (orderId) {
                    await markOrderTerminal(orderId, "failed", "stripe", pi.id);
                    console.log("[Stripe webhook] ❌ Payment failed:", orderId, pi.id);
                }
                break;
            }

            case "payment_intent.canceled": {
                const pi = event.data.object as Stripe.PaymentIntent;
                const orderId = (pi.metadata?.orderId as string | undefined) || "";
                if (orderId) {
                    await markOrderTerminal(orderId, "cancelled", "stripe", pi.id);
                    console.log("[Stripe webhook] 🚫 Payment cancelled:", orderId, pi.id);
                }
                break;
            }

            default:
                console.log("[Stripe webhook] Unhandled event:", event.type, event.id);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe webhook] Handler exception:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
