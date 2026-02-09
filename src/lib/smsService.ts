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
        console.log(`[SMS] Sending to: ${normalizedPhone}, message length: ${message.length} chars`);

        // SMSAPI.pl integration
        // Note: 'from' field omitted - SMSAPI will use default sender ID from account settings
        // To use custom sender, it must be registered in SMSAPI.pl dashboard first
        const requestBody = {
            to: normalizedPhone,
            message: message,
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
 * Get SMS template based on doctor and appointment type
 * 
 * Reads from Supabase 'sms_templates' table (editable via admin panel)
 * Falls back to smsTemplates.json file if Supabase unavailable
 * 
 * Key format in DB: 'default', 'byType:chirurgia', 'byDoctor:Marcin Nowosielski'
 * 
 * Priority:
 * 1. byDoctor:DoctorName (doctor-specific default)
 * 2. byType:appointmentType (type-specific)
 * 3. default (global fallback)
 */
export async function getSMSTemplate(
    doctorName: string,
    appointmentType: string
): Promise<string> {
    // Normalize
    const normalizedDoctor = doctorName.replace(/\s*\(I\)\s*/g, ' ').trim();
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

            // Priority 1: Doctor-specific template
            const doctorKey = `bydoctor:${normalizedDoctor.toLowerCase()}`;
            if (templateMap.has(doctorKey)) {
                return templateMap.get(doctorKey)!;
            }

            // Priority 2: Type-specific template
            const typeKey = `bytype:${normalizedType}`;
            if (templateMap.has(typeKey)) {
                return templateMap.get(typeKey)!;
            }

            // Priority 3: Global default
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

        if (templates.byDoctor?.[normalizedDoctor]?.default) {
            return templates.byDoctor[normalizedDoctor].default;
        }
        if (templates.byAppointmentType?.[normalizedType]) {
            return templates.byAppointmentType[normalizedType];
        }
        if (templates.byAppointmentType?.[appointmentType]) {
            return templates.byAppointmentType[appointmentType];
        }
        return templates.default || 'Przypomnienie o wizycie jutro o {time}.';
    } catch {
        return 'Przypomnienie o wizycie jutro o {time}.';
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
        patientName?: string;
        appointmentType?: string;
        date?: string;
    }
): string {
    let message = template;

    if (variables.time) {
        message = message.replace(/{time}/g, variables.time);
    }

    if (variables.doctor) {
        message = message.replace(/{doctor}/g, variables.doctor);
    }

    if (variables.patientName) {
        message = message.replace(/{patientName}/g, variables.patientName);
    }

    if (variables.appointmentType) {
        message = message.replace(/{appointmentType}/g, variables.appointmentType);
    }

    if (variables.date) {
        message = message.replace(/{date}/g, variables.date);
    }

    return message;
}
