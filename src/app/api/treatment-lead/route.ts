import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';
import { demoSanitize } from '@/lib/brandConfig';

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, service, variant, visitsRange, durationRange, answers } = body;

        if (!name || !phone || !service) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const answersText = Array.isArray(answers)
            ? answers.map((a: string) => `• ${a}`).join("\n")
            : "";

        // ── Telegram notification ──
        let telegramSent = false;

        const telegramMessage =
            `🧮 <b>KALKULATOR LECZENIA — NOWY LEAD</b>\n\n` +
            `👤 <b>Pacjent:</b> ${name}\n` +
            `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
            `🏥 <b>Usługa:</b> ${service}\n` +
            `📊 <b>Wariant:</b> ${variant}\n` +
            `📅 <b>Wizyty:</b> ${visitsRange} | <b>Czas:</b> ${durationRange}\n` +
            (answersText ? `\n📋 <b>Odpowiedzi:</b>\n${answersText}` : "");

        try {
            telegramSent = await sendTelegramNotification(telegramMessage, 'default');
        } catch (tgErr) {
            console.error("Telegram send error:", tgErr);
        }

        // Push notification to admin
        broadcastPush('admin', 'new_treatment_lead', {
            name, service: service || '',
        }, '/admin').catch(console.error);

        // ── Email notification (Resend) ──
        let emailSent = false;
        const resendKey = process.env.RESEND_API_KEY;

        if (resendKey) {
            try {
                const { Resend } = await import("resend");
                const resend = new Resend(resendKey);

                await resend.emails.send({
                    from: demoSanitize("powiadomienia@mikrostomart.pl"),
                    to: demoSanitize("gabinet@mikrostomart.pl"),
                    subject: `[Kalkulator Leczenia] ${name} — ${service}`,
                    html: `
            <h2>🧮 Kalkulator Leczenia — Nowy Lead</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
              <tr><td style="padding:4px 12px;font-weight:bold;">Pacjent:</td><td>${name}</td></tr>
              <tr><td style="padding:4px 12px;font-weight:bold;">Telefon:</td><td>${phone}</td></tr>
              <tr><td style="padding:4px 12px;font-weight:bold;">Usługa:</td><td>${service}</td></tr>
              <tr><td style="padding:4px 12px;font-weight:bold;">Wariant:</td><td>${variant}</td></tr>
              <tr><td style="padding:4px 12px;font-weight:bold;">Wizyty:</td><td>${visitsRange}</td></tr>
              <tr><td style="padding:4px 12px;font-weight:bold;">Czas:</td><td>${durationRange}</td></tr>
            </table>
            ${answersText ? `<h3>Odpowiedzi pacjenta:</h3><pre style="font-size:13px;background:#f5f5f5;padding:12px;border-radius:8px;">${answersText}</pre>` : ""}
            <p style="color:#888;font-size:12px;margin-top:20px;">Wygenerowano przez Kalkulator Czasu Leczenia na mikrostomart.pl</p>
          `,
                });
                emailSent = true;
            } catch (emailErr) {
                console.error("Email send error:", emailErr);
            }
        }

        return NextResponse.json({ success: true, telegram: telegramSent, email: emailSent });
    } catch (error: unknown) {
        console.error("Treatment Lead API Error:", error);
        return NextResponse.json({ error: "Failed to send lead" }, { status: 500 });
    }
}
