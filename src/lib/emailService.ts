/**
 * Centralized email service for patient-facing notifications.
 * Uses Resend for transactional email delivery.
 * 
 * All emails share consistent Mikrostomart branding and Polish/multi-locale support.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_ADDRESS = 'Mikrostomart <noreply@mikrostomart.pl>';

interface EmailResult {
    success: boolean;
    error?: string;
}

// ── Email wrapper function ──

function makeHtml(bodyContent: string): string {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 0; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dcb14a, #f0c96c); padding: 1.5rem 2rem; text-align: center;">
            <h1 style="margin: 0; color: #000; font-size: 1.4rem; font-weight: bold;">🦷 Mikrostomart</h1>
            <p style="margin: 0.25rem 0 0; color: rgba(0,0,0,0.6); font-size: 0.85rem;">Dentysta Opole</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 2rem;">
            ${bodyContent}
        </div>
        
        <!-- Footer -->
        <div style="padding: 1.5rem 2rem; background: rgba(0,0,0,0.2); text-align: center; font-size: 0.75rem; color: rgba(255,255,255,0.4);">
            <p style="margin: 0;">Mikrostomart — ul. Ozimska 25, 45-058 Opole</p>
            <p style="margin: 0.25rem 0 0;">📞 570 270 470 | 
                <a href="https://mikrostomart.pl" style="color: #dcb14a; text-decoration: none;">mikrostomart.pl</a>
            </p>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════

/**
 * Booking confirmed — sent to patient when admin approves online booking.
 */
export async function sendBookingConfirmedEmail(
    to: string,
    patientName: string,
    specialist: string,
    date: string,
    time: string
): Promise<EmailResult> {
    const html = makeHtml(`
        <h2 style="color: #22c55e; margin: 0 0 1rem;">✅ Wizyta potwierdzona!</h2>
        
        <p style="margin: 0 0 1rem;">Szanowny/a <strong>${patientName}</strong>,</p>
        
        <p>Twoja rezerwacja online została <strong style="color: #22c55e;">potwierdzona</strong>.</p>
        
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 1.25rem; margin: 1.5rem 0;">
            <p style="margin: 0 0 0.5rem;"><strong>👨‍⚕️ Specjalista:</strong> ${specialist}</p>
            <p style="margin: 0 0 0.5rem;"><strong>📅 Data:</strong> ${date}</p>
            <p style="margin: 0;"><strong>🕐 Godzina:</strong> ${time}</p>
        </div>
        
        <p>Prosimy o przybycie 10 minut przed umówioną godziną.</p>
        
        <div style="text-align: center; margin-top: 1.5rem;">
            <a href="https://mikrostomart.pl/strefa-pacjenta/dashboard" 
               style="display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 0.5rem; font-weight: bold;">
                Sprawdź w Strefie Pacjenta →
            </a>
        </div>
    `);

    return sendEmail(to, '✅ Twoja wizyta została potwierdzona — Mikrostomart', html);
}

/**
 * Booking rejected — sent to patient when admin rejects online booking.
 */
export async function sendBookingRejectedEmail(
    to: string,
    patientName: string,
    date: string
): Promise<EmailResult> {
    const html = makeHtml(`
        <h2 style="color: #f97316; margin: 0 0 1rem;">📋 Informacja o rezerwacji</h2>
        
        <p style="margin: 0 0 1rem;">Szanowny/a <strong>${patientName}</strong>,</p>
        
        <p>Niestety nie mogliśmy potwierdzić Twojej rezerwacji na <strong>${date}</strong>.</p>
        
        <p>Prosimy o kontakt w celu ustalenia nowego terminu — chętnie pomożemy znaleźć dogodną datę.</p>
        
        <div style="text-align: center; margin: 1.5rem 0;">
            <a href="tel:570270470" 
               style="display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 0.5rem; font-weight: bold;">
                📞  Zadzwoń: 570 270 470
            </a>
        </div>
        
        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.5);">Możesz też umówić wizytę online w <a href="https://mikrostomart.pl/strefa-pacjenta/dashboard" style="color: #dcb14a;">Strefie Pacjenta</a>.</p>
    `);

    return sendEmail(to, '📋 Informacja o Twojej rezerwacji — Mikrostomart', html);
}

/**
 * Chat reply — sent to patient when admin responds to their chat message.
 */
export async function sendChatReplyEmail(
    to: string,
    patientName: string,
    messagePreview: string
): Promise<EmailResult> {
    const html = makeHtml(`
        <h2 style="color: #60a5fa; margin: 0 0 1rem;">💬 Nowa odpowiedź od recepcji</h2>
        
        <p style="margin: 0 0 1rem;">Szanowny/a <strong>${patientName}</strong>,</p>
        
        <p>Odpowiedzieliśmy na Twoją wiadomość na czacie:</p>
        
        <div style="background: rgba(96, 165, 250, 0.1); border-left: 3px solid #60a5fa; padding: 1rem 1.25rem; margin: 1rem 0; border-radius: 0 0.5rem 0.5rem 0; font-style: italic;">
            "${messagePreview.slice(0, 200)}${messagePreview.length > 200 ? '...' : ''}"
        </div>
        
        <div style="text-align: center; margin-top: 1.5rem;">
            <a href="https://mikrostomart.pl/strefa-pacjenta/dashboard" 
               style="display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 0.5rem; font-weight: bold;">
                Przeczytaj w Strefie Pacjenta →
            </a>
        </div>
    `);

    return sendEmail(to, '💬 Nowa odpowiedź od recepcji — Mikrostomart', html);
}

/**
 * Appointment status change — generic email for status changes.
 */
export async function sendStatusChangeEmail(
    to: string,
    patientName: string,
    statusLabel: string,
    details: string
): Promise<EmailResult> {
    const html = makeHtml(`
        <h2 style="color: #dcb14a; margin: 0 0 1rem;">📋 Aktualizacja wizyty</h2>
        
        <p style="margin: 0 0 1rem;">Szanowny/a <strong>${patientName}</strong>,</p>
        
        <p>Status Twojej wizyty został zmieniony na: <strong style="color: #dcb14a;">${statusLabel}</strong></p>
        
        ${details ? `<p style="margin-top: 0.75rem;">${details}</p>` : ''}
        
        <div style="text-align: center; margin-top: 1.5rem;">
            <a href="https://mikrostomart.pl/strefa-pacjenta/dashboard" 
               style="display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 0.5rem; font-weight: bold;">
                Sprawdź w Strefie Pacjenta →
            </a>
        </div>
    `);

    return sendEmail(to, `📋 ${statusLabel} — Mikrostomart`, html);
}

// ═══════════════════════════════════════════════════════════
// CORE SEND FUNCTION
// ═══════════════════════════════════════════════════════════

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[Email] RESEND_API_KEY not configured');
            return { success: false, error: 'RESEND_API_KEY not configured' };
        }

        await resend.emails.send({
            from: FROM_ADDRESS,
            to: [to],
            subject,
            html,
        });

        console.log(`[Email] Sent "${subject}" to ${to}`);
        return { success: true };
    } catch (err: any) {
        console.error(`[Email] Failed to send to ${to}:`, err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}
