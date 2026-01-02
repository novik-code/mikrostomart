import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, name, email, phone, message, service, date } = body;

        // 1. Prepare Message Content
        let telegramMessage = "";
        let emailSubject = "";
        let emailHtml = "";

        if (type === "reservation") {
            // Telegram Content
            telegramMessage = `🔔 <b>NOWA REZERWACJA</b>\n\n` +
                `👤 <b>Pacjent:</b> ${name}\n` +
                `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
                `🏥 <b>Usługa:</b> ${service}\n` +
                `📅 <b>Data:</b> ${date}\n` +
                (email ? `✉️ <b>Email:</b> ${email}` : "");

            // Email Content
            emailSubject = `Nowa Rezerwacja: ${name}`;
            emailHtml = `
                <h1>Nowa Rezerwacja Wizyty</h1>
                <p><strong>Imię i Nazwisko:</strong> ${name}</p>
                <p><strong>Telefon:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email || "Brak"}</p>
                <p><strong>Usługa:</strong> ${service}</p>
                <p><strong>Data:</strong> ${date}</p>
            `;
        } else if (type === "contact") {
            // Telegram Content
            telegramMessage = `📩 <b>NOWA WIADOMOŚĆ</b>\n\n` +
                `👤 <b>Imię:</b> ${name}\n` +
                `✉️ <b>Email:</b> ${email}\n\n` +
                `📝 <b>Treść:</b>\n${message}`;

            // Email Content
            emailSubject = `Nowa Wiadomość: ${name}`;
            emailHtml = `
                <h1>Nowa Wiadomość ze Strony</h1>
                <p><strong>Imię:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Wiadomość:</strong><br/>${message}</p>
            `;
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        // 2. Try Telegram Notification
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        let telegramSent = false;

        if (telegramToken && telegramChatId) {
            try {
                const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
                const tgRes = await fetch(tgUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: telegramChatId,
                        text: telegramMessage,
                        parse_mode: "HTML"
                    }),
                });

                if (!tgRes.ok) {
                    console.error("Telegram Error:", await tgRes.text());
                } else {
                    telegramSent = true;
                    console.log("Telegram notification sent!");
                }
            } catch (tgErr) {
                console.error("Failed to send Telegram notification:", tgErr);
            }
        }

        // 3. Try Email Notification (Resend) or Mock
        const resendKey = process.env.RESEND_API_KEY;
        let emailSent = false;

        if (resendKey) {
            const resend = new Resend(resendKey);
            const adminEmail = "marcinnowosielski@gmail.com";
            const fromEmail = "onboarding@resend.dev";

            await resend.emails.send({
                from: fromEmail,
                to: adminEmail,
                subject: emailSubject,
                html: emailHtml,
            });
            emailSent = true;
        } else {
            // Mock Mode Logging
            console.log("--- [MOCK EMAIL] (No RESEND_API_KEY) ---");
            console.log("Subject:", emailSubject);
            console.log("----------------------------------------");
        }

        return NextResponse.json({
            success: true,
            telegram: telegramSent,
            email: emailSent
        });

    } catch (error: any) {
        console.error("Contact API Error:", error);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}
