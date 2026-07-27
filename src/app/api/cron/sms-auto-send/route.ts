import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { deliverToPatient, hasPatientResponded, updateDeliveryStatus } from '@/lib/patientDelivery';
import type { PushPayload } from '@/lib/pushService';
import { brand } from '@/lib/brandConfig';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const maxDuration = 120; // Vercel function timeout

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
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
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
    let pushCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
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
            .lte('created_at', today.end.toISOString())
            // Only send 'reminder' type drafts (or null sms_type for backward compat)
            // post_visit and week_after_visit are handled by /api/cron/post-visit-auto-send
            .or('sms_type.eq.reminder,sms_type.is.null');

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

                // If this draft was already delivered via push and patient responded — skip SMS
                if (draft.delivery_channel === 'push' || draft.status === 'push_sent') {
                    console.log(`   ⏭️ Skipping: already delivered via push`);
                    skippedCount++;
                    continue;
                }

                // For reminder type: check if patient already confirmed/cancelled via push
                if (draft.sms_type === 'reminder' && draft.prodentis_id && draft.appointment_date) {
                    const responded = await hasPatientResponded(
                        String(draft.prodentis_id),
                        draft.appointment_date
                    );
                    if (responded) {
                        console.log(`   ⏭️ Skipping: patient already responded to appointment`);
                        await supabase.from('sms_reminders').update({
                            status: 'cancelled',
                            send_error: 'Pacjent odpowiedział via push — SMS niepotrzebny',
                            updated_at: new Date().toISOString(),
                        }).eq('id', draft.id);
                        skippedCount++;
                        continue;
                    }
                }

                // 5a. Dostarczenie: push-first → SMS fallback, w JEDNYM kroku.
                //
                // Ten cron jest jedynym punktem wysyłki przypomnień, więc push
                // wychodzi dokładnie w tej samej godzinie co SMS. Wcześniej push
                // szedł z `appointment-reminders` godzinę wcześniej.
                //
                // Link potwierdzenia bierzemy z `appointment_actions` — powstał
                // w cronie przygotowującym. Unikat (prodentis_id, appointment_date)
                // gwarantuje jeden wiersz. UWAGA: `sms_reminders.prodentis_id`
                // przechowuje id WIZYTY (nie pacjenta) — i po tym samym polu
                // kluczowana jest `appointment_actions`, więc dopasowanie jest 1:1.
                const confirmLink = await loadConfirmationLink(
                    supabase,
                    draft.prodentis_id,
                    draft.appointment_date
                );

                const deliveryResult = await deliverToPatient({
                    patientId: draft.patient_id || null,
                    prodentisPatientId: String(draft.prodentis_id || ''),
                    phone: draft.phone,
                    pushPayload: buildReminderPush(draft, confirmLink),
                    smsMessage: draft.sms_message,
                    smsType: 'reminder',
                });

                await updateDeliveryStatus(draft.id, deliveryResult);

                if (deliveryResult.pushSent && !deliveryResult.smsSent) {
                    pushCount++;
                    console.log(`   📲 Push delivered (SMS niepotrzebny) — link: ${confirmLink ? 'tak' : 'BRAK'}`);
                } else if (deliveryResult.smsSent) {
                    sentCount++;
                    console.log(`   ✅ SMS sent (ID: ${deliveryResult.smsMessageId})`);
                } else {
                    failedCount++;
                    const why = deliveryResult.smsError || deliveryResult.pushError || 'Unknown error';
                    console.error(`   ❌ Nie dostarczono żadnym kanałem: ${why}`);
                    errors.push({ id: draft.id, phone: draft.phone, error: why });

                    await supabase
                        .from('sms_reminders')
                        .update({
                            status: 'failed',
                            send_error: why,
                            sent_at: new Date().toISOString(),
                        })
                        .eq('id', draft.id);
                }

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
        console.log(`   Push:      ${pushCount}`);
        console.log(`   SMS:       ${sentCount}`);
        console.log(`   Failed:    ${failedCount}`);

        await logCronHeartbeat(
            'sms-auto-send',
            failedCount > 0 ? 'warn' : 'ok',
            `Push: ${pushCount}, SMS: ${sentCount}, pominięte: ${skippedCount}, błędy: ${failedCount}`,
            Date.now() - startTime
        );

        return NextResponse.json({
            success: true,
            processed: processedCount,
            push: pushCount,
            sent: sentCount,
            skipped: skippedCount,
            failed: failedCount,
            errors: errors,
            duration: `${duration}s`,
            message: `Dostarczono: push ${pushCount}, SMS ${sentCount}`
        });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [SMS Auto-Send] Fatal error:', errorMsg);

        await logCronHeartbeat('sms-auto-send', 'error', errorMsg, Date.now() - startTime);

        return NextResponse.json({
            success: false,
            error: errorMsg,
            processed: processedCount,
            push: pushCount,
            sent: sentCount,
            failed: failedCount
        }, { status: 500 });
    }
}

/**
 * Odczytaj token potwierdzenia i short link dla przypomnienia.
 *
 * Oba powstają w `appointment-reminders`. Zwracamy `null`, gdy wiersza nie ma
 * albo brakuje tokenu — wtedy push idzie BEZ akcji potwierdzenia (SMS też jej
 * nie ma, więc kanały pozostają równoważne), a cron raportuje to w podsumowaniu.
 */
async function loadConfirmationLink(
    supabase: SupabaseClient,
    appointmentProdentisId: string | number | null,
    appointmentDate: string | null
): Promise<{ token: string; url: string } | null> {
    if (!appointmentProdentisId || !appointmentDate) return null;

    const day = String(appointmentDate).split('T')[0];
    const { data, error } = await supabase
        .from('appointment_actions')
        .select('id, confirmation_token')
        .eq('prodentis_id', String(appointmentProdentisId))
        .gte('appointment_date', `${day}T00:00:00.000Z`)
        .lte('appointment_date', `${day}T23:59:59.999Z`)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(`   ⚠️ Nie udało się odczytać tokenu potwierdzenia: ${error.message}`);
        return null;
    }

    const action = data as { id?: string; confirmation_token?: string } | null;
    const token = action?.confirmation_token;
    if (!token || !action?.id) return null;

    // Bierzemy DOKŁADNIE ten short link, który poszedł SMS-em — zamiast składać
    // adres z kawałków. Slug w `/wizyta/[type]` pochodzi z mapowania typu wizyty,
    // więc zgadywanie go tutaj rozjechałoby oba kanały przy pierwszym nietypowym
    // rodzaju wizyty. Ten sam link = ta sama strona i ta sama telemetria.
    const { data: linkRow } = await supabase
        .from('short_links')
        .select('short_code')
        .eq('appointment_id', action.id)
        .limit(1)
        .maybeSingle();

    const shortCode = (linkRow as { short_code?: string } | null)?.short_code;
    if (!shortCode) return null;

    return { token, url: `${brand.appUrl}/s/${shortCode}` };
}

/**
 * Payload pusha o wizycie.
 *
 * `url` zostaje webowy (kanał FCM w przeglądarce otwiera stronę potwierdzenia),
 * a apka rozpoznaje powiadomienie po `data.type` i przechwytuje je NATYWNIE,
 * używając tego samego `confirmationToken` co link w SMS-ie. Dzięki temu oba
 * kanały prowadzą do tej samej akcji na tym samym wierszu `appointment_actions`.
 */
function buildReminderPush(
    draft: { appointment_date?: string | null; doctor_name?: string | null; appointment_type?: string | null; prodentis_id?: string | number | null },
    confirm: { token: string; url: string } | null
): PushPayload {
    const time = draft.appointment_date
        ? String(draft.appointment_date).slice(11, 16)
        : '';
    const parts = [time && `Wizyta ${time}`, draft.doctor_name, draft.appointment_type]
        .filter(Boolean)
        .join(' — ');

    return {
        title: 'Przypomnienie o wizycie',
        body: parts || 'Masz zaplanowaną wizytę',
        url: confirm ? confirm.url : '/strefa-pacjenta/powiadomienia',
        tag: `appointment-${draft.prodentis_id ?? 'unknown'}`,
        data: {
            type: 'appointment_reminder',
            ...(confirm ? { confirmationToken: confirm.token } : {}),
        },
    };
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
