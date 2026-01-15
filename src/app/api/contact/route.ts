import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, name, email, phone, message, service, date, time, specialistName, subject, attachment, description } = body;

        // 1. Prepare Message Content
        let telegramMessage = "";
        let emailSubject = "";
        let emailHtml = "";

        // Prepare attachments array for Resend
        let emailAttachments: any[] = [];
        if (attachment) {
            // attachment = { name: "file.jpg", content: "data:image/jpeg;base64,...", type: "image/jpeg" }
            const base64Content = attachment.content.split(',')[1];
            if (base64Content) {
                emailAttachments.push({
                    filename: attachment.name,
                    content: Buffer.from(base64Content, 'base64'),
                });
            }
        }


        if (type === "reservation") {
            // Telegram Content
            telegramMessage = `🔔 <b>NOWA REZERWACJA</b>\n\n` +
                `👤 <b>Pacjent:</b> ${name}\n` +
                `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
                `👨‍⚕️ <b>Specjalista:</b> ${specialistName}\n` +
                `🏥 <b>Usługa:</b> ${service}\n` +
                `📅 <b>Data:</b> ${date}\n` +
                `⏰ <b>Godzina:</b> ${time}\n` +
                (email ? `✉️ <b>Email:</b> ${email}\n` : "") +
                (description ? `📝 <b>Opis:</b> ${description}\n` : "") +
                (emailAttachments.length > 0 ? `\n📎 <i>Załączono zdjęcie (sprawdź maila)</i>` : "");

            // Email Content
            emailSubject = `Nowa Rezerwacja: ${name}`;
            emailHtml = `
                <h1>Nowa Rezerwacja Wizyty</h1>
                <p><strong>Imię i Nazwisko:</strong> ${name}</p>
                <p><strong>Telefon:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email || "Brak"}</p>
                <p><strong>Specjalista:</strong> ${specialistName}</p>
                <p><strong>Usługa:</strong> ${service}</p>
                <p><strong>Data:</strong> ${date}</p>
                <p><strong>Godzina:</strong> ${time}</p>
                ${description ? `<p><strong>Opis problemu:</strong><br/>${description}</p>` : ""}
            `;

            // 1.5 Save to Supabase
            try {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

                if (supabaseKey) {
                    const supabase = createClient(supabaseUrl, supabaseKey);
                    const { error: dbError } = await supabase.from('reservations').insert({
                        name,
                        phone,
                        email,
                        specialist: specialistName,
                        service,
                        date,
                        time,
                        description,
                        status: 'pending'
                    });
                    if (dbError) console.error("Supabase Reservation Insert Error:", dbError);
                    else console.log("Reservation saved to Supabase.");
                }
            } catch (err) {
                console.error("Database save exception:", err);
            }

            // ... (CSV Logging remains here) ...

        } else if (type === "contact") {
            // Telegram Content
            telegramMessage = `📩 <b>NOWA WIADOMOŚĆ</b>\n\n` +
                `👤 <b>Imię:</b> ${name}\n` +
                `✉️ <b>Email:</b> ${email}\n` +
                `📌 <b>Temat:</b> ${subject || "Bez tematu"}\n\n` +
                `📝 <b>Treść:</b>\n${message}`;

            if (emailAttachments.length > 0) {
                telegramMessage += `\n\n📎 <i>Załącznik wysłano na maila</i>`;
            }

            // Email Content
            emailSubject = `[Kontakt] ${subject || "Nowa Wiadomość"}: ${name}`;
            emailHtml = `
                <h1>Nowa Wiadomość ze Strony</h1>
                <p><strong>Imię:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temat:</strong> ${subject}</p>
                <p><strong>Wiadomość:</strong><br/>${message}</p>
            `;
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        // 2. Try Telegram Notification
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatIds = process.env.TELEGRAM_CHAT_ID?.split(",") || [];
        let telegramSent = false;

        if (telegramToken && telegramChatIds.length > 0) {
            try {
                const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

                const notifications = telegramChatIds.map(async (chatId) => {
                    const cleanChatId = chatId.trim();
                    if (!cleanChatId) return;

                    const tgRes = await fetch(tgUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: cleanChatId,
                            text: telegramMessage,
                            parse_mode: "HTML"
                        }),
                    });

                    if (!tgRes.ok) {
                        console.error(`Telegram Error (${cleanChatId}):`, await tgRes.text());
                    } else {
                        telegramSent = true; // Mark true if at least one succeeds
                        console.log(`Telegram notification sent to ${cleanChatId}!`);
                    }
                });

                await Promise.all(notifications);

            } catch (tgErr) {
                console.error("Failed to send Telegram notification:", tgErr);
            }
        }

        // 3. Try Email Notification (Resend) or Mock
        const resendKey = process.env.RESEND_API_KEY;
        let emailSent = false;

        if (resendKey) {
            const resend = new Resend(resendKey);
            const adminEmail = "gabinet@mikrostomart.pl";
            const fromEmail = "onboarding@resend.dev";

            await resend.emails.send({
                from: fromEmail,
                to: adminEmail,
                subject: emailSubject,
                html: emailHtml,
                attachments: emailAttachments
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
