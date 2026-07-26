import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { sendSMS, toGSM7 } from '@/lib/smsService';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl';
const GENERIC_ERROR = 'Nie udało się wysłać SMS';

type PatientPrefsRow = { notification_preferences?: { careflow_reminders?: boolean } | null };

/**
 * Wyciszenie CareFlow: `patients.notification_preferences.careflow_reminders === false`
 * (ta sama semantyka co w cronie careflow-push). Brak klucza / brak wiersza pacjenta =
 * przypomnienia WŁĄCZONE. `degraded` = zapytanie padło — wołający MUSI wtedy milczeć
 * (fail-closed), bo brak odpowiedzi wygląda identycznie jak „nikt nie wyciszył".
 */
async function isCareflowMuted(
    supabase: SupabaseClient,
    prodentisId: string | null,
    patientDbId: string | null
): Promise<{ muted: boolean; degraded: boolean }> {
    let muted = false;
    let degraded = false;

    const collect = (rows: PatientPrefsRow[] | null) => {
        for (const row of rows ?? []) {
            if (row?.notification_preferences?.careflow_reminders === false) muted = true;
        }
    };

    if (prodentisId) {
        const { data, error } = await supabase
            .from('patients')
            .select('notification_preferences')
            .eq('prodentis_id', String(prodentisId));
        if (error) {
            console.error('[CareFlow SMS] patients prefs query error (prodentis_id):', error.message);
            degraded = true;
        } else {
            collect(data);
        }
    }

    if (patientDbId) {
        const { data, error } = await supabase
            .from('patients')
            .select('notification_preferences')
            .eq('id', patientDbId);
        if (error) {
            console.error('[CareFlow SMS] patients prefs query error (id):', error.message);
            degraded = true;
        } else {
            collect(data);
        }
    }

    return { muted, degraded };
}

/**
 * POST /api/admin/careflow/send-sms/[id]
 * Manually trigger SMS fallback for tasks that are ALREADY DUE in an enrollment.
 *
 * For each due (scheduled_at <= now) pending task where sms_sent=false:
 * - Sends SMS with task title + CareFlow landing page link
 * - Marks sms_sent=true
 * - Creates audit log entry
 *
 * Nie wysyła nic, gdy pacjent wyciszył przypomnienia CareFlow ani gdy nie da się
 * odczytać jego preferencji (fail-closed).
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch enrollment
        const { data: enrollment, error: eErr } = await supabase
            .from('care_enrollments')
            .select('id, patient_id, patient_db_id, patient_name, patient_phone, status, access_token')
            .eq('id', id)
            .single();

        if (eErr || !enrollment) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
        }

        if (enrollment.status !== 'active') {
            return NextResponse.json({ error: 'Enrollment is not active' }, { status: 400 });
        }

        // Normalize phone
        const phone = enrollment.patient_phone?.replace(/\s+/g, '').replace(/^\+/, '');
        if (!phone || !/^48\d{9}$/.test(phone)) {
            return NextResponse.json({
                error: `Invalid or missing phone number: "${enrollment.patient_phone || 'brak'}"`,
            }, { status: 400 });
        }

        // 2. Sprzeciw pacjenta obowiązuje też wysyłkę ręczną. Błąd odczytu preferencji =
        //    NIE wysyłamy (fail-closed) — lepiej brak SMS niż SMS wbrew wyciszeniu.
        const mute = await isCareflowMuted(supabase, enrollment.patient_id ?? null, enrollment.patient_db_id ?? null);
        if (mute.degraded) {
            return NextResponse.json({
                error: 'Nie udało się sprawdzić preferencji powiadomień pacjenta — SMS NIE został wysłany. Spróbuj ponownie za chwilę.',
            }, { status: 503 });
        }
        if (mute.muted) {
            return NextResponse.json({
                error: 'Pacjent wyłączył przypomnienia CareFlow — SMS NIE został wysłany.',
            }, { status: 409 });
        }

        // 3. Zadania WYMAGALNE TERAZ (scheduled_at <= teraz), które nie dostały jeszcze SMS.
        //    Bez warunku na termin przycisk wysyłałby cały pozostały harmonogram naraz i
        //    „zużywał" sms_sent dla dawek zaplanowanych na kolejne dni (w ich realnym
        //    terminie pacjent nie dostałby już nic).
        const nowIso = new Date().toISOString();
        const { data: pendingTasks, error: tErr } = await supabase
            .from('care_tasks')
            .select('id, title, sms_sent, push_sent_count')
            .eq('enrollment_id', id)
            .lte('scheduled_at', nowIso)
            .is('completed_at', null)
            .is('skipped_at', null)
            .eq('sms_sent', false)
            .order('sort_order', { ascending: true });

        if (tErr) {
            console.error('[CareFlow SMS] care_tasks query error:', tErr);
            return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
        }

        if (!pendingTasks || pendingTasks.length === 0) {
            return NextResponse.json({
                success: true,
                smsSent: 0,
                message: 'Brak zadań wymagalnych teraz bez wysłanego SMS. Kroki zaplanowane na później wyślą się w swoim terminie.',
            });
        }

        const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
        let smsSent = 0;
        let smsErrors = 0;
        const details: { taskId: string; title: string; success: boolean; error?: string }[] = [];

        // 4. Send SMS for each due pending task
        for (const task of pendingTasks) {
            const taskTitle = toGSM7(task.title || 'CareFlow');
            const rawMessage = `CareFlow: ${taskTitle}. Sprawdz: ${landingUrl}`;
            const smsMessage = toGSM7(rawMessage);

            try {
                const result = await sendSMS({ to: phone, message: smsMessage });

                if (result.success) {
                    smsSent++;

                    // Mark task as SMS sent
                    await supabase
                        .from('care_tasks')
                        .update({
                            sms_sent: true,
                            push_sent_count: (task.push_sent_count || 0) + 1,
                            push_last_sent_at: new Date().toISOString(),
                        })
                        .eq('id', task.id);

                    // Audit log
                    await supabase.from('care_audit_log').insert({
                        enrollment_id: id,
                        task_id: task.id,
                        action: 'manual_sms_sent',
                        actor: user.email || 'admin',
                        details: {
                            phone,
                            title: task.title,
                            message_id: result.messageId,
                            triggered_by: 'admin_panel',
                        },
                    });

                    details.push({ taskId: task.id, title: task.title, success: true });
                } else {
                    smsErrors++;
                    details.push({ taskId: task.id, title: task.title, success: false, error: result.error });
                }
            } catch (smsErr: any) {
                smsErrors++;
                details.push({ taskId: task.id, title: task.title, success: false, error: smsErr.message });
            }
        }

        console.log(`[CareFlow SMS] Manual trigger for ${enrollment.patient_name}: ${smsSent} sent, ${smsErrors} errors`);

        return NextResponse.json({
            success: true,
            smsSent,
            smsErrors,
            totalPending: pendingTasks.length,
            details,
            message: smsSent > 0
                ? `Wysłano ${smsSent} SMS do ${enrollment.patient_name}`
                : 'Nie udało się wysłać żadnego SMS',
        });
    } catch (err: any) {
        console.error('[CareFlow SMS] Error:', err);
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
}
