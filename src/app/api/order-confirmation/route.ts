import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';
import { getEmailTemplate } from '@/lib/emailTemplates';
import { demoSanitize, brand } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cart, total, customerDetails, paymentId, locale: requestLocale } = body;
        const { name, email, phone, street, houseNumber, apartmentNumber, city, zipCode } = customerDetails;
        const locale = ['pl', 'en', 'de', 'ua'].includes(requestLocale) ? requestLocale : 'pl';

        const orderDate = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

        // 0. Save to Database (Supabase)
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
            // Use Service Role Key for writing to DB (bypassing RLS if necessary for public writes, though mostly safe here server-side)
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { error: dbError } = await supabase.from('orders').insert({
                    customer_details: customerDetails,
                    items: cart,
                    total_amount: total,
                    status: 'paid',
                    payment_id: paymentId,
                    created_at: new Date().toISOString()
                });

                if (dbError) {
                    console.error("Supabase Order Insert Error:", dbError);
                    // Don't fail the request, just log it. The payment is done.
                } else {
                    console.log("Order saved to Supabase successfully.");
                }
            }
        } catch (dbEx) {
            console.error("Database save exception:", dbEx);
        }

        // 1. Prepare Content
        const itemsList = cart.map((item: any) => `- ${item.name} (${item.quantity || 1} szt.) - ${item.price} PLN`).join('\n');
        const itemsHtml = cart.map((item: any) => `<li>${item.name} (<strong>${item.quantity || 1} szt.</strong>) - ${item.price} PLN</li>`).join('');

        const addressString = `${street} ${houseNumber}${apartmentNumber ? '/' + apartmentNumber : ''}, ${zipCode} ${city}`;

        // --- TELEGRAM MESSAGE (Seller) ---
        const telegramMessage = `🛒 <b>NOWE ZAMÓWIENIE</b>\n\n` +
            `💰 <b>Kwota:</b> ${total} PLN\n` +
            `👤 <b>Klient:</b> ${name}\n` +
            `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
            `📧 <b>Email:</b> ${email}\n` +
            `🏠 <b>Adres:</b> ${addressString}\n\n` +
            `📦 <b>Produkty:</b>\n${itemsList}\n\n` +
            `💳 <b>ID Płatności:</b> ${paymentId}`;

        // --- EMAIL CONTENT (Seller) ---
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
            <p><small>ID Płatności: ${paymentId}</small></p>
        `;

        // --- EMAIL CONTENT (Buyer - localized) ---
        const firstName = name.split(' ')[0];
        const addressString2 = `${street} ${houseNumber}${apartmentNumber ? '/' + apartmentNumber : ''}, ${zipCode} ${city}`;
        const buyerEmail = getEmailTemplate('order_confirmation', locale, {
            firstName,
            itemsHtml,
            total: String(total),
            customerName: name,
            address: addressString2,
        });
        const buyerSubject = buyerEmail.subject;
        const buyerHtml = buyerEmail.html;

        // 2. Send Telegram
        await sendTelegramNotification(telegramMessage, 'default');

        // Push notification to admin
        broadcastPush('admin', 'new_order', { name, total: String(total) }, '/admin').catch(console.error);
        broadcastPush('employee', 'new_order', { name, total: String(total) }, '/pracownik').catch(console.error);

        // 3. Send Emails (Resend)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const adminEmail = demoSanitize('gabinet@mikrostomart.pl');

            // Email to Seller
            await sendEmail({
                from: brand.notificationEmail,
                to: adminEmail,
                subject: sellerSubject,
                html: sellerHtml,
            });

            // Email to Buyer
            await sendEmail({
                from: brand.notificationEmail,
                to: email,
                subject: buyerSubject,
                html: buyerHtml,
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Order API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
