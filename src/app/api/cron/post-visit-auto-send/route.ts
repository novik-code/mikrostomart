import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';

export const maxDuration = 120;

/**
 * Post-Visit + Week-After-Visit SMS Auto-Send (Stage 2 of 2)
 *
 * Schedule: 0 19 * * * (19:00 UTC = 20:00 Warsaw CET) — fires ~1h after post-visit draft cron
 *           0 10 * * * (10:00 UTC = 11:00 Warsaw CET) — fires ~1h after week-after-visit draft cron
 *
 * Sends ALL draft SMS of type 'post_visit' and 'week_after_visit'
 * created within the last 2 hours (safety window).
 *
 * If admin manually sent/edited/deleted drafts in admin panel,
 * those records will already be 'sent'/'cancelled' and won't be re-sent.
 */
export async function GET(req: Request) {
    console.log('🚀 [Post-Visit Auto-Send] Starting...');
    const startTime = Date.now();

    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';
    const smsTypeFilter = url.searchParams.get('sms_type') as 'post_visit' | 'week_after_visit' | null;

    if (!isCronAuth && !isManualTrigger && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ id: string; patient: string; error: string }> = [];

    try {
        // Safety window: only send drafts created in the last 3 hours
        const windowStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

        let query = supabase
            .from('sms_reminders')
            .select('*')
            .eq('status', 'draft')
            .gte('created_at', windowStart)
            .in('sms_type', smsTypeFilter ? [smsTypeFilter] : ['post_visit', 'week_after_visit'])
            .order('created_at', { ascending: true });

        const { data: drafts, error: draftsError } = await query;

        if (draftsError) throw new Error(`Failed to fetch drafts: ${draftsError.message}`);

        if (!drafts || drafts.length === 0) {
            console.log('ℹ️  No post-visit/week-after-visit drafts to send (already sent or cancelled by admin)');
            return NextResponse.json({
                success: true,
                sent: 0,
                failed: 0,
                message: 'No drafts to send (already processed or cancelled)',
            });
        }

        console.log(`📊 Found ${drafts.length} drafts to send...`);

        for (const draft of drafts) {
            try {
                console.log(`📱 Sending to ${draft.phone} (${draft.patient_name}, type: ${draft.sms_type})...`);

                const smsResult = await sendSMS({ to: draft.phone, message: draft.sms_message });

                const updateData: any = { sent_at: new Date().toISOString(), updated_at: new Date().toISOString() };

                if (smsResult.success) {
                    updateData.status = 'sent';
                    updateData.sms_message_id = smsResult.messageId;
                    sentCount++;
                    console.log(`   ✅ Sent (ID: ${smsResult.messageId})`);
                } else {
                    updateData.status = 'failed';
                    updateData.send_error = smsResult.error;
                    failedCount++;
                    errors.push({ id: draft.id, patient: draft.patient_name, error: smsResult.error || 'Unknown' });
                    console.error(`   ❌ Failed: ${smsResult.error}`);
                }

                await supabase.from('sms_reminders').update(updateData).eq('id', draft.id);

            } catch (err: any) {
                failedCount++;
                await supabase.from('sms_reminders').update({
                    status: 'failed',
                    send_error: err.message,
                    sent_at: new Date().toISOString(),
                }).eq('id', draft.id);
                errors.push({ id: draft.id, patient: draft.patient_name, error: err.message });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`📊 Done in ${duration}s — sent:${sentCount} failed:${failedCount} skipped:${skippedCount}`);

        return NextResponse.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            skipped: skippedCount,
            duration: `${duration}s`,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error: any) {
        console.error('💥 [Post-Visit Auto-Send] Fatal error:', error.message);
        return NextResponse.json({ success: false, error: error.message, sent: sentCount, failed: failedCount }, { status: 500 });
    }
}
