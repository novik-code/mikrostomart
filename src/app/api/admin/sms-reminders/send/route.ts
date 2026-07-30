import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { deliverReminderDraft } from '@/lib/reminderDelivery';

/**
 * Manual SMS Send Endpoint (Admin Only)
 * 
 * POST /api/admin/sms-reminders/send
 * Auth: admin required.
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
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

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

        /**
         * 🔴 PUSH-FIRST. Ta pętla wołała dotąd `sendSMS` bezpośrednio, więc pacjent
         * z aplikacją i tak dostawał SMS-a — mimo że push-first istnieje od 2026-07-28.
         * Naprawa z tamtej daty objęła wyłącznie `/api/admin/sms-send`; ta trasa
         * („wyślij wszystkie" z panelu) została pominięta i to przez nią przeszło
         * zgłoszenie z produkcji 2026-07-30. Wysyłka idzie teraz przez wspólne
         * `deliverReminderDraft`, więc kanał dobiera JEDNO miejsce dla wszystkich tras.
         */
        let pushCount = 0;
        for (const draft of drafts) {
            try {
                console.log(`📱 [${draft.id.substring(0, 8)}] Wysyłka do ${draft.phone}…`);

                const outcome = await deliverReminderDraft(draft);

                if (outcome.ok) {
                    sentCount++;
                    if (outcome.pushSent) pushCount++;
                    console.log(`   ✅ Kanał: ${outcome.channel}`);
                } else {
                    failedCount++;
                    console.error(`   ❌ Nieudane: ${outcome.error}`);
                    errors.push({
                        id: draft.id,
                        phone: draft.phone,
                        error: outcome.error || 'Unknown error'
                    });
                }

                // `deliverReminderDraft` zapisuje status i kanał; tutaj dopisujemy
                // wyłącznie ślad, KTO nacisnął wysyłkę.
                await supabase
                    .from('sms_reminders')
                    .update({ manually_sent_by: sent_by })
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
        console.log(`   Dostarczone: ${sentCount} (w tym pushem: ${pushCount})`);
        console.log(`   Nieudane: ${failedCount}`);

        return NextResponse.json({
            success: true,
            sent: sentCount,
            // Panel pokazuje operatorowi, ile poszło apką — bez tego „push-first"
            // jest niewidoczny i nie sposób zauważyć, że przestał działać.
            pushSent: pushCount,
            smsSent: sentCount - pushCount,
            failed: failedCount,
            errors,
            duration: `${duration}s`,
            message: `Dostarczono ${sentCount} (push: ${pushCount}, SMS: ${sentCount - pushCount})`
        });

    } catch (error) {
        console.error('[Manual SMS Send] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
