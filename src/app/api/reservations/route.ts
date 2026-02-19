import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';
import { getEmailTemplate } from '@/lib/emailTemplates';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, phone, specialist, specialistName, date, time, description, attachment, locale: requestLocale } = body;
        const locale = ['pl', 'en', 'de', 'ua'].includes(requestLocale) ? requestLocale : 'pl';

        // Format date WITHOUT timezone conversion (date/time are already in Warsaw time)
        const [year, month, day] = date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
        const appointmentDate = `${dayName}, ${formattedDate} o godz. ${time}`;

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

        // Email Content (Patient - localized)
        const firstName = name.split(' ')[0];
        const patientEmail = getEmailTemplate('reservation_confirmation', locale, {
            firstName,
            specialist: specialistName,
            appointmentDate,
            description: description || '',
        });
        const patientSubject = patientEmail.subject;
        const patientHtml = patientEmail.html;

        // Send Telegram
        if (telegramMessage) {
            await sendTelegramNotification(telegramMessage, 'default');
        }

        // Push notification to admin + employees
        broadcastPush('admin', 'new_reservation', {
            name, specialist: specialistName || '', date: date || '', time: time || '',
        }, '/admin').catch(console.error);
        broadcastPush('employee', 'new_reservation', {
            name, specialist: specialistName || '', date: date || '', time: time || '',
        }, '/pracownik').catch(console.error);

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
