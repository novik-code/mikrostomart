import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { sendSMS, toGSM7 } from '@/lib/smsService';
import { generateCareflowReport } from '@/lib/careflowPdf';
import { pushToPatientAll } from '@/lib/pushService';
import { buildTasks, warsawIso, PAST_DUE_NOTE, type CareStepRow } from '@/lib/careflowSchedule';

export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl';

/**
 * Treść pusha, jaką NAPRAWDĘ wysyła cron (`/api/cron/careflow-push`): neutralna,
 * bez tytułu zadania i bez tokenu w URL, bo `pushService` loguje title/body/url do
 * push_notifications_log czytanego przez cały personel (RODO art. 9). Symulator
 * pokazuje dokładnie te stałe — inaczej „podgląd pusha" reklamowałby treść, która
 * nigdy nie poleci, i uczyłby, że nazwa leku na ekranie blokady jest w porządku.
 */
const PUSH_TITLE = 'Mikrostomart';
const PUSH_BODY = 'Masz przypomnienie w planie opieki. Otwórz aplikację.';
const PUSH_LANDING_PATH = '/strefa-pacjenta/dashboard';

type SupabaseLike = ReturnType<typeof createClient>;

/**
 * Każda akcja modyfikująca musi trafić w zapis symulatora. Bez tego ręczne
 * wywołanie z `enrollmentId` REALNEGO pacjenta fabrykowało potwierdzenia zadań
 * (aktor 'simulator') i zamykało prawdziwy protokół — czyli wstawiało do
 * dokumentacji medycznej twierdzenie, że pacjent coś wykonał.
 */
async function loadSimulatorEnrollment(supabase: SupabaseLike, enrollmentId: string) {
    const { data } = await supabase
        .from('care_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .eq('enrolled_by', 'simulator')
        .maybeSingle();
    return data || null;
}

const notSimulatorResponse = () =>
    NextResponse.json({ error: 'Nie znaleziono zapisu symulatora o tym identyfikatorze' }, { status: 404 });

/**
 * Ta sama interpretacja daty co w `/api/employee/careflow/enroll` — bez tego symulator
 * czytałby `2026-07-27T15:30:00` jako czas SERWERA (na Vercelu UTC) i pokazywał plan
 * przesunięty o 1-2 h względem tego, co realnie dostanie pacjent.
 */
function parseAppointmentDate(value: string): Date {
    const raw = String(value).trim();
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(raw);
    if (match && !hasZone) return new Date(warsawIso(match[1], match[2]));
    return new Date(raw);
}

/**
 * CareFlow Simulator API
 * POST /api/admin/careflow/simulate
 * 
 * Narzędzie testowe przechodzące pełny cykl CareFlow na danych symulacyjnych.
 * Harmonogram liczy TYM SAMYM `buildTasks` co realny zapis pacjenta — inaczej
 * „test protokołu" pokazywałby plan, który nigdy nie powstanie.
 *
 * Actions: setup, push, complete, complete_all, report, cleanup, status
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

        const body = await req.json();
        const { action, enrollmentId, taskId, dryRun = true } = body;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        switch (action) {
            case 'setup':
                return handleSetup(supabase, body);
            case 'push':
                return handlePush(supabase, enrollmentId, dryRun);
            case 'complete':
                return handleComplete(supabase, enrollmentId, taskId);
            case 'complete_all':
                return handleCompleteAll(supabase, enrollmentId);
            case 'report':
                return handleReport(supabase, enrollmentId, dryRun);
            case 'cleanup':
                return handleCleanup(supabase, enrollmentId);
            case 'status':
                return handleStatus(supabase, enrollmentId);
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err) {
        // Surowy komunikat Postgresa nie wychodzi na zewnątrz — zostaje w logach.
        console.error('[CareFlow Simulator] Error:', err);
        return NextResponse.json({ error: 'Symulator nie mógł wykonać operacji' }, { status: 500 });
    }
}

// ────────────────────────────────────────────────────
// ACTION: SETUP — Create enrollment + tasks from template
// ────────────────────────────────────────────────────
async function handleSetup(supabase: any, body: any) {
    const {
        patientName = 'Nowosielski Marcin',
        patientPhone = '',
        doctorName = 'Marcin Nowosielski',
        appointmentDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + 'T15:30:00',
        templateName,
    } = body;

    console.log(`🧪 [Simulator] Setup: ${patientName}, appointment ${appointmentDate}`);

    // Find the template (default: Zabieg chirurgiczny)
    let templateQuery = supabase.from('care_templates').select('*').eq('is_active', true);
    if (templateName) {
        templateQuery = templateQuery.ilike('name', `%${templateName}%`);
    } else {
        templateQuery = templateQuery.ilike('name', '%chirurgiczny%');
    }
    const { data: templates, error: tErr } = await templateQuery;
    if (tErr) console.error('[CareFlow Simulator] Template lookup failed:', tErr);
    if (tErr || !templates?.length) {
        return NextResponse.json({ error: 'Nie znaleziono pasującego protokołu' }, { status: 404 });
    }
    const template = templates[0];

    // Get template steps
    const { data: steps } = await supabase
        .from('care_template_steps')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order', { ascending: true });

    if (!steps?.length) {
        return NextResponse.json({ error: 'Template has no steps' }, { status: 400 });
    }

    // Check for existing simulator enrollment
    const { data: existing } = await supabase
        .from('care_enrollments')
        .select('id')
        .eq('enrolled_by', 'simulator')
        .eq('status', 'active')
        .maybeSingle();

    if (existing) {
        return NextResponse.json({
            error: 'Istnieje już aktywna symulacja. Najpierw uruchom cleanup.',
            existingId: existing.id,
        }, { status: 409 });
    }

    const appointmentDateObj = parseAppointmentDate(appointmentDate);
    if (Number.isNaN(appointmentDateObj.getTime())) {
        return NextResponse.json({ error: 'Nieprawidłowa data zabiegu' }, { status: 400 });
    }

    const pushSettings = template.push_settings || {};
    const quietStart = pushSettings.quiet_hours_start ?? 22;
    const quietEnd = pushSettings.quiet_hours_end ?? 7;
    const medications = template.default_medications || [];

    // Create enrollment
    const { data: enrollment, error: eErr } = await supabase
        .from('care_enrollments')
        .insert({
            patient_id: 'SIM-' + Date.now(),
            patient_name: patientName,
            patient_phone: patientPhone || null,
            patient_db_id: null,
            template_id: template.id,
            template_name: template.name,
            appointment_id: 'SIM-APT-' + Date.now(),
            appointment_date: appointmentDateObj.toISOString(),
            doctor_name: doctorName,
            enrolled_by: 'simulator',
        })
        .select()
        .single();

    if (eErr) throw new Error(eErr.message);

    // Zadania generuje ten sam `buildTasks` co realny zapis pacjenta (enroll, akceptacja
    // propozycji, cron). Wcześniej symulator miał własną kopię pętli i własny smart-snap,
    // więc „test protokołu" pokazywał inny plan niż ten, który naprawdę powstawał:
    // bez rekurencji kroków, z sort_order z kroku i ze strefą serwera zamiast Europe/Warsaw.
    //
    // `now` JEST OBOWIĄZKOWE: to wiersze w PRODUKCYJNEJ tabeli care_tasks, a produkcyjny
    // cron nie filtruje po `enrolled_by`. Bez `now` symulacja z dzisiejszą datą tworzyła
    // aktywne zadania po terminie, które cron zaraz rozsyłał serią realnych SMS-ów na
    // numer wpisany w formularzu. Z `now` kroki zaległe powstają od razu pominięte —
    // dokładnie tak jak przy realnym zapisie (patrz PAST_GRACE_HOURS).
    const generatedAt = new Date();
    const taskRows = buildTasks({
        steps: steps as CareStepRow[],
        medications,
        appointmentDate: appointmentDateObj,
        quietStart,
        quietEnd,
        now: generatedAt,
    }).map((row) => ({ ...row, enrollment_id: enrollment.id }));

    // Rozdzielamy „pominięte przez system, bo termin minął przed zapisem" od zadań do
    // wykonania — inaczej tester zobaczy w statusie „skipped" i uzna, że pacjent odpuścił.
    const pastDueSkipped = taskRows.filter((row) => row.skipped_at !== null).length;

    const { error: taskErr } = await supabase.from('care_tasks').insert(taskRows);
    if (taskErr) throw new Error(`Task creation: ${taskErr.message}`);

    // Audit log
    await supabase.from('care_audit_log').insert({
        enrollment_id: enrollment.id,
        action: 'simulator_setup',
        actor: 'simulator',
        details: {
            template_name: template.name,
            patient_name: patientName,
            tasks_created: taskRows.length,
            appointment_date: appointmentDate,
        },
    });

    console.log(`🧪 [Simulator] Created enrollment ${enrollment.id} with ${taskRows.length} tasks`);

    return NextResponse.json({
        success: true,
        enrollmentId: enrollment.id,
        accessToken: enrollment.access_token,
        landingPageUrl: `/opieka/${enrollment.access_token}`,
        tasksCreated: taskRows.length,
        templateName: template.name,
    });
}

// ────────────────────────────────────────────────────
// ACTION: PUSH — Send push/SMS for pending tasks
// ────────────────────────────────────────────────────
async function handlePush(supabase: any, enrollmentId: string, dryRun: boolean) {
    if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 });

    console.log(`🧪 [Simulator] Push for enrollment ${enrollmentId} (dryRun=${dryRun})`);

    const { data: enrollment } = await supabase
        .from('care_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single();

    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    // Find pending tasks: scheduled_at <= now, not completed, not skipped
    const now = new Date();
    const { data: pendingTasks } = await supabase
        .from('care_tasks')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .is('completed_at', null)
        .is('skipped_at', null)
        .lte('scheduled_at', now.toISOString())
        .order('sort_order', { ascending: true });

    const results: any[] = [];

    for (const task of (pendingTasks || [])) {
        const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
        const pushTitle = task.icon ? `${task.icon} CareFlow` : '🏥 CareFlow';
        const pushBody = task.push_message || task.title;

        if (dryRun) {
            // DRY RUN — only log, don't actually send
            results.push({
                taskId: task.id,
                title: task.title,
                action: 'dry_run',
                pushTitle,
                pushBody,
                landingUrl,
                wouldSendSms: !task.sms_sent && !!enrollment.patient_phone,
            });

            // Update push count even in dry-run (to test the logic)
            await supabase.from('care_tasks').update({
                push_sent_count: (task.push_sent_count || 0) + 1,
                push_last_sent_at: now.toISOString(),
            }).eq('id', task.id);

            await supabase.from('care_audit_log').insert({
                enrollment_id: enrollmentId,
                task_id: task.id,
                action: 'simulator_push_dryrun',
                actor: 'simulator',
                details: { title: task.title, push_count: (task.push_sent_count || 0) + 1 },
            });
        } else {
            // REAL SEND — push first, SMS fallback
            let sent = false;

            // Try push if patient has DB ID.
            // Treść MUSI być neutralna i BEZ tokenu — tak jak w produkcyjnym cronie:
            // pushService.logPush zapisuje title/body/url do push_notifications_log,
            // czytanego przez cały personel. Symulator nie może być tylną furtką,
            // którą nazwa leku i bezhasłowy link wracają do historii powiadomień.
            if (enrollment.patient_db_id) {
                try {
                    const pushResult = await pushToPatientAll(enrollment.patient_db_id, {
                        title: PUSH_TITLE,
                        body: PUSH_BODY,
                        url: PUSH_LANDING_PATH,
                        data: { type: 'careflow', enrollmentId, taskId: task.id },
                    });
                    sent = pushResult.sent > 0;
                } catch (e: any) {
                    console.log(`🧪 Push failed: ${e.message}`);
                }
            }

            if (sent) {
                results.push({ taskId: task.id, title: task.title, action: 'push_sent' });
                await supabase.from('care_tasks').update({
                    push_sent_count: (task.push_sent_count || 0) + 1,
                    push_last_sent_at: now.toISOString(),
                }).eq('id', task.id);
                await supabase.from('care_audit_log').insert({
                    enrollment_id: enrollmentId,
                    task_id: task.id,
                    action: 'push_sent',
                    actor: 'simulator',
                    details: { push_count: (task.push_sent_count || 0) + 1 },
                });
            } else if (!task.sms_sent && enrollment.patient_phone) {
                // SMS fallback
                const phone = enrollment.patient_phone.replace(/\s+/g, '').replace(/^\+/, '');
                if (/^48\d{9}$/.test(phone)) {
                    const taskTitle = toGSM7(task.title || 'CareFlow');
                    const smsMessage = toGSM7(`CareFlow: ${taskTitle}. Sprawdz: ${landingUrl}`);
                    const smsResult = await sendSMS({ to: phone, message: smsMessage });

                    if (smsResult.success) {
                        results.push({ taskId: task.id, title: task.title, action: 'sms_sent' });
                        await supabase.from('care_tasks').update({
                            sms_sent: true,
                            push_sent_count: (task.push_sent_count || 0) + 1,
                            push_last_sent_at: now.toISOString(),
                        }).eq('id', task.id);
                        await supabase.from('care_audit_log').insert({
                            enrollment_id: enrollmentId,
                            task_id: task.id,
                            action: 'sms_fallback_sent',
                            actor: 'simulator',
                            details: { phone, message_id: smsResult.messageId },
                        });
                    } else {
                        results.push({ taskId: task.id, title: task.title, action: 'sms_failed', error: smsResult.error });
                    }
                }
            } else {
                results.push({ taskId: task.id, title: task.title, action: 'skipped', reason: 'no push sub, no phone or sms already sent' });
            }
        }
    }

    return NextResponse.json({
        success: true,
        dryRun,
        totalPending: pendingTasks?.length || 0,
        results,
    });
}

// ────────────────────────────────────────────────────
// ACTION: COMPLETE — Mark a single task as done
// ────────────────────────────────────────────────────
async function handleComplete(supabase: any, enrollmentId: string, taskId: string) {
    if (!enrollmentId || !taskId) return NextResponse.json({ error: 'enrollmentId + taskId required' }, { status: 400 });

    const now = new Date().toISOString();
    await supabase.from('care_tasks').update({ completed_at: now }).eq('id', taskId);
    await supabase.from('care_audit_log').insert({
        enrollment_id: enrollmentId,
        task_id: taskId,
        action: 'simulator_task_completed',
        actor: 'simulator',
        details: { completed_at: now },
    });

    return NextResponse.json({ success: true, taskId, completedAt: now });
}

// ────────────────────────────────────────────────────
// ACTION: COMPLETE_ALL — Mark all tasks as done, set enrollment completed
// ────────────────────────────────────────────────────
async function handleCompleteAll(supabase: any, enrollmentId: string) {
    if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 });

    const now = new Date().toISOString();

    // Mark all incomplete tasks
    const { data: tasks } = await supabase
        .from('care_tasks')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .is('completed_at', null)
        .is('skipped_at', null);

    let completed = 0;
    for (const task of (tasks || [])) {
        await supabase.from('care_tasks').update({ completed_at: now }).eq('id', task.id);
        completed++;
    }

    // Set enrollment as completed
    await supabase.from('care_enrollments').update({
        status: 'completed',
        completed_at: now,
    }).eq('id', enrollmentId);

    await supabase.from('care_audit_log').insert({
        enrollment_id: enrollmentId,
        action: 'simulator_all_completed',
        actor: 'simulator',
        details: { tasks_completed: completed },
    });

    return NextResponse.json({ success: true, tasksCompleted: completed });
}

// ────────────────────────────────────────────────────
// ACTION: REPORT — Generate PDF (and optionally export to Prodentis)
// ────────────────────────────────────────────────────
async function handleReport(supabase: any, enrollmentId: string, dryRun: boolean) {
    if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 });

    const { data: enrollment } = await supabase
        .from('care_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single();

    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    const { data: tasks } = await supabase
        .from('care_tasks')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .order('sort_order', { ascending: true });

    const { data: auditLog } = await supabase
        .from('care_audit_log')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .order('created_at', { ascending: true });

    // Generate PDF
    const pdfBytes = await generateCareflowReport({
        enrollment,
        tasks: tasks || [],
        auditLog: auditLog || [],
    });

    // Upload to storage
    const fileName = `sim-careflow-${enrollmentId.slice(0, 8)}-${Date.now()}.pdf`;
    const filePath = `careflow-reports/${fileName}`;

    const { error: uploadErr } = await supabase.storage
        .from('careflow-reports')
        .upload(filePath, pdfBytes, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadErr) {
        // Try creating bucket
        if (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket')) {
            await supabase.storage.createBucket('careflow-reports', { public: false, fileSizeLimit: 5 * 1024 * 1024 });
            const { error: retryErr } = await supabase.storage.from('careflow-reports').upload(filePath, pdfBytes, {
                contentType: 'application/pdf', cacheControl: '3600', upsert: false,
            });
            if (retryErr) throw retryErr;
        } else {
            throw uploadErr;
        }
    }

    const { data: signedUrl } = await supabase.storage
        .from('careflow-reports')
        .createSignedUrl(filePath, 365 * 24 * 60 * 60);

    const reportUrl = signedUrl?.signedUrl || filePath;

    await supabase.from('care_enrollments').update({
        report_pdf_url: reportUrl,
        report_generated_at: new Date().toISOString(),
    }).eq('id', enrollmentId);

    await supabase.from('care_audit_log').insert({
        enrollment_id: enrollmentId,
        action: 'simulator_report_generated',
        actor: 'simulator',
        details: { file_name: fileName, dry_run: dryRun },
    });

    return NextResponse.json({
        success: true,
        reportUrl,
        fileName,
        pdfSizeKb: Math.round(pdfBytes.length / 1024),
    });
}

// ────────────────────────────────────────────────────
// ACTION: CLEANUP — Delete all simulation data
// ────────────────────────────────────────────────────
async function handleCleanup(supabase: any, enrollmentId?: string) {
    let query = supabase.from('care_enrollments').select('id');
    if (enrollmentId) {
        query = query.eq('id', enrollmentId).eq('enrolled_by', 'simulator');
    } else {
        query = query.eq('enrolled_by', 'simulator');
    }

    const { data: enrollments } = await query;
    let deleted = 0;

    for (const e of (enrollments || [])) {
        // Delete audit log
        await supabase.from('care_audit_log').delete().eq('enrollment_id', e.id);
        // Delete tasks
        await supabase.from('care_tasks').delete().eq('enrollment_id', e.id);
        // Delete enrollment
        await supabase.from('care_enrollments').delete().eq('id', e.id);
        // Try to delete report files
        try {
            const prefix = `careflow-reports/sim-careflow-${e.id.slice(0, 8)}`;
            const { data: files } = await supabase.storage.from('careflow-reports').list('careflow-reports', { search: `sim-careflow-${e.id.slice(0, 8)}` });
            if (files?.length) {
                await supabase.storage.from('careflow-reports').remove(files.map((f: any) => `careflow-reports/${f.name}`));
            }
        } catch { /* non-critical */ }
        deleted++;
    }

    return NextResponse.json({ success: true, enrollmentsDeleted: deleted });
}

// ────────────────────────────────────────────────────
// ACTION: STATUS — Return current enrollment state
// ────────────────────────────────────────────────────
async function handleStatus(supabase: any, enrollmentId?: string) {
    // Find simulator enrollment(s)
    let query = supabase.from('care_enrollments').select('*').eq('enrolled_by', 'simulator');
    if (enrollmentId) {
        query = query.eq('id', enrollmentId);
    }
    query = query.order('created_at', { ascending: false }).limit(1);

    const { data: enrollments } = await query;
    const enrollment = enrollments?.[0];

    if (!enrollment) {
        return NextResponse.json({ exists: false });
    }

    // Get tasks
    const { data: tasks } = await supabase
        .from('care_tasks')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .order('sort_order', { ascending: true });

    // Get audit log (last 30)
    const { data: auditLog } = await supabase
        .from('care_audit_log')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false })
        .limit(30);

    const now = new Date();
    const tasksWithStatus = (tasks || []).map((t: any) => ({
        ...t,
        _status: t.completed_at ? 'completed' :
                 t.skipped_at ? 'skipped' :
                 new Date(t.scheduled_at) <= now ? 'pending' : 'future',
    }));

    return NextResponse.json({
        exists: true,
        enrollment: {
            ...enrollment,
            landingPageUrl: `/opieka/${enrollment.access_token}`,
        },
        tasks: tasksWithStatus,
        auditLog: (auditLog || []).reverse(),
        stats: {
            total: tasksWithStatus.length,
            completed: tasksWithStatus.filter((t: any) => t._status === 'completed').length,
            pending: tasksWithStatus.filter((t: any) => t._status === 'pending').length,
            future: tasksWithStatus.filter((t: any) => t._status === 'future').length,
        },
    });
}
