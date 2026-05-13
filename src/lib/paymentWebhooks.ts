import { createClient } from "@supabase/supabase-js";

/**
 * Shared helpers for the three payment-provider webhooks (Stripe / PayU / P24).
 *
 * Each webhook is responsible for verifying its own provider-specific signature
 * BEFORE calling anything in this module. By the time we reach `markOrderPaid`
 * the caller has already proven the event is authentic.
 *
 * Responsibilities here:
 *   - Look up the local order by provider_order_id
 *   - Compare amount paid against amount_total (tolerance 0)
 *   - Update orders.status atomically with the optimistic
 *     `.eq('status', 'pending')` guard so a second webhook (provider retry)
 *     becomes a no-op rather than overwriting a paid row
 *   - Return a small typed result so callers can branch on outcome without
 *     parsing strings
 *
 * Closes audit P0-07: payment status now flips to 'paid' ONLY when a verified
 * webhook event arrives with matching amount. The S2-2 → S2-3 bridge in
 * /api/order-confirmation is removed in this sprint.
 */

export type PaymentProvider = "stripe" | "payu" | "p24";

export interface MarkOrderPaidInput {
    /** Local orders.id — usually retrieved by the caller via provider_order_id lookup. */
    orderId: string;
    /** Provider-side id (Stripe PI / PayU orderId / P24 sessionId), persisted back if missing. */
    providerOrderId: string;
    provider: PaymentProvider;
    /** Amount the provider says was actually paid, in PLN (decimal, e.g. 350.00). */
    amountPaid: number;
}

export type MarkOrderPaidResult =
    | { ok: true; status: "paid"; orderId: string }
    | { ok: true; status: "already_paid"; orderId: string } // idempotent retry
    | { ok: false; reason: "not_found"; orderId: string }
    | { ok: false; reason: "amount_mismatch"; orderId: string; expected: number; received: number }
    | { ok: false; reason: "invalid_state"; orderId: string; state: string }
    | { ok: false; reason: "db_error"; orderId: string; message: string };

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function markOrderPaid(input: MarkOrderPaidInput): Promise<MarkOrderPaidResult> {
    const supabase = getSupabase();

    // 1. Look up the order. Use a single SELECT so we can do the amount check
    //    in code (the CHECK constraint already validates the status enum).
    const { data: order, error: lookupErr } = await supabase
        .from("orders")
        .select("id, status, amount_total, amount_paid, provider_order_id, payment_provider")
        .eq("id", input.orderId)
        .maybeSingle();

    if (lookupErr || !order) {
        return { ok: false, reason: "not_found", orderId: input.orderId };
    }

    // 2. Idempotency: provider retries are expected (PayU can fire IPN multiple
    //    times for the same event, P24 too). If we've already marked paid,
    //    just acknowledge — never error.
    if (order.status === "paid") {
        return { ok: true, status: "already_paid", orderId: input.orderId };
    }

    // 3. Only transition from pending. Any other state (failed/refunded/cancelled)
    //    is a flow bug — reject loudly so we see it in logs.
    if (order.status !== "pending") {
        return { ok: false, reason: "invalid_state", orderId: input.orderId, state: order.status };
    }

    // 4. Amount must match. Server-side amount_total is the source of truth
    //    (server computed it from products table in S2-2). Tolerance is zero —
    //    a difference of even a grosz means someone tampered with the redirect.
    const expected = Number(order.amount_total);
    const received = Number(input.amountPaid);
    if (!Number.isFinite(expected) || !Number.isFinite(received) || Math.abs(expected - received) > 0.001) {
        return {
            ok: false,
            reason: "amount_mismatch",
            orderId: input.orderId,
            expected,
            received,
        };
    }

    // 5. Optimistic UPDATE — `.eq('status', 'pending')` ensures a race against
    //    a parallel webhook doesn't double-write. If the row is no longer
    //    pending we treat it as already_paid.
    const { data: updated, error: updateErr } = await supabase
        .from("orders")
        .update({
            status: "paid",
            amount_paid: received,
            payment_provider: input.provider,
            provider_order_id: input.providerOrderId,
        })
        .eq("id", input.orderId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

    if (updateErr) {
        return { ok: false, reason: "db_error", orderId: input.orderId, message: updateErr.message };
    }
    if (!updated) {
        // Another webhook beat us to it
        return { ok: true, status: "already_paid", orderId: input.orderId };
    }

    return { ok: true, status: "paid", orderId: input.orderId };
}

/**
 * Mark an order as failed/cancelled (provider explicitly rejected the payment).
 * Idempotent — repeated calls are no-ops once the row is in a terminal state.
 */
export async function markOrderTerminal(
    orderId: string,
    finalStatus: "failed" | "cancelled",
    provider: PaymentProvider,
    providerOrderId?: string
): Promise<void> {
    const supabase = getSupabase();
    await supabase
        .from("orders")
        .update({
            status: finalStatus,
            payment_provider: provider,
            ...(providerOrderId ? { provider_order_id: providerOrderId } : {}),
        })
        .eq("id", orderId)
        .eq("status", "pending"); // never overwrite a successful payment
}

/**
 * Look up an order by provider_order_id (Stripe PI id / PayU orderId / P24
 * sessionId). Used by webhooks that don't carry our local orderId directly.
 */
export async function findOrderByProviderId(
    providerOrderId: string,
    provider: PaymentProvider
): Promise<{ orderId: string; amountTotal: number } | null> {
    if (!providerOrderId) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("orders")
        .select("id, amount_total")
        .eq("provider_order_id", providerOrderId)
        .eq("payment_provider", provider)
        .maybeSingle();
    if (error || !data) return null;
    return { orderId: data.id, amountTotal: Number(data.amount_total) };
}
