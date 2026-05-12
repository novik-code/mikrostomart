import { NextRequest, NextResponse } from "next/server";
import { createPendingOrder, CartValidationError, type CartItemInput } from "@/lib/cartCalculator";

/**
 * POST /api/cart/calculate-total
 *
 * Step 1 of the new checkout flow (S2-2). The client sends the cart as
 * `{ items: [{ productId, quantity, chosenPrice? }], customerDetails? }`
 * — never an `amount`. The server looks up prices in the `products`
 * table, computes the total, and persists a `status='pending'` order
 * row whose `amount_total` is the source of truth for the next step
 * (Stripe/PayU/P24 create routes pull the amount from there).
 *
 * Variable-price products (vouchers): include `chosenPrice` on the item.
 * The server enforces `chosenPrice >= products.min_price`. Sending a
 * lower value is rejected with 400.
 *
 * Response:
 *   {
 *     orderId: "<uuid>",
 *     idempotencyKey: "<uuid>",
 *     total: 350,
 *     lineItems: [{ productId, name, quantity, unitPrice, subtotal, isVariablePrice }],
 *     currency: "PLN"
 *   }
 *
 * Auth: public (anyone can compute their cart). The order row exists in
 * 'pending' state and only flips to 'paid' via a verified provider webhook
 * (S2-3), so creating throwaway pending orders is harmless beyond row count.
 */
export async function POST(req: NextRequest) {
    let body: { items?: CartItemInput[]; customerDetails?: Record<string, unknown> };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || !Array.isArray(body.items)) {
        return NextResponse.json({ error: "items[] required" }, { status: 400 });
    }

    try {
        const pending = await createPendingOrder({
            items: body.items,
            customerDetails: body.customerDetails,
        });
        return NextResponse.json({
            orderId: pending.orderId,
            idempotencyKey: pending.idempotencyKey,
            total: pending.amountTotal,
            lineItems: pending.lineItems,
            currency: pending.currency,
        });
    } catch (err: unknown) {
        if (err instanceof CartValidationError) {
            return NextResponse.json(
                { error: err.message, productId: err.productId },
                { status: 400 }
            );
        }
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[CartCalculate] Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
