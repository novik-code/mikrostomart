import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pushToPatientAll } from '@/lib/pushService';
import { getPushTranslation } from '@/lib/pushTranslations';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { loadConfirmationLink, buildAppointmentReminderPush } from '@/lib/appointmentReminderPush';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Odpowiedź niesie dane pacjenta — nigdy z cache. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Okno 45-75 min łapie tę samą wizytę w kilku przebiegach — dedup po historii wysyłek. */
const DEDUP_WINDOW_MINUTES = 180;

/**
 * 1-Hour Appointment Push Notification Cron
 * 
 * Runs every 15 minutes.
 * Checks for appointments starting in the 45-75 minute window from now.
 * Sends push notifications to patients with a live push token
 * (apka mobilna Expo lub web-push FCM).
 *
 * Dedup po push_notifications_log — okno wizyt jest szersze niż odstęp między przebiegami.
 */
export async function GET(req: Request) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' }, { headers: NO_STORE });
    }

    console.log('⏰ [Push 1h] Starting 1-hour appointment push cron...');

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401, headers: NO_STORE });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let sent = 0;
    let skipped = 0;
    // 🔑 Cisza tej ścieżki znaczyła dotąd „nie wiemy", bo nigdy się nie meldowała —
    // rejestr zdrowia pokazywał ją jako milczącą od marca, mimo że cron chodził.
    const t0 = Date.now();

    try {
        // Calculate time window: 45 min to 75 min from now
        const now = new Date();
        const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

        // Format for Prodentis API date query
        const today = now.toISOString().split('T')[0];
        console.log(`⏰ [Push 1h] Checking appointments for ${today} between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

        // Fetch today's appointments from Prodentis
        const apiResponse = await prodentisFetch(`/api/appointments/by-date?date=${today}`);

        if (!apiResponse.ok) {
            throw new Error(`Prodentis API error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const appointments = data.appointments || [];

        console.log(`⏰ [Push 1h] Found ${appointments.length} total appointments for today`);

        // Filter to appointments in the 45-75 min window
        for (const apt of appointments) {
            const aptDate = new Date(apt.date);
            if (aptDate < windowStart || aptDate > windowEnd) continue;

            const aptTime = `${aptDate.getUTCHours().toString().padStart(2, '0')}:${aptDate.getUTCMinutes().toString().padStart(2, '0')}`;
            const doctorName = apt.doctor?.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || 'Lekarz';

            console.log(`⏰ [Push 1h] Processing: patient ${apt.patientId} at ${aptTime}`);

            // Find patient in our DB (+ jego preferencje powiadomień)
            const { data: patient, error: patientErr } = await supabase
                .from('patients')
                .select('id, notification_preferences')
                .eq('prodentis_id', apt.patientId)
                .maybeSingle();

            if (patientErr) {
                // Fail-closed: bez preferencji nie wiemy, czy pacjent nie wyłączył
                // przypomnień. Pauza jednego przebiegu (15 min) jest tańsza niż push
                // wbrew sprzeciwowi.
                console.error(`   ⏭ Skipping: patients query error:`, patientErr.message);
                skipped++;
                continue;
            }

            if (!patient?.id) {
                console.log(`   ⏭ Skipping: Patient not in our DB`);
                skipped++;
                continue;
            }

            // Opt-out z profilu pacjenta (strefa-pacjenta/profil → push_1h_before).
            // Brak klucza = przypomnienie WŁĄCZONE.
            const prefs = patient.notification_preferences as { push_1h_before?: boolean } | null;
            if (prefs?.push_1h_before === false) {
                console.log(`   ⏭ Skipping: Patient opted out (push_1h_before)`);
                skipped++;
                continue;
            }

            // Dwa ŻYWE źródła tokenów: apka mobilna (patient_push_tokens, klucz = prodentisId)
            // i web-push (fcm_tokens, klucz = patients.id). Dawna bramka pytała martwą
            // tabelę push_subscriptions (mig 104) → push praktycznie nigdy nie wychodził.
            const hasPushToken = await patientHasLivePushToken(supabase, String(apt.patientId), patient.id);

            if (!hasPushToken) {
                console.log(`   ⏭ Skipping: Patient not subscribed to push`);
                skipped++;
                continue;
            }

            // Treść bez zmian — ta sama translacja co dotąd (sendTranslatedPushToUser)
            const { title, body } = getPushTranslation('appointment_1h', 'pl', {
                time: aptTime,
                doctor: doctorName,
            });

            // Dedup: okno 45-75 min przy cronie co 15 min łapie tę samą wizytę
            // w kilku przebiegach. Historia wysyłek niesie czas wizyty w treści.
            const dedupSince = new Date(now.getTime() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();
            const { data: alreadySent } = await supabase
                .from('push_notifications_log')
                .select('id')
                .eq('user_id', patient.id)
                .eq('user_type', 'patient')
                .eq('body', body)
                .gte('sent_at', dedupSince)
                .limit(1);

            if (alreadySent && alreadySent.length > 0) {
                console.log(`   ⏭ Skipping: already sent for this appointment`);
                skipped++;
                continue;
            }

            // 🔴 NAPRAWA 2026-09-09 — AWARIA POTWIERDZANIA WIZYT Z PUSHA.
            // Stało tu `{ title, body, url: '/strefa-pacjenta/dashboard' }` — BEZ pola
            // `data`. Apka rozpoznaje powiadomienie o wizycie WYŁĄCZNIE po
            // `data.type === 'appointment_reminder'` (`NotificationRouter`), więc taki
            // push wpadał w fallback i otwierał ekran główny. Pacjent dostawał
            // przypomnienie godzinę przed wizytą i nie miał jak jej potwierdzić,
            // odwołać ani przełożyć.
            //
            // 🪤 Ten cron jest TRZECIM producentem pusha o wizycie. Dwa pozostałe
            // (`sms-auto-send`, `lib/reminderDelivery`) niosły `data.type` i token od
            // dawna — funkcję dostały dwie trasy z trzech. Dlatego ładunek powstaje
            // dziś we WSPÓLNYM builderze, a nie w każdym cronie osobno.
            const confirm = await loadConfirmationLink(supabase, apt.id, apt.date);
            if (!confirm) {
                console.warn(`   ⚠️ Brak linku potwierdzenia dla wizyty ${apt.id} — push pójdzie bez tokenu`);
            }

            const result = await pushToPatientAll(
                patient.id,
                buildAppointmentReminderPush({
                    title,
                    body,
                    appointmentProdentisId: apt.id,
                    confirm,
                }),
                'appointment_1h',
            );

            if (result.sent > 0) {
                sent++;
                console.log(`   ✅ Push sent to patient ${apt.patientId}: fcm=${result.fcm.sent} expo=${result.expo.sent}`);
            } else {
                skipped++;
            }
        }

        console.log(`⏰ [Push 1h] Done: ${sent} sent, ${skipped} skipped`);
        await logCronHeartbeat('push-appointment-1h', 'ok', `wysłano ${sent}, pominięto ${skipped}`, Date.now() - t0);

        return NextResponse.json({
            success: true,
            sent,
            skipped,
        }, { headers: NO_STORE });

    } catch (error: any) {
        console.error('⏰ [Push 1h] Error:', error);
        await logCronHeartbeat('push-appointment-1h', 'error', (error as Error).message?.slice(0, 200), Date.now() - t0);
        return NextResponse.json({
            success: false,
            error: 'Appointment push cron failed',
        }, { status: 500, headers: NO_STORE });
    }
}

/**
 * Czy pacjent ma jakikolwiek żywy token push?
 * patient_push_tokens jest kluczowana prodentisId (apka mobilna, mig 173),
 * fcm_tokens — patients.id (web-push, mig 104).
 */
async function patientHasLivePushToken(
    supabase: SupabaseClient,
    prodentisId: string,
    patientDbId: string
): Promise<boolean> {
    const [expoRes, fcmRes] = await Promise.all([
        supabase
            .from('patient_push_tokens')
            .select('id')
            .eq('patient_id', prodentisId)
            .limit(1),
        supabase
            .from('fcm_tokens')
            .select('id')
            .eq('user_id', patientDbId)
            .eq('user_type', 'patient')
            .limit(1),
    ]);

    if (expoRes.error) console.error('⏰ [Push 1h] patient_push_tokens query error:', expoRes.error.message);
    if (fcmRes.error) console.error('⏰ [Push 1h] fcm_tokens query error:', fcmRes.error.message);

    return (expoRes.data?.length ?? 0) > 0 || (fcmRes.data?.length ?? 0) > 0;
}
