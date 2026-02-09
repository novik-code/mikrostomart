import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';

/**
 * POST /api/admin/sms-reminders/send-manual
 * 
 * Send a manual SMS directly (not from draft).
 * 
 * Body: {
 *   phone: string,        — recipient phone (48XXXXXXXXX format)
 *   message: string,      — SMS text content
 *   patient_name?: string, — optional patient name for logging
 *   sent_by: string       — admin email
 * }
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    console.log('📤 [Manual SMS Direct] Starting...');

    try {
        const body = await req.json();
        const { phone, message, patient_name, sent_by } = body;

        if (!phone || !message || !sent_by) {
            return NextResponse.json(
                { error: 'Missing required fields: phone, message, sent_by' },
                { status: 400 }
            );
        }

        // Normalize phone
        const normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');

        console.log(`📱 Sending manual SMS to ${normalizedPhone} (${patient_name || 'unknown'})...`);
        console.log(`   Message: ${message.substring(0, 50)}...`);

        // Send SMS
        const smsResult = await sendSMS({
            to: normalizedPhone,
            message
        });

        // Log to sms_reminders table for history
        const logEntry = {
            phone: normalizedPhone,
            patient_name: patient_name || null,
            sms_message: message,
            status: smsResult.success ? 'sent' : 'failed',
            sms_message_id: smsResult.messageId || null,
            send_error: smsResult.error || null,
            sent_at: new Date().toISOString(),
            manually_sent_by: sent_by,
            appointment_date: new Date().toISOString(), // Use now as placeholder date
            appointment_type: 'manual',
            doctor_name: 'Ręczny SMS'
        };

        await supabase.from('sms_reminders').insert(logEntry);

        if (smsResult.success) {
            console.log(`   ✅ Sent (ID: ${smsResult.messageId})`);
            return NextResponse.json({
                success: true,
                messageId: smsResult.messageId,
                message: 'SMS wysłany pomyślnie'
            });
        } else {
            console.error(`   ❌ Failed: ${smsResult.error}`);
            return NextResponse.json({
                success: false,
                error: smsResult.error,
                message: 'Błąd wysyłania SMS'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[Manual SMS Direct] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
