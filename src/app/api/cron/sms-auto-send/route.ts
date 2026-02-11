import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';

export const maxDuration = 60; // Vercel function timeout

/**
 * Auto-Send SMS Cron Job (Stage 2 of 2)
 * 
 * Runs daily at 8:00 AM UTC (9:00 AM Warsaw) — sends drafts for tomorrow
 * On Fridays, also called at 9:00 AM UTC (10:00 AM Warsaw) with ?targetDate=monday
 * 
 * Flow:
 * 1. Fetch all 'draft' status SMS from sms_reminders table created today
 * 2. When targetDate=monday: only send drafts for Monday appointments
 * 3. For each draft: send SMS via SMS provider
 * 4. Update status to 'sent' or 'failed'
 * 
 * Note: If admin already sent drafts manually, this cron will find no drafts to send
 */
export async function GET(req: Request) {
    console.log('🚀 [SMS Auto-Send] Starting cron job...');
    const startTime = Date.now();

    // 1. Authentication check
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCronAuth && process.env.NODE_ENV === 'production') {
        console.error('❌ [SMS Auto-Send] Unauthorized access attempt');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Initialize Supabase
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let processedCount = 0;
    let sentCount = 0;
    let failedCount = 0;
    const errors: Array<{ id: string; phone: string; error: string }> = [];

    try {
        // 3. Check for Monday mode (Friday second pass)
        const url = new URL(req.url);
        const targetDateParam = url.searchParams.get('targetDate');
        const isMondayMode = targetDateParam === 'monday';

        if (isMondayMode) {
            console.log('📅 [SMS Auto-Send] MONDAY MODE — sending only Monday appointment drafts');
        }

        // 4. Get today's date range (for filtering drafts created today)
        const today = getTodayDateRange();

        // 5. Fetch draft SMS created today
        let query = supabase
            .from('sms_reminders')
            .select('*')
            .eq('status', 'draft')
            .gte('created_at', today.start.toISOString())
            .lte('created_at', today.end.toISOString());

        // In Monday mode: only pick drafts for Monday appointments
        if (isMondayMode) {
            const mondayDate = new Date();
            const dayOfWeek = mondayDate.getUTCDay();
            const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
            mondayDate.setUTCDate(mondayDate.getUTCDate() + daysUntilMonday);
            const mondayStr = mondayDate.toISOString().split('T')[0];

            query = query
                .gte('appointment_date', `${mondayStr}T00:00:00.000Z`)
                .lte('appointment_date', `${mondayStr}T23:59:59.999Z`);

            console.log(`   📅 Filtering for Monday: ${mondayStr}`);
        }

        const { data: drafts, error: draftsError } = await query
            .order('created_at', { ascending: true });

        if (draftsError) {
            throw new Error(`Failed to fetch drafts: ${draftsError.message}`);
        }

        if (!drafts || drafts.length === 0) {
            console.log(`ℹ️  [SMS Auto-Send] No draft SMS found${isMondayMode ? ' for Monday' : ''} (likely already sent manually)`);
            return NextResponse.json({
                success: true,
                processed: 0,
                sent: 0,
                failed: 0,
                message: `No draft SMS to send${isMondayMode ? ' (Monday)' : ''}`
            });
        }

        console.log(`📊 [SMS Auto-Send] Found ${drafts.length} draft SMS to send...`);

        // 5. Process each draft
        for (const draft of drafts) {
            processedCount++;

            try {
                console.log(`📱 [${draft.id.substring(0, 8)}] Sending to ${draft.phone}...`);

                // 5a. Send SMS
                const smsResult = await sendSMS({
                    to: draft.phone,
                    message: draft.sms_message
                });

                // 5b. Update draft status
                const updateData: any = {
                    sent_at: new Date().toISOString()
                };

                if (smsResult.success) {
                    updateData.status = 'sent';
                    updateData.sms_message_id = smsResult.messageId;
                    sentCount++;
                    console.log(`   ✅ Sent successfully (ID: ${smsResult.messageId})`);
                } else {
                    updateData.status = 'failed';
                    updateData.send_error = smsResult.error;
                    failedCount++;
                    console.error(`   ❌ Send failed: ${smsResult.error}`);
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

            } catch (draftError) {
                failedCount++;
                const errorMsg = draftError instanceof Error ? draftError.message : 'Unknown error';
                console.error(`   ❌ Error processing draft:`, errorMsg);

                // Mark as failed
                await supabase
                    .from('sms_reminders')
                    .update({
                        status: 'failed',
                        send_error: errorMsg,
                        sent_at: new Date().toISOString()
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
        console.log(`\n📊 [SMS Auto-Send] Job completed in ${duration}s`);
        console.log(`   Processed: ${processedCount}`);
        console.log(`   Sent: ${sentCount}`);
        console.log(`   Failed: ${failedCount}`);

        return NextResponse.json({
            success: true,
            processed: processedCount,
            sent: sentCount,
            failed: failedCount,
            errors: errors,
            duration: `${duration}s`,
            message: `Auto-sent ${sentCount} SMS reminders`
        });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [SMS Auto-Send] Fatal error:', errorMsg);

        return NextResponse.json({
            success: false,
            error: errorMsg,
            processed: processedCount,
            sent: sentCount,
            failed: failedCount
        }, { status: 500 });
    }
}

/**
 * Get today's date range (00:00:00 to 23:59:59)
 */
function getTodayDateRange() {
    const now = new Date();

    return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    };
}
