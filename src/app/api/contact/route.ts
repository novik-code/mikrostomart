import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { demoSanitize, brand } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// Hard cap on JSON body to prevent abuse. attachment is base64-encoded so
// a 5 MB file inflates to ~6.7 MB; we cap a bit above that for safety margin.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

// Magic-bytes signatures for the file types ContactForm declares it accepts
// (jpg/jpeg/png/webp/pdf). Manual checks instead of pulling in `file-type`,
// which is ESM-only at v17+ and risks ERR_REQUIRE_ESM in the Vercel CJS
// bundle (same class of failure as the S4-1 v1 isomorphic-dompurify crash).
function detectAttachmentMime(bytes: Uint8Array): string | null {
    if (bytes.length < 12) return null;
    // PDF: %PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
        bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) return 'image/png';
    // WebP: 'RIFF' .... 'WEBP'
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
    return null;
}

const ALLOWED_ATTACHMENT_MIMES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);

async function verifyTurnstile(token: string, clientIp: string): Promise<{ success: boolean; reason?: string }> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        // Misconfiguration — fail closed in production. In dev (no secret) we
        // accept the request so local development still works without the key.
        if (process.env.NODE_ENV === 'production') {
            return { success: false, reason: 'turnstile_secret_missing' };
        }
        console.warn('[contact] TURNSTILE_SECRET_KEY not set — bypassing verification (dev only)');
        return { success: true };
    }
    try {
        const params = new URLSearchParams();
        params.append('secret', secret);
        params.append('response', token);
        if (clientIp && clientIp !== 'unknown') params.append('remoteip', clientIp);
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return { success: false, reason: `turnstile_http_${res.status}` };
        const data = await res.json();
        if (data.success === true) return { success: true };
        const codes = Array.isArray(data['error-codes']) ? data['error-codes'].join(',') : 'unknown';
        return { success: false, reason: `turnstile_rejected:${codes}` };
    } catch (err) {
        return { success: false, reason: `turnstile_exception:${err instanceof Error ? err.message : 'unknown'}` };
    }
}

export async function POST(req: NextRequest) {
    try {
        // Rate limit: 5 submissions per 15 minutes per IP. Tighter than reservations
        // (5/min) because contact form is more spam-prone (open to anyone, no slot
        // pre-selection step). Returns 429 with Retry-After.
        const ip = getClientIP(req);
        const rl = await checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many messages. Please wait a few minutes and try again.' },
                { status: 429, headers: { 'Retry-After': '900' } }
            );
        }

        // Body size guard before JSON parse — fail fast on giant payloads.
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
        if (contentLength > 0 && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json(
                { error: 'Request too large. Maximum 5 MB attachment.' },
                { status: 413 }
            );
        }

        const body = await req.json();
        const { type, name, email, phone, message, service, date, time, specialistName, subject, attachment, description, turnstileToken } = body;

        // Verify Cloudflare Turnstile token (issued by client widget after challenge)
        if (!turnstileToken || typeof turnstileToken !== 'string') {
            return NextResponse.json({ error: 'Missing Turnstile token' }, { status: 400 });
        }
        const turnstile = await verifyTurnstile(turnstileToken, ip);
        if (!turnstile.success) {
            console.warn(`[contact] Turnstile verification failed: ${turnstile.reason} (ip=${ip})`);
            return NextResponse.json({ error: 'Verification failed. Please refresh and try again.' }, { status: 403 });
        }

        // Validate attachment with magic-bytes (defense against MIME spoofing).
        // Frontend already filters extension+claimed-type, but attacker can
        // craft requests directly — server is the source of truth.
        if (attachment && attachment.content) {
            const base64Content = String(attachment.content).split(',')[1] || String(attachment.content);
            try {
                const buf = Buffer.from(base64Content, 'base64');
                if (buf.length > 5 * 1024 * 1024) {
                    return NextResponse.json({ error: 'Attachment too large (max 5 MB)' }, { status: 413 });
                }
                const detectedMime = detectAttachmentMime(buf);
                if (!detectedMime || !ALLOWED_ATTACHMENT_MIMES.has(detectedMime)) {
                    console.warn(`[contact] Attachment rejected: claimed=${attachment.type}, detected=${detectedMime}, name=${attachment.name}`);
                    return NextResponse.json(
                        { error: 'Invalid file type. Allowed: JPG, PNG, WebP, PDF.' },
                        { status: 400 }
                    );
                }
            } catch (mimeErr) {
                console.warn('[contact] Attachment decode failed:', mimeErr);
                return NextResponse.json({ error: 'Attachment could not be processed.' }, { status: 400 });
            }
        }

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
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
                        has_attachment: emailAttachments.length > 0,
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
        let telegramSent = false;

        try {
            // Route: contact messages → 'messages' channel, reservations → 'default'
            const channel = type === 'contact' ? 'messages' as const : 'default' as const;
            telegramSent = await sendTelegramNotification(telegramMessage, channel);
        } catch (tgErr) {
            console.error("Failed to send Telegram notification:", tgErr);
        }

        // Push notification to admin + employees
        if (type === 'contact') {
            broadcastPush('admin', 'new_contact_message', {
                name: name || '', subject: subject || 'Bez tematu',
            }, '/admin').catch(console.error);
        } else if (type === 'reservation') {
            broadcastPush('admin', 'new_reservation', {
                name: name || '', specialist: specialistName || '', date: date || '', time: time || '',
            }, '/admin').catch(console.error);
            broadcastPush('employee', 'new_reservation', {
                name: name || '', specialist: specialistName || '', date: date || '', time: time || '',
            }, '/pracownik').catch(console.error);
        }

        // 3. Try Email Notification (Resend) or Mock
        const resendKey = process.env.RESEND_API_KEY;
        let emailSent = false;

        if (resendKey) {
            const adminEmail = demoSanitize("gabinet@mikrostomart.pl");
            await sendEmail({
                from: brand.notificationEmail,
                to: adminEmail,
                subject: emailSubject,
                html: emailHtml,
                attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
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
