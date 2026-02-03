import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, phone, specialist, specialistName, date, time, description, attachment } = body;

        const appointmentDate = new Date(`${date}T${time}`).toLocaleString("pl-PL", {
            timeZone: "Europe/Warsaw",
            dateStyle: "full",
            timeStyle: "short"
        });

        // Save to Database (Supabase)
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { error: dbError } = await supabase.from('reservations').insert({
                    name,
                    email,
                    phone,
                    date,
                    time,
                    specialist: specialistName,
                    service: specialistName, // For backward compatibility
                    description,
                    has_attachment: !!attachment,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

                if (dbError) {
                    console.error("Supabase Reservation Insert Error:", dbError);
                } else {
                    console.log("Reservation saved to Supabase successfully.");
                }
            }
        } catch (dbEx) {
            console.error("Database save exception:", dbEx);
        }

        // Telegram Message (Admin)
        const telegramMessage = `📅 <b>NOWA REZERWACJA</b>\n\n` +
            `🩺 <b>Specjalista:</b> ${specialistName}\n` +
            `📆 <b>Data i godz.:</b> ${appointmentDate}\n` +
            `👤 <b>Pacjent:</b> ${name}\n` +
            `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
            `📧 <b>Email:</b> ${email}\n` +
            (description ? `💬 <b>Opis:</b> ${description}\n` : '') +
            (attachment ? `📎 <b>Załącznik:</b> ${attachment.name}\n` : '');

        // Email Content (Admin)
        const adminSubject = `Nowa rezerwacja: ${specialistName} - ${date} ${time}`;
        const adminHtml = `
            <h1>Nowa Rezerwacja Online</h1>
            <p><strong>Specjalista:</strong> ${specialistName}</p>
            <p><strong>Data:</strong> ${appointmentDate}</p>
            <hr />
            <h3>Dane pacjenta:</h3>
            <p><strong>Imię i nazwisko:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefon:</strong> ${phone}</p>
            ${description ? `<p><strong>Opis problemu:</strong><br/>${description}</p>` : ''}
            ${attachment ? `<p><strong>Załącznik:</strong> ${attachment.name} (${attachment.type})</p>` : ''}
        `;

        // Email Content (Patient)
        const patientSubject = `Potwierdzenie rezerwacji - ${specialistName}`;
        const patientHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dcb14a;">Dziękujemy za rezerwację!</h1>
                <p>Cześć ${name.split(' ')[0]},</p>
                <p>Twoja rezerwacja została przyjęta. Skontaktujemy się z Tobą w celu potwierdzenia terminu.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Szczegóły rezerwacji:</h3>
                    <p><strong>Specjalista:</strong> ${specialistName}</p>
                    <p><strong>Preferowana data:</strong> ${appointmentDate}</p>
                    ${description ? `<p><strong>Opis:</strong> ${description}</p>` : ''}
                </div>

                <p><strong>⚠️ Uwaga:</strong> To nie jest ostateczne potwierdzenie wizyty. Recepcja skontaktuje się z Tobą telefonicznie lub emailem w celu ustalenia szczegółów.</p>

                <p>W razie pytań prosimy o kontakt zwrotny na ten adres email lub telefonicznie: <a href="tel:+48570270470">570 270 470</a> lub <a href="tel:+48570810800">570 810 800</a></p>
                <p>Pozdrawiamy,<br/>Zespół Mikrostomart</p>
            </div>
        `;

        // Send Telegram
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
                        body: JSON.stringify({
                            chat_id: cleanChatId,
                            text: telegramMessage,
                            parse_mode: "HTML"
                        }),
                    });
                } catch (e) {
                    console.error("Telegram Error:", e);
                }
            }));
        }

        // Send Emails (Resend)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const resend = new Resend(resendKey);
            const adminEmail = "gabinet@mikrostomart.pl";
            const fromEmail = "powiadomienia@mikrostomart.pl";

            // Email to Admin
            const emailData: any = {
                from: fromEmail,
                to: adminEmail,
                subject: adminSubject,
                html: adminHtml
            };

            // Add attachment if present
            if (attachment && attachment.content) {
                emailData.attachments = [{
                    filename: attachment.name,
                    content: attachment.content.split(',')[1], // Remove base64 prefix
                }];
            }

            await resend.emails.send(emailData);

            // Email to Patient - FROM gabinet@ so they can reply
            await resend.emails.send({
                from: `Gabinet Mikrostomart <${adminEmail}>`,
                replyTo: adminEmail,
                to: email,
                subject: patientSubject,
                html: patientHtml
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Reservation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
