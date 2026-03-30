import { Resend } from 'resend';
import { brand, demoSanitize } from './brandConfig';
import { isDemoMode } from './demoMode';

/**
 * Central email sending utility.
 * 
 * All email sending in the application MUST go through this function.
 * Benefits:
 * - Single Resend instance (no 17 independent `new Resend()`)
 * - Automatic `from` address from brand config (senderEmail)
 * - Automatic demo mode sanitization
 * - Consistent error handling
 * - Single point for future extensions (logging, rate limiting, etc.)
 */

let resendInstance: Resend | null = null;

function getResend(): Resend {
    if (resendInstance) return resendInstance;
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    resendInstance = new Resend(key);
    return resendInstance;
}

export interface SendEmailOptions {
    /** Recipient email address(es) */
    to: string | string[];
    /** Email subject line */
    subject: string;
    /** HTML content of the email */
    html: string;
    /** 
     * Override sender address. 
     * Defaults to brand.senderEmail (e.g. noreply@mikrostomart.pl).
     * Use brand.notificationEmail for notification-type emails.
     */
    from?: string;
    /** Reply-to address (optional) */
    replyTo?: string;
}

export interface SendEmailResult {
    success: boolean;
    id?: string;
    error?: string;
}

/**
 * Send an email via Resend.
 * 
 * In demo mode: logs the email to console and returns success without sending.
 * In production: sends via Resend API with demoSanitize applied.
 * 
 * @example
 * ```ts
 * import { sendEmail } from '@/lib/emailSender';
 * 
 * await sendEmail({
 *   to: 'patient@example.com',
 *   subject: 'Appointment Confirmation',
 *   html: '<h1>Your appointment is confirmed</h1>',
 * });
 * ```
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const from = options.from || brand.senderEmail;
    const subject = demoSanitize(options.subject);
    const html = demoSanitize(options.html);

    if (isDemoMode) {
        console.log(`[DEMO] Email skipped: to=${Array.isArray(options.to) ? options.to.join(',') : options.to}, subject=${subject}`);
        return { success: true, id: 'demo-skip' };
    }

    try {
        const resend = getResend();
        const result = await resend.emails.send({
            from,
            to: options.to,
            subject,
            html,
            ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        });

        if (result.error) {
            console.error('[emailSender] Resend error:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true, id: result.data?.id };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[emailSender] Exception:', message);
        return { success: false, error: message };
    }
}
