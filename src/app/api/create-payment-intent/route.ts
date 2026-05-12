import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeConfig } from "@/lib/stripeService";
import { attachProviderOrder, CartValidationError, loadPendingOrder } from "@/lib/cartCalculator";

/**
 * POST /api/create-payment-intent
 *
 * Step 2 of the S2-2 checkout flow. The client posts `{ orderId, email }`
 * — NOT an amount. The server loads the pending order, uses
 * `amount_total` as the source of truth, creates the Stripe
 * PaymentIntent, and links the PI id back onto the order via
 * `provider_order_id`. Status stays 'pending' until the S2-3 webhook
 * verifies the charge.
 *
 * Returns: { clientSecret, orderId, total }
 *
 * Audit: P0-06 (payment trusted client amount) is closed here. An
 * attacker who tampers with the body cannot drop the amount — there is
 * no `amount` parameter to drop.
 */
export async function POST(request: Request) {
    try {
        const config = await getStripeConfig();
        if (!config.secretKey) {
            return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
        }

        const body = await request.json().catch(() => ({}));
        const { orderId, email } = body as { orderId?: string; email?: string };

        if (!orderId) {
            return NextResponse.json(
                { error: "orderId required (call /api/cart/calculate-total first)" },
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

        const stripe = new Stripe(config.secretKey);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(pending.amountTotal * 100),
            currency: "pln",
            receipt_email: email,
            automatic_payment_methods: { enabled: true },
            metadata: { orderId },
        });

        await attachProviderOrder({
            orderId,
            paymentProvider: "stripe",
            providerOrderId: paymentIntent.id,
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            orderId,
            total: pending.amountTotal,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("create-payment-intent error:", message);
        return NextResponse.json(
            { error: `Internal Server Error: ${message}` },
            { status: 500 }
        );
    }
}
