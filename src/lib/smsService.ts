/**
 * SMS Service for Mikrostomart
 * 
 * Handles SMS sending via configured provider (SMSAPI.pl, Twilio, etc.)
 * Used for automated appointment reminders
 */

export interface SMSOptions {
    to: string;           // Phone number (format: 48XXXXXXXXX for Polish numbers)
    message: string;      // SMS content (recommended: under 160 chars for single SMS)
    from?: string;        // Sender name (default: process.env.SMSAPI_FROM)
}

export interface SMSResponse {
    success: boolean;
    messageId?: string;   // Provider's message ID for tracking
    error?: string;       // Error message if send failed
}

/**
 * Transliterate Polish diacritics and strip non-GSM-7 characters.
 * GSM-7 encoding allows 160 chars/SMS vs UCS-2's 70 chars/SMS.
 * This ensures every SMS is always counted as 1 part = 0.17 PLN.
 *
 * Polish: ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z, etc.
 * Also removes emoji and other Unicode characters outside GSM-7.
 */
export function toGSM7(text: string): string {
    const POLISH_MAP: Record<string, string> = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
        // Common accented chars that may appear in names
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'ý': 'y', 'ÿ': 'y', 'ñ': 'n',
        '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
    };

    let result = '';
    for (const char of text) {
        if (POLISH_MAP[char]) {
            result += POLISH_MAP[char];
        } else if (char.charCodeAt(0) <= 127) {
            // Standard ASCII — always GSM-7 safe
            result += char;
        } else {
            // Skip emoji and other non-GSM-7 characters
            // (surrogate pairs, emoji, CJK, etc.)
        }
    }

    // Collapse multiple spaces (from removed emoji)
    result = result.replace(/  +/g, ' ').trim();

    // Truncate to 160 chars (single SMS limit in GSM-7)
    if (result.length > 160) {
        result = result.substring(0, 157) + '...';
    }

    return result;
}

/**
 * Send SMS via configured provider
 * 
 * @example
 * const result = await sendSMS({
 *   to: '48123456789',
 *   message: 'Przypomnienie o wizycie jutro o 10:00'
 * });
 * 
 * if (result.success) {
 *   console.log('SMS sent, ID:', result.messageId);
 * }
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResponse> {
    const { to, message, from = process.env.SMSAPI_FROM || 'Mikrostomart' } = options;

    // Validate inputs
    if (!to || !message) {
        return {
            success: false,
            error: 'Missing required parameters: to and message'
        };
    }

    // Normalize phone number: remove + prefix and whitespace
    const normalizedPhone = to.replace(/^\+/, '').replace(/\s+/g, '');

    // Validate phone format (Polish: 48XXXXXXXXX, 11 digits total)
    const phoneRegex = /^48\d{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
        return {
            success: false,
            error: `Invalid phone format: ${to}. Expected format: 48XXXXXXXXX or +48XXXXXXXXX`
        };
    }

    // Check if SMS provider is configured
    if (!process.env.SMSAPI_TOKEN) {
        console.warn('⚠️  SMSAPI_TOKEN not configured - SMS send skipped');
        return {
            success: false,
            error: 'SMS provider not configured. Set SMSAPI_TOKEN environment variable.'
        };
    }

    try {
        // Transliterate Polish diacritics → ASCII for GSM-7 encoding (1 SMS = 160 chars)
        const gsm7Message = toGSM7(message);
        console.log(`[SMS] Sending to: ${normalizedPhone}, original: ${message.length} chars, GSM-7: ${gsm7Message.length} chars`);

        // SMSAPI.pl integration
        // Note: 'from' field omitted - SMSAPI will use default sender ID from account settings
        // GSM-7 encoding (default) — 160 chars/SMS, no Polish diacritics needed
        const requestBody = {
            to: normalizedPhone,
            message: gsm7Message,
            format: 'json',
            skip_link_detection: 1  // Allow sending links (bypass error 94)
        };

        console.log('[SMS] Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.smsapi.pl/sms.do', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SMSAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SMS] SMSAPI error response:', response.status, errorText);
            return {
                success: false,
                error: `SMSAPI error (${response.status}): ${errorText}`
            };
        }

        const data = await response.json();
        console.log('[SMS] SMSAPI response:', JSON.stringify(data, null, 2));

        // SMSAPI.pl returns array of message statuses
        if (data.count && data.count > 0) {
            console.log('[SMS] Success! Message ID:', data.list?.[0]?.id);
            return {
                success: true,
                messageId: data.list?.[0]?.id || 'unknown'
            };
        }

        console.error('[SMS] No messages sent. Response:', data);
        return {
            success: false,
            error: `No messages sent. API response: ${JSON.stringify(data)}`
        };

    } catch (error) {
        console.error('SMS send error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get SMS template based on appointment type
 * 
 * Reads from Supabase 'sms_templates' table (editable via admin panel)
 * Falls back to smsTemplates.json file if Supabase unavailable
 * 
 * Key format in DB: 'default', 'byType:chirurgia', 'byType:protetyka', etc.
 * 
 * Matching logic (simple):
 * 1. byType:appointmentType → best match for specific visit type
 * 2. default → global fallback
 * 
 * Doctor name is a {doctor} variable in template text, not a matching key.
 */
export async function getSMSTemplate(
    doctorName: string,
    appointmentType: string
): Promise<string> {
    const normalizedType = appointmentType.toLowerCase();

    // Try Supabase first
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: templates } = await supabase
            .from('sms_templates')
            .select('key, template');

        if (templates && templates.length > 0) {
            const templateMap = new Map<string, string>();
            for (const t of templates) {
                templateMap.set(t.key.toLowerCase(), t.template);
            }

            // Priority 1: Type-specific template
            const typeKey = `bytype:${normalizedType}`;
            if (templateMap.has(typeKey)) {
                return templateMap.get(typeKey)!;
            }

            // Priority 2: Global default
            if (templateMap.has('default')) {
                return templateMap.get('default')!;
            }
        }
    } catch (err) {
        console.error('[getSMSTemplate] Supabase error, falling back to file:', err);
    }

    // Fallback: Load from file
    try {
        const fs = require('fs');
        const path = require('path');
        const templatesPath = path.join(process.cwd(), 'smsTemplates.json');
        const fileContent = fs.readFileSync(templatesPath, 'utf-8');
        const templates = JSON.parse(fileContent);

        if (templates.byAppointmentType?.[normalizedType]) {
            return templates.byAppointmentType[normalizedType];
        }
        return templates.default || 'Mikrostomart: wizyta u {doctor} jutro o {time}. Potwierdz:';
    } catch {
        return 'Mikrostomart: wizyta u {doctor} jutro o {time}. Potwierdz:';
    }
}

/**
 * Format SMS message by replacing placeholders
 */
export function formatSMSMessage(
    template: string,
    variables: {
        time?: string;
        doctor?: string;
        doctorName?: string;
        patientName?: string;
        patientFirstName?: string;
        salutation?: string;        // e.g. 'Pani Agnieszko' / 'Panie Marcinie'
        appointmentType?: string;
        date?: string;
        surveyUrl?: string;
        funFact?: string;
        appUrl?: string;
    }
): string {
    let message = template;

    if (variables.time) message = message.replace(/{time}/g, variables.time);
    if (variables.doctor) message = message.replace(/{doctor}/g, variables.doctor);
    if (variables.doctorName) message = message.replace(/{doctorName}/g, variables.doctorName);
    if (variables.patientName) message = message.replace(/{patientName}/g, variables.patientName);
    if (variables.patientFirstName) message = message.replace(/{patientFirstName}/g, variables.patientFirstName);
    if (variables.salutation) message = message.replace(/{salutation}/g, variables.salutation);
    if (variables.appointmentType) message = message.replace(/{appointmentType}/g, variables.appointmentType);
    if (variables.date) message = message.replace(/{date}/g, variables.date);
    if (variables.surveyUrl) message = message.replace(/{surveyUrl}/g, variables.surveyUrl);
    if (variables.funFact !== undefined) message = message.replace(/{funFact}/g, variables.funFact);
    if (variables.appUrl) message = message.replace(/{appUrl}/g, variables.appUrl);

    return message;
}
