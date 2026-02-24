import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/sms-send
 * Immediately send a single draft SMS and update status in DB
 * Body: { id, phone, message }
 */
export async function POST(req: Request) {
    try {
        const { id, phone, message } = await req.json();
        if (!id || !phone || !message) {
            return NextResponse.json({ error: 'Missing id, phone, or message' }, { status: 400 });
        }

        const result = await sendSMS({ to: phone, message });

        const updateData: any = {
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (result.success) {
            updateData.status = 'sent';
            updateData.sms_message_id = result.messageId;
        } else {
            updateData.status = 'failed';
            updateData.send_error = result.error;
        }

        await supabase.from('sms_reminders').update(updateData).eq('id', id);

        return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
