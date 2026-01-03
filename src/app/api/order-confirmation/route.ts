import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cart, total, customerDetails, paymentId } = body;
        const { name, email, phone, street, houseNumber, apartmentNumber, city, zipCode } = customerDetails;

        const orderDate = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

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

        // --- EMAIL CONTENT (Buyer) ---
        const buyerSubject = `Potwierdzenie zamówienia - MIKROSTOMART`;
        const buyerHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dcb14a;">Dziękujemy za zamówienie!</h1>
                <p>Cześć ${name.split(' ')[0]},</p>
                <p>Twoje zamówienie zostało przyjęte i opłacone. Wkrótce przystąpimy do jego realizacji.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Podsumowanie:</h3>
                    <ul>${itemsHtml}</ul>
                    <p style="font-size: 1.2em; font-weight: bold;">Do zapłaty: ${total} PLN (Opłacono)</p>
                </div>

                <p><strong>Adres dostawy:</strong><br/>
                ${name}<br/>
                ${addressString}</p>

                <p>W razie pytań prosimy o kontakt zwrotny na ten adres email.</p>
                <p>Pozdrawiamy,<br/>Zespół Mikrostomart</p>
            </div>
        `;

        // 2. Send Telegram
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatIds = process.env.TELEGRAM_CHAT_ID?.split(",") || [];

        if (telegramToken && telegramChatIds.length > 0) {
            const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
            await Promise.all(telegramChatIds.map(async (chatId) => {
                const cleanChatId = chatId.trim();
                if (!cleanChatId) return;
                try {
                    await fetch(tgUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: cleanChatId, text: telegramMessage, parse_mode: "HTML" }),
                    });
                } catch (e) { console.error("Telegram Error:", e); }
            }));
        }

        // 3. Send Emails (Resend)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const resend = new Resend(resendKey);
            const adminEmail = "gabinet@mikrostomart.pl";
            const fromEmail = "powiadomienia@send.mikrostomart.pl"; // Nowa, zweryfikowana domena

            // Email to Seller
            await resend.emails.send({
                from: fromEmail,
                to: adminEmail,
                subject: sellerSubject,
                html: sellerHtml
            });

            // Email to Buyer
            await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: buyerSubject,
                html: buyerHtml
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Order API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
