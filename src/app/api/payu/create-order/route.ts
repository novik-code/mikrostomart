/**
 * POST /api/payu/create-order
 *
 * Step 2 of the S2-2 checkout flow for PayU. Client posts
 * `{ orderId, email, firstName, lastName, description? }` — NOT an
 * amount. The server loads the pending order, uses `amount_total` as
 * the source of truth (in grosze), creates the PayU order, and links
 * the PayU orderId back via `provider_order_id`. Status stays 'pending'
 * until the S2-3 webhook verifies the OpenPayU-Signature header.
 *
 * Response: { redirectUrl, payuOrderId, orderId }
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayUConfig, getPayUToken, getPayUBaseUrl } from "@/lib/payuService";
import { attachProviderOrder, CartValidationError, loadPendingOrder } from "@/lib/cartCalculator";

export async function POST(request: NextRequest) {
    try {
        const config = await getPayUConfig();

        if (!config.enabled || !config.posId || !config.clientId || !config.clientSecret) {
            return NextResponse.json({ error: "PayU not configured" }, { status: 503 });
        }

        const body = await request.json().catch(() => ({}));
        const { orderId, email, firstName, lastName, description } = body as {
            orderId?: string;
            email?: string;
            firstName?: string;
            lastName?: string;
            description?: string;
        };

        if (!orderId || !email) {
            return NextResponse.json(
                { error: "orderId i email są wymagane (wywołaj najpierw /api/cart/calculate-total)" },
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

        const customerIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
        const token = await getPayUToken(config);
        const baseUrl = getPayUBaseUrl(config.sandbox);
        const amountInGrosze = Math.round(pending.amountTotal * 100);

        const protocol = request.headers.get("x-forwarded-proto") || "https";
        const host = request.headers.get("host") || request.nextUrl.host;
        const appUrl = `${protocol}://${host}`;

        const orderBody = {
            notifyUrl: `${appUrl}/api/payu/webhook`,
            continueUrl: `${appUrl}/platnosc?status=return&provider=payu&orderId=${orderId}`,
            customerIp,
            merchantPosId: config.posId,
            description: description || "Płatność DensFlow",
            currencyCode: "PLN",
            totalAmount: amountInGrosze,
            extOrderId: orderId,
            buyer: {
                email,
                firstName: firstName || "Klient",
                lastName: lastName || "DensFlow",
                language: "pl",
            },
            products: [
                {
                    name: description || "Zadatek za wizytę",
                    unitPrice: amountInGrosze,
                    quantity: 1,
                },
            ],
        };

        const res = await fetch(`${baseUrl}/api/v2_1/orders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(orderBody),
            redirect: "manual",
        });

        const status = res.status;
        if (status === 302 || status === 201 || status === 200) {
            const data = await res.text();
            let redirectUrl = res.headers.get("location");
            let payuOrderId = "";
            try {
                const json = JSON.parse(data);
                payuOrderId = json.orderId || "";
                if (json.redirectUri) redirectUrl = json.redirectUri;
            } catch {
                /* if not JSON, ignore */
            }

            if (redirectUrl) {
                if (payuOrderId) {
                    await attachProviderOrder({
                        orderId,
                        paymentProvider: "payu",
                        providerOrderId: payuOrderId,
                    });
                }
                return NextResponse.json({ redirectUrl, payuOrderId, orderId });
            }
        }

        const err = await res.text();
        console.error("[PayU create-order] Error:", res.status, err);
        return NextResponse.json({ error: `PayU error ${res.status}: ${err}` }, { status: 400 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[PayU create-order] Exception:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
