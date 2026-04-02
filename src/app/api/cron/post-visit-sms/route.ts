import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatSMSMessage } from '@/lib/smsService';
import { sendPushToUser } from '@/lib/pushService';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { randomUUID } from 'crypto';
import { isSmsTypeEnabled } from '@/lib/smsSettings';
import { demoSanitize, brand } from '@/lib/brandConfig';

export const maxDuration = 120;

const PRODENTIS_API_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

const SURVEY_URL = `${brand.appUrl}/strefa-pacjenta/ocen-nas`;

/**
 * Detect whether a Polish first name is female.
 * Rule: names ending in 'a' (excl. Kuba) → female.
 */
function detectGender(firstName: string): 'female' | 'male' {
    const name = firstName.trim().toLowerCase();
    const MALE_A_ENDINGS = ['kuba', 'barnaba', 'bonawentura', 'kalina', 'costa', 'sasha'];
    if (MALE_A_ENDINGS.includes(name)) return 'male';
    if (name.endsWith('a')) return 'female';
    return 'male';
}

/**
 * Generate formal Polish salutation: "Pani Agnieszko" / "Panie Marcinie"
 * Uses nominative "Pani [imię]" / "Pan [imię]" — simpler and universally accepted.
 */
function buildSalutation(firstName: string): string {
    const gender = detectGender(firstName);
    return gender === 'female' ? `Pani ${firstName}` : `Panie ${firstName}`;
}

function isDoctorInList(apiDoctorName: string, doctorList: string[]): boolean {
    const normalize = (name: string) =>
        name.replace(/\s*\(I\)\s*/g, ' ')
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    const normalizedApi = normalize(apiDoctorName);
    return doctorList.some(listName => {
        const normalizedList = normalize(listName);
        const apiParts = normalizedApi.split(' ');
        const listParts = normalizedList.split(' ');
        return listParts.every(part => apiParts.some(ap => ap.includes(part) || part.includes(ap)))
            || apiParts.every(part => listParts.some(lp => lp.includes(part) || part.includes(lp)));
    });
}

function normalName(name: string): string {
    return name.toLowerCase().replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function patientAlreadyReviewed(patientName: string, reviewerNames: string[]): boolean {
    const norm = normalName(patientName);
    const normParts = norm.split(' ').filter(Boolean);
    return reviewerNames.some(reviewer => {
        const revNorm = normalName(reviewer);
        return normParts.every(part => revNorm.includes(part));
    });
}

// Default templates (ASCII-safe for GSM-7 encoding, ≤160 chars)
const FALLBACK_TEMPLATE_REVIEW = `Dziekujemy za wizyte, {salutation}! Prosimy o krotka ocene: {surveyUrl} ${brand.smsSenderName}`;
const FALLBACK_TEMPLATE_REVIEWED = `Dziekujemy za wizyte, {salutation}! Do zobaczenia na kolejnej wizycie. ${brand.smsSenderName}`;

/**
 * POST-VISIT SMS Cron — Stage 1: Generate DRAFTS
 *
 * Schedule: 0 18 * * * (18:00 UTC = 19:00 Warsaw CET)
 *
 * Flow:
 * 1. Fetch appointments from today
 * 2. Filter: same logic as appointment-reminders (isWorkingHour, business hours, doctor list)
 * 3. Separate patients who already left a Google review (already_reviewed = true)
 * 4. Save as DRAFT (status='draft', sms_type='post_visit')
 * 5. Push to admin — auto-send fires 1h later via /api/cron/post-visit-auto-send
 *
 * Returns: {draftsCreated, skipped, skippedDetails[], errors[]}
 */
export async function GET(req: Request) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('[Post-Visit SMS] Starting draft generation...');
    const startTime = Date.now();

    // Check if post-visit SMS is enabled
    const smsEnabled = await isSmsTypeEnabled('post_visit');
    if (!smsEnabled) {
        console.log('[Post-Visit SMS] Disabled via admin settings');
        return NextResponse.json({ success: true, skipped: true, reason: 'SMS type disabled' });
    }

    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';
    const overrideDate = url.searchParams.get('date');

    if (!isCronAuth && !isManualTrigger && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let draftsCreated = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const skippedDetails: Array<{ name: string; doctor: string; time: string; reason: string }> = [];

    try {
        const targetDate = overrideDate
            ? new Date(overrideDate)
            : new Date();
        const targetDateStr = targetDate.toISOString().split('T')[0];
        console.log(`📅 [Post-Visit SMS] Target date: ${targetDateStr}`);

        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDateStr}`;
        const apiResponse = await fetch(apiUrl, { headers: { 'Content-Type': 'application/json' } });
        if (!apiResponse.ok) throw new Error(`Prodentis API error: ${apiResponse.status}`);

        const data = await apiResponse.json();
        const appointments = data.appointments || [];
        console.log(`📊 Total appointments from Prodentis: ${appointments.length}`);

        if (appointments.length === 0) {
            return NextResponse.json({ success: true, draftsCreated: 0, skipped: 0, message: `No appointments on ${targetDateStr}` });
        }

        // Load templates
        const { data: templates } = await supabase.from('sms_templates').select('key, template');
        const templateMap = new Map<string, string>();
        for (const t of templates || []) templateMap.set(t.key.toLowerCase(), t.template);
        const templateReview = templateMap.get('post_visit_review') || FALLBACK_TEMPLATE_REVIEW;
        const templateReviewed = templateMap.get('post_visit_reviewed') || FALLBACK_TEMPLATE_REVIEWED;

        // Load patient reviews list
        let reviewerNames: string[] = [];
        try {
            const reviewsRes = await fetch(`${PRODENTIS_API_URL}/api/patient-reviews?minRating=4`);
            if (reviewsRes.ok) {
                const reviewsData = await reviewsRes.json();
                reviewerNames = (reviewsData.reviews || []).map((r: any) => r.patientName || '').filter(Boolean);
            }
        } catch { /* non-critical */ }

        // Clean up old draft post_visit entries for today (re-run safety)
        await supabase.from('sms_reminders')
            .delete()
            .eq('sms_type', 'post_visit')
            .in('status', ['draft', 'cancelled', 'failed'])
            .gte('appointment_date', `${targetDateStr}T00:00:00.000Z`)
            .lte('appointment_date', `${targetDateStr}T23:59:59.999Z`);

        // Already-sent post-visit SMS (dedup by prodentis_id)
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('prodentis_id')
            .eq('sms_type', 'post_visit')
            .eq('status', 'sent');
        const alreadySentIds = new Set<string>((alreadySent || []).map((r: any) => String(r.prodentis_id)));

        const MIN_HOUR = 8;
        const MAX_HOUR = 20;

        for (const appointment of appointments) {
            const appointmentDate = new Date(appointment.date);
            const aptHour = appointmentDate.getUTCHours();
            const aptMin = appointmentDate.getUTCMinutes();
            const appointmentTime = `${aptHour.toString().padStart(2, '0')}:${aptMin.toString().padStart(2, '0')}`;
            const doctorName = (appointment.doctor?.name || '').replace(/\s*\(I\)\s*/g, ' ').trim();
            const patientName = appointment.patientName || '';
            const phone = appointment.patientPhone;

            try {
                // Filter 1: Phone number
                if (!phone) {
                    skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: 'Brak numeru telefonu' });
                    skippedCount++; continue;
                }

                const isNowosielska = doctorName.toLowerCase().includes('nowosielska') &&
                    (doctorName.toLowerCase().includes('elżbieta') || doctorName.toLowerCase().includes('elzbieta'));

                if (isNowosielska) {
                    // Filter 2a: Nowosielska custom hours 08:30-16:00
                    const totalMin = aptHour * 60 + aptMin;
                    if (totalMin < 8 * 60 + 30 || totalMin >= 16 * 60) {
                        skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: `Poza godzinami E. Nowosielskiej (08:30-16:00)` });
                        skippedCount++; continue;
                    }
                } else {
                    // Filter 2b: isWorkingHour flag — coerce to boolean (Prodentis may return string 'true')
                    const isWorking = appointment.isWorkingHour === true || appointment.isWorkingHour === 'true';
                    if (!isWorking) {
                        skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: 'Nie jest godzina robocza (szare/czerwone pole w Prodentis)' });
                        skippedCount++; continue;
                    }
                    // Filter 3: Business hours 08:00-20:00
                    if (aptHour < MIN_HOUR || aptHour >= MAX_HOUR) {
                        skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: `Poza oknem 08:00-20:00 (wizyta: ${appointmentTime})` });
                        skippedCount++; continue;
                    }
                    // Filter 4: Doctor in list
                    if (!isDoctorInList(doctorName, REMINDER_DOCTORS)) {
                        skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: `Lekarz nie jest na liście REMINDER_DOCTORS (${doctorName})` });
                        skippedCount++; continue;
                    }
                }

                // Filter 5: Already sent post-visit SMS
                const appointmentId = String(appointment.id);
                if (alreadySentIds.has(appointmentId)) {
                    skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: 'SMS po wizycie już wysłany wcześniej' });
                    skippedCount++; continue;
                }

                // Build salutation and message
                const patientFirstName = patientName.split(' ').find((p: string) => p.length > 1) || patientName.split(' ')[0];
                const salutation = buildSalutation(patientFirstName);
                const alreadyReviewed = patientAlreadyReviewed(patientName, reviewerNames);

                const smsTemplate = alreadyReviewed ? templateReviewed : templateReview;
                const message = formatSMSMessage(smsTemplate, {
                    patientFirstName,
                    patientName,
                    salutation,
                    doctor: doctorName,
                    doctorName,
                    surveyUrl: SURVEY_URL,
                });

                // Patient ID lookup
                let patientId: string | null = null;
                const { data: patientRow } = await supabase
                    .from('patients').select('id').eq('prodentis_id', appointment.patientId).maybeSingle();
                patientId = patientRow?.id || null;

                // Insert draft
                const { error: insertError } = await supabase.from('sms_reminders').insert({
                    id: randomUUID(),
                    patient_id: patientId,       // nullable after migration 046
                    prodentis_id: String(appointment.id),
                    patient_name: patientName || 'Nieznany pacjent',
                    phone,
                    appointment_date: appointment.date,
                    doctor_name: doctorName,
                    // doctor_id intentionally omitted — not available in post-visit cron
                    appointment_type: appointment.appointmentType?.name || '',
                    sms_message: message,
                    status: 'draft',
                    sms_type: 'post_visit',
                    already_reviewed: alreadyReviewed,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                if (insertError) {
                    skippedDetails.push({
                        name: patientName,
                        doctor: doctorName,
                        time: appointmentTime,
                        reason: `BLAD INSERT: ${insertError.message}`,
                    });
                    skippedCount++;
                    continue;
                }

                draftsCreated++;
                console.log(`   📋 Draft: ${patientName} | ${salutation} | already_reviewed=${alreadyReviewed}`);

            } catch (err: any) {
                // Route INSERT/DB errors to skippedDetails so they are visible in admin panel
                skippedDetails.push({
                    name: patientName,
                    doctor: doctorName,
                    time: appointmentTime,
                    reason: `BLAD DB: ${err.message}`,
                });
                skippedCount++;
            }
        }

        // Push to admin
        if (draftsCreated > 0) {
            try {
                const { data: adminUsers } = await supabase
                    .from('push_subscriptions').select('user_id').eq('role', 'admin').limit(10);
                const adminUserIds = [...new Set((adminUsers || []).map((u: any) => u.user_id))];
                for (const userId of adminUserIds) {
                    await sendPushToUser(userId, 'admin', {
                        title: `✉️ SMS po wizycie: ${draftsCreated} szkiców gotowych`,
                        body: `Sprawdź i zatwierdź w panelu admin. Wyślemy je za 1 godzinę.`,
                        url: '/admin',
                    });
                }
            } catch (pushErr: any) {
                console.error('Push notification failed (non-critical):', pushErr.message);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`📊 Done: drafts=${draftsCreated} skipped=${skippedCount} errors=${errors.length} (${duration}s)`);

        await logCronHeartbeat('post-visit-sms', 'ok', `Drafts: ${draftsCreated}, Skipped: ${skippedCount}`, Date.now() - startTime);

        return NextResponse.json({
            success: true,
            targetDate: targetDateStr,
            totalAppointments: appointments.length,
            draftsCreated,
            skipped: skippedCount,
            skippedDetails,
            errors: errors.length > 0 ? errors : undefined,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('💥 [Post-Visit SMS] Fatal error:', error.message);
        await logCronHeartbeat('post-visit-sms', 'error', error.message, Date.now() - startTime);
        return NextResponse.json({ success: false, error: error.message, draftsCreated }, { status: 500 });
    }
}
