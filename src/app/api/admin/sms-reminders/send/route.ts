import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';

/**
 * Manual SMS Send Endpoint (Admin Only)
 * 
 * POST /api/admin/sms-reminders/send
 * 
 * Body: {
 *   reminder_ids: string[] | "all",
 *   sent_by: string (admin email)
 * }
 * 
 * Sends draft SMS immediately (manual trigger)
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    console.log('📤 [Manual SMS Send] Starting...');
    const startTime = Date.now();

    try {
        const body = await req.json();
        const { reminder_ids, sent_by } = body;

        if (!reminder_ids || !sent_by) {
            return NextResponse.json(
                { error: 'Missing required fields: reminder_ids, sent_by' },
                { status: 400 }
            );
        }

        // Fetch drafts to send
        let query = supabase
            .from('sms_reminders')
            .select('*')
            .eq('status', 'draft');

        if (reminder_ids !== 'all') {
            query = query.in('id', reminder_ids);
        }

        const { data: drafts, error: fetchError } = await query;

        if (fetchError) {
            throw new Error(`Failed to fetch drafts: ${fetchError.message}`);
        }

        if (!drafts || drafts.length === 0) {
            return NextResponse.json({
                success: true,
                sent: 0,
                failed: 0,
                message: 'No drafts found to send'
            });
        }

        console.log(`📊 [Manual SMS Send] Sending ${drafts.length} SMS...`);

        let sentCount = 0;
        let failedCount = 0;
        const errors: Array<{ id: string; phone: string; error: string }> = [];

        // Send each draft
        for (const draft of drafts) {
            try {
                console.log(`📱 [${draft.id.substring(0, 8)}] Sending to ${draft.phone}...`);

                const smsResult = await sendSMS({
                    to: draft.phone,
                    message: draft.sms_message
                });

                const updateData: any = {
                    sent_at: new Date().toISOString(),
                    manually_sent_by: sent_by
                };

                if (smsResult.success) {
                    updateData.status = 'sent';
                    updateData.sms_message_id = smsResult.messageId;
                    sentCount++;
                    console.log(`   ✅ Sent (ID: ${smsResult.messageId})`);
                } else {
                    updateData.status = 'failed';
                    updateData.send_error = smsResult.error;
                    failedCount++;
                    console.error(`   ❌ Failed: ${smsResult.error}`);
                    errors.push({
                        id: draft.id,
                        phone: draft.phone,
                        error: smsResult.error || 'Unknown error'
                    });
                }

                await supabase
                    .from('sms_reminders')
                    .update(updateData)
                    .eq('id', draft.id);

            } catch (sendError) {
                failedCount++;
                const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown error';
                console.error(`   ❌ Error: ${errorMsg}`);

                await supabase
                    .from('sms_reminders')
                    .update({
                        status: 'failed',
                        send_error: errorMsg,
                        sent_at: new Date().toISOString(),
                        manually_sent_by: sent_by
                    })
                    .eq('id', draft.id);

                errors.push({
                    id: draft.id,
                    phone: draft.phone,
                    error: errorMsg
                });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ [Manual SMS Send] Completed in ${duration}s`);
        console.log(`   Sent: ${sentCount}`);
        console.log(`   Failed: ${failedCount}`);

        return NextResponse.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            errors,
            duration: `${duration}s`,
            message: `Sent ${sentCount} SMS successfully`
        });

    } catch (error) {
        console.error('[Manual SMS Send] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
