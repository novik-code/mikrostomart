import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { verifyAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/sms-send
 * Immediately send a single draft SMS and update status in DB
 * Auth: admin required.
 * Body: { id, phone, message }
 */
export async function POST(req: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        // GDPR audit log
        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: result.success ? 'sms_sent' : 'sms_send_failed',
            resourceType: 'sms',
            resourceId: id,
            metadata: { phone, messageLength: message.length, messageId: result.messageId },
            request: req,
        });

        return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
