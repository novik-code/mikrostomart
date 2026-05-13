import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramNotification } from "@/lib/telegram";
import { broadcastPush } from "@/lib/pushService";
import { getEmailTemplate } from "@/lib/emailTemplates";
import { demoSanitize, brand } from "@/lib/brandConfig";
import { sendEmail } from "@/lib/emailSender";

export const runtime = "nodejs";

/**
 * POST /api/order-confirmation
 *
 * Read-only on `orders` — only side effects (email, Telegram, push).
 * Called from the return URL on /platnosc and from CheckoutForm.handle
 * PaymentSuccess. Both pollers may hit this endpoint several times
 * around the moment a verified webhook flips status='paid' (S2-3); to
 * avoid sending duplicate emails we acquire a lock through
 *   UPDATE orders SET notified_at = NOW() WHERE id = $1 AND notified_at IS NULL
 * — exactly one caller gets the row back; everyone else gets a 200 with
 * `alreadyNotified: true` and skips the side-effects.
 *
 * Body: { orderId: string, locale?: string }
 *
 * Responses:
 *   200 { success: true,  orderId, status: 'paid' }              first poll, side-effects fired
 *   200 { success: true,  orderId, status: 'paid', alreadyNotified: true }  later polls
 *   202 { success: false, pending: true, orderId }              webhook hasn't arrived yet
 *   200 { success: false, status: 'failed'|'cancelled' }        terminal non-success
 *   400/404 on input problems
 *
 * What used to write to orders (S2-2): nothing now. The S2-2 bridge
 * (set paid here) was removed in S2-3. The legacy `customerDetails`
 * upsert from this endpoint was removed in S2-4 — orders.customer_details
 * is captured during /api/cart/calculate-total when the row is first
 * inserted.
 *
 * Audit P0-06 fully closed: this endpoint never mutates status or
 * customer fields and cannot be used to forge an order. The only state
 * change here is `notified_at` (timestamp-only, used purely for email
 * idempotency).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { orderId, locale: requestLocale } = body as {
            orderId?: string;
            locale?: string;
        };

        if (!orderId) {
            return NextResponse.json({ error: "orderId required" }, { status: 400 });
        }

        const locale = (["pl", "en", "de", "ua"] as const).includes(requestLocale as "pl") ? requestLocale! : "pl";

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseKey) {
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: order, error: lookupError } = await supabase
            .from("orders")
            .select("id, status, amount_total, amount_paid, items, customer_details, payment_provider, provider_order_id, created_at, notified_at")
            .eq("id", orderId)
            .single();

        if (lookupError || !order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.status === "pending") {
            // Webhook hasn't fired yet — frontend will retry (10× × 2s in
            // /platnosc and CheckoutForm).
            return NextResponse.json(
                {
                    success: false,
                    pending: true,
                    message: "Czekam na potwierdzenie z bramki płatności",
                    orderId,
                },
                { status: 202 }
            );
        }

        if (order.status === "failed" || order.status === "cancelled") {
            return NextResponse.json(
                { success: false, status: order.status, orderId },
                { status: 200 }
            );
        }

        if (order.status !== "paid") {
            return NextResponse.json({ error: `Unexpected status: ${order.status}` }, { status: 400 });
        }

        // ── Idempotency lock — first poll wins the race ─────────────────────
        // Two atomic guarantees:
        //   1. WHERE notified_at IS NULL  →  parallel polls see UPDATE return
        //      zero rows for everyone but one.
        //   2. status = 'paid' check above is loaded before the UPDATE, but
        //      the UPDATE itself doesn't re-check status — that's fine, status
        //      transitions paid → refunded happen only via S8 admin actions,
        //      which won't race against notify polling.
        const { data: locked, error: lockErr } = await supabase
            .from("orders")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", orderId)
            .is("notified_at", null)
            .select("id")
            .maybeSingle();

        if (lockErr) {
            console.error("[OrderConfirm] notified_at lock failed:", lockErr);
            return NextResponse.json({ error: "Lock failed" }, { status: 500 });
        }

        if (!locked) {
            // Another poll already sent the notifications. Tell the frontend
            // we're done — success page can render the thank-you.
            return NextResponse.json({ success: true, orderId, status: "paid", alreadyNotified: true });
        }

        // ── status === 'paid' AND we hold the lock — send notifications ──────
        const customerDetails = (order.customer_details || {}) as Record<string, string>;
        const cart = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
        const total = Number(order.amount_paid ?? order.amount_total ?? 0);
        const orderDate = new Date(order.created_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

        const {
            name = "Klient",
            email = "",
            phone = "",
            street = "",
            houseNumber = "",
            apartmentNumber = "",
            city = "",
            zipCode = "",
        } = customerDetails;

        const itemsList = cart
            .map((item) => `- ${item.name} (${(item.quantity as number) || 1} szt.) - ${item.unitPrice || item.price} PLN`)
            .join("\n");
        const itemsHtml = cart
            .map((item) => `<li>${item.name} (<strong>${(item.quantity as number) || 1} szt.</strong>) - ${item.unitPrice || item.price} PLN</li>`)
            .join("");
        const addressString = `${street} ${houseNumber}${apartmentNumber ? "/" + apartmentNumber : ""}, ${zipCode} ${city}`.trim();

        const paymentRef = order.provider_order_id || orderId;

        const telegramMessage =
            `🛒 <b>NOWE ZAMÓWIENIE</b>\n\n` +
            `💰 <b>Kwota:</b> ${total} PLN\n` +
            `👤 <b>Klient:</b> ${name}\n` +
            `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
            `📧 <b>Email:</b> ${email}\n` +
            `🏠 <b>Adres:</b> ${addressString}\n\n` +
            `📦 <b>Produkty:</b>\n${itemsList}\n\n` +
            `💳 <b>ID Płatności:</b> ${paymentRef}`;

        const sellerSubject = `Nowe Zamówienie: ${name} (${total} PLN)`;
        const sellerHtml = `
            <h1>Nowe Zamówienie w Sklepie</h1>
            <p><strong>Data:</strong> ${orderDate}</p>
            <p><strong>Klient:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefon:</strong> ${phone}</p>
            <p><strong>Adres:</strong> ${addressString}</p>
            <hr />
            <h3>Zamówione produkty:</h3>
            <ul>${itemsHtml}</ul>
            <p><strong>Łącznie: ${total} PLN</strong></p>
            <p><small>ID Płatności: ${paymentRef}</small></p>
        `;

        const firstName = name.split(" ")[0];
        const buyerEmail = getEmailTemplate("order_confirmation", locale, {
            firstName,
            itemsHtml,
            total: String(total),
            customerName: name,
            address: addressString,
        });

        await sendTelegramNotification(telegramMessage, "default");

        broadcastPush("admin", "new_order", { name, total: String(total) }, "/admin").catch(console.error);
        broadcastPush("employee", "new_order", { name, total: String(total) }, "/pracownik").catch(console.error);

        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const adminEmail = demoSanitize("gabinet@mikrostomart.pl");
            await sendEmail({
                from: brand.notificationEmail,
                to: adminEmail,
                subject: sellerSubject,
                html: sellerHtml,
            });
            if (email) {
                await sendEmail({
                    from: brand.notificationEmail,
                    to: email,
                    subject: buyerEmail.subject,
                    html: buyerEmail.html,
                });
            }
        }

        return NextResponse.json({ success: true, orderId, status: "paid" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown";
        console.error("Order API Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
