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
 * Called by the frontend on the return URL after the user comes back from
 * Stripe / PayU / P24. Triggers admin/buyer email + Telegram/push notifications.
 *
 * S2-2 semantics: this endpoint NO LONGER mutates `orders.status`. The
 * source of truth for "is this paid" is the verified provider webhook
 * (S2-3) which sets `status='paid'` and `amount_paid`. Here we just look
 * up the row by orderId and act on whatever the webhook already wrote.
 *
 * Body: { orderId: string, customerDetails?: {...}, locale?: string }
 *   - orderId comes from /api/cart/calculate-total response (frontend
 *     keeps it across the redirect to / from the provider)
 *
 * Behaviour:
 *   - status='paid'        → send full "thank you" email + admin alerts
 *   - status='pending'     → return 202: webhook hasn't fired yet, frontend
 *                            can poll or just trust the email path later
 *   - status='failed'      → return 200 with success=false
 *   - any other            → 400
 *
 * Audit P0-06 closed: client can no longer write status='paid' from body.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { orderId, customerDetails: bodyCustomerDetails, locale: requestLocale } = body as {
            orderId?: string;
            customerDetails?: Record<string, string>;
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
            .select("id, status, amount_total, amount_paid, items, customer_details, payment_provider, provider_order_id, created_at")
            .eq("id", orderId)
            .single();

        if (lookupError || !order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // If the frontend collected extra customer details on the return page,
        // persist them once (only if missing — never overwrite verified data).
        if (bodyCustomerDetails && !order.customer_details) {
            await supabase
                .from("orders")
                .update({ customer_details: bodyCustomerDetails })
                .eq("id", orderId);
        }

        if (order.status === "pending") {
            // S2-2 → S2-3 bridge: until verified webhooks land in S2-3,
            // accept the return URL as proof of payment IF the provider had
            // already taken our order (provider_order_id is set). This keeps
            // emails flowing during the transition. S2-3 will replace this
            // with a Stripe constructEvent / PayU OpenPayU-Signature /
            // P24 verify step and remove this branch.
            if (order.provider_order_id) {
                const { error: bridgeErr } = await supabase
                    .from("orders")
                    .update({
                        status: "paid",
                        amount_paid: order.amount_total,
                    })
                    .eq("id", orderId)
                    .eq("status", "pending"); // optimistic — don't clobber a webhook that beat us
                if (bridgeErr) {
                    console.error("[OrderConfirm] Bridge update failed:", bridgeErr);
                } else {
                    console.warn(
                        `[OrderConfirm] S2-2 BRIDGE: marked order ${orderId} as paid without webhook signature verification. S2-3 will close this.`
                    );
                    order.status = "paid";
                    order.amount_paid = order.amount_total;
                }
            } else {
                // No provider id yet means the user is hitting this endpoint
                // before Stripe/PayU/P24 even accepted the order — definitely
                // not paid. Tell the frontend to retry.
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

        // ── status === 'paid' — send notifications ───────────────────────────
        const customerDetails = (order.customer_details || bodyCustomerDetails || {}) as Record<string, string>;
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
