import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * Server-side cart total calculator + pending-order creator.
 *
 * Why this exists (audit P0-06):
 * Until S2-2 every payment route trusted `amount` from the client body.
 * `POST /api/payu/create-order { amount: 1, ... }` happily created a 1zł
 * PayU order for a cart that was really worth 3500zł. From S2-2 onward
 * the client sends `items: [{ productId, quantity, chosenPrice? }]`, the
 * server looks up prices in the `products` table, and the resulting
 * `amount_total` lives on the pending `orders` row. Payment routes pull
 * the amount from there — the client never gets to dictate it again.
 *
 * Variable-price products (vouchers): the row has `is_variable_price=true`
 * and a `min_price` floor. The client picks a denomination, sends it as
 * `chosenPrice`, and the server enforces `chosenPrice >= min_price`.
 */

export interface CartItemInput {
    /** Real product id (CartItem.originalId on the frontend — `id` there is a composite for variable-price variants) */
    productId: string;
    quantity: number;
    /** Required when the product has is_variable_price=true (e.g. vouchers). Must be >= products.min_price. */
    chosenPrice?: number;
}

export interface CartLineItem {
    productId: string;
    name: string;
    quantity: number;
    /** Server-resolved unit price in PLN */
    unitPrice: number;
    subtotal: number;
    isVariablePrice: boolean;
}

export interface CartCalculation {
    lineItems: CartLineItem[];
    total: number;
    currency: "PLN";
}

export class CartValidationError extends Error {
    constructor(public reason: string, public productId?: string) {
        super(reason);
        this.name = "CartValidationError";
    }
}

const MAX_LINE_ITEMS = 50;
const MAX_QUANTITY_PER_LINE = 100;

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function calculateCartTotal(items: CartItemInput[]): Promise<CartCalculation> {
    if (!Array.isArray(items) || items.length === 0) {
        throw new CartValidationError("Cart is empty");
    }
    if (items.length > MAX_LINE_ITEMS) {
        throw new CartValidationError(`Too many line items (max ${MAX_LINE_ITEMS})`);
    }

    const supabase = getSupabase();
    const productIds = [...new Set(items.map((i) => i.productId))];

    const { data: products, error } = await supabase
        .from("products")
        .select("id, name, price, is_variable_price, min_price, is_visible")
        .in("id", productIds);

    if (error) {
        throw new Error(`Product lookup failed: ${error.message}`);
    }

    const productMap = new Map<string, { id: string; name: string; price: number; is_variable_price: boolean; min_price: number | null; is_visible: boolean }>();
    for (const p of products || []) productMap.set(p.id, p);

    const lineItems: CartLineItem[] = [];
    let total = 0;

    for (const item of items) {
        if (!item.productId || typeof item.productId !== "string") {
            throw new CartValidationError("productId required");
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > MAX_QUANTITY_PER_LINE) {
            throw new CartValidationError(`Invalid quantity (1..${MAX_QUANTITY_PER_LINE}) for ${item.productId}`, item.productId);
        }

        const product = productMap.get(item.productId);
        if (!product) {
            throw new CartValidationError(`Product not found: ${item.productId}`, item.productId);
        }
        if (product.is_visible === false) {
            throw new CartValidationError(`Product not available: ${item.productId}`, item.productId);
        }

        let unitPrice: number;
        if (product.is_variable_price) {
            if (typeof item.chosenPrice !== "number" || !Number.isFinite(item.chosenPrice)) {
                throw new CartValidationError(
                    `chosenPrice required for variable-price product ${item.productId}`,
                    item.productId
                );
            }
            const floor = product.min_price ?? 0;
            if (item.chosenPrice < floor) {
                throw new CartValidationError(
                    `chosenPrice ${item.chosenPrice} below min_price ${floor} for ${item.productId}`,
                    item.productId
                );
            }
            unitPrice = item.chosenPrice;
        } else {
            unitPrice = Number(product.price);
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new CartValidationError(`Invalid unit price for ${item.productId}`, item.productId);
        }

        const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
        total = Math.round((total + subtotal) * 100) / 100;

        lineItems.push({
            productId: product.id,
            name: product.name,
            quantity: item.quantity,
            unitPrice,
            subtotal,
            isVariablePrice: !!product.is_variable_price,
        });
    }

    if (total <= 0) {
        throw new CartValidationError("Total must be positive");
    }

    return { lineItems, total, currency: "PLN" };
}

export interface PendingOrderInput {
    items: CartItemInput[];
    /** Optional customer details captured at checkout (name, address, phone, email). */
    customerDetails?: Record<string, unknown>;
}

export interface PendingOrder {
    orderId: string;
    idempotencyKey: string;
    amountTotal: number;
    lineItems: CartLineItem[];
    currency: "PLN";
}

/**
 * Compute the cart total and persist a `status='pending'` order row. The
 * caller (payment route) hands the returned `orderId` to the provider, then
 * stores the provider order id back on the same row via `attachProviderOrder`.
 *
 * The `idempotencyKey` is generated server-side as a UUID and stored on the
 * row's UNIQUE index. Clients that retry the same submit can pass the key
 * back on a subsequent /api/cart/calculate-total call, but for now we just
 * generate fresh every time (S2-2 scope).
 */
export async function createPendingOrder(input: PendingOrderInput): Promise<PendingOrder> {
    const calc = await calculateCartTotal(input.items);
    const supabase = getSupabase();
    const idempotencyKey = randomUUID();

    const { data, error } = await supabase
        .from("orders")
        .insert({
            customer_details: input.customerDetails || null,
            items: calc.lineItems,
            total_amount: calc.total, // legacy column, kept in sync for backwards compat
            amount_total: calc.total,
            status: "pending",
            idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();

    if (error || !data) {
        throw new Error(`Failed to create pending order: ${error?.message || "unknown"}`);
    }

    return {
        orderId: data.id,
        idempotencyKey,
        amountTotal: calc.total,
        lineItems: calc.lineItems,
        currency: calc.currency,
    };
}

/**
 * Look up an existing pending order by id. Throws if not found, not pending,
 * or if the amount looks wrong (defense against an attacker who created the
 * row, then tried to pay against it after admin-side mutation).
 */
export async function loadPendingOrder(orderId: string): Promise<{ amountTotal: number; status: string; items: unknown }> {
    if (!orderId) throw new CartValidationError("orderId required");
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("orders")
        .select("id, status, amount_total, items")
        .eq("id", orderId)
        .single();

    if (error || !data) {
        throw new CartValidationError(`Order not found: ${orderId}`);
    }
    if (data.status !== "pending") {
        throw new CartValidationError(`Order ${orderId} is not pending (status=${data.status})`);
    }
    const amount = Number(data.amount_total);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new CartValidationError(`Order ${orderId} has invalid amount_total`);
    }
    return { amountTotal: amount, status: data.status, items: data.items };
}

/**
 * Record the provider-side identifier (Stripe PaymentIntent id / PayU
 * orderId / P24 sessionId) on the pending order. Called by each create
 * route right after the provider returns its id. The status stays 'pending'
 * — it only flips to 'paid' from a verified webhook (S2-3).
 */
export async function attachProviderOrder(opts: {
    orderId: string;
    paymentProvider: "stripe" | "payu" | "p24";
    providerOrderId: string;
}): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
        .from("orders")
        .update({
            payment_provider: opts.paymentProvider,
            provider_order_id: opts.providerOrderId,
        })
        .eq("id", opts.orderId);
    if (error) {
        // Non-fatal — the payment was created on the provider side, we just
        // failed to link it locally. S2-3 webhook will still match by amount
        // + provider_order_id once we receive it.
        console.error("[cartCalculator] attachProviderOrder failed:", error);
    }
}
