import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatSMSMessage } from '@/lib/smsService';
import { sendPushToUser } from '@/lib/webpush';
import { randomUUID } from 'crypto';
import { isSmsTypeEnabled } from '@/lib/smsSettings';

export const maxDuration = 120;

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
const APP_URL = 'https://mikrostomart.pl/aplikacja';

const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

/**
 * Detect whether a Polish first name is female.
 * Rule: names ending in 'a' (excl. Kuba etc.) → female.
 */
function detectGender(firstName: string): 'female' | 'male' {
    const name = firstName.trim().toLowerCase();
    const MALE_A_ENDINGS = ['kuba', 'barnaba', 'bonawentura', 'sasha', 'costa'];
    if (MALE_A_ENDINGS.includes(name)) return 'male';
    if (name.endsWith('a')) return 'female';
    return 'male';
}

function buildSalutation(firstName: string): string {
    const gender = detectGender(firstName);
    return gender === 'female' ? `Pani ${firstName}` : `Panie ${firstName}`;
}

function isDoctorInList(apiDoctorName: string, doctorList: string[]): boolean {
    const normalize = (name: string) =>
        name.replace(/\s*\(I\)\s*/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedApi = normalize(apiDoctorName);
    return doctorList.some(listName => {
        const normalizedList = normalize(listName);
        const apiParts = normalizedApi.split(' ');
        const listParts = normalizedList.split(' ');
        return listParts.every(part => apiParts.some(ap => ap.includes(part) || part.includes(ap)))
            || apiParts.every(part => listParts.some(lp => lp.includes(part) || part.includes(lp)));
    });
}

const FALLBACK_TEMPLATE = `Dziekujemy ze jestes naszym pacjentem! Pobierz nasza aplikacje: {appUrl} Mikrostomart`;

/**
 * WEEK-AFTER-VISIT SMS Cron — Stage 1: Generate DRAFTS
 *
 * Schedule: 0 9 * * * (9:00 UTC = 10:00 Warsaw CET)
 *
 * Flow:
 * 1. Fetch appointments from 7 days ago
 * 2. Filter: same logic as appointment-reminders (isWorkingHour, business hours, doctor list)
 * 3. Save as DRAFT (status='draft', sms_type='week_after_visit')
 * 4. Push to admin — auto-send fires ~1h later via post-visit-auto-send
 *
 * Returns: {draftsCreated, skipped, skippedDetails[], errors[]}
 */
export async function GET(req: Request) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('[Week-After SMS] Starting draft generation...');
    const startTime = Date.now();

    // Check if week-after-visit SMS is enabled
    const smsEnabled = await isSmsTypeEnabled('week_after_visit');
    if (!smsEnabled) {
        console.log('[Week-After SMS] Disabled via admin settings');
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
    const skippedDetails: Array<{ name: string; doctor: string; time: string; reason: string }> = [];

    try {
        const targetDate = overrideDate
            ? new Date(overrideDate)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const targetDateStr = targetDate.toISOString().split('T')[0];
        console.log(`📅 [Week-After-Visit SMS] Target date (7 days ago): ${targetDateStr}`);

        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDateStr}`;
        const apiResponse = await fetch(apiUrl, { headers: { 'Content-Type': 'application/json' } });
        if (!apiResponse.ok) throw new Error(`Prodentis API error: ${apiResponse.status}`);

        const data = await apiResponse.json();
        const appointments = data.appointments || [];
        console.log(`📊 Total appointments from Prodentis: ${appointments.length}`);

        if (appointments.length === 0) {
            return NextResponse.json({ success: true, draftsCreated: 0, skipped: 0, message: `No appointments on ${targetDateStr}` });
        }

        // Load template
        const { data: templates } = await supabase.from('sms_templates').select('key, template');
        const templateMap = new Map<string, string>();
        for (const t of templates || []) templateMap.set(t.key.toLowerCase(), t.template);
        const smsTemplate = templateMap.get('week_after_visit') || FALLBACK_TEMPLATE;

        // Clean up old week_after_visit drafts for this target date
        await supabase.from('sms_reminders')
            .delete()
            .eq('sms_type', 'week_after_visit')
            .in('status', ['draft', 'cancelled', 'failed'])
            .gte('appointment_date', `${targetDateStr}T00:00:00.000Z`)
            .lte('appointment_date', `${targetDateStr}T23:59:59.999Z`);

        // Already-sent week_after_visit SMS for dedup (only sent status)
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('prodentis_id')
            .eq('sms_type', 'week_after_visit')
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
                    const totalMin = aptHour * 60 + aptMin;
                    if (totalMin < 8 * 60 + 30 || totalMin >= 16 * 60) {
                        skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: `Poza godzinami E. Nowosielskiej (08:30-16:00)` });
                        skippedCount++; continue;
                    }
                } else {
                    // Filter 2: isWorkingHour — coerce to boolean (Prodentis may return string 'true')
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

                // Filter 5: Already sent
                const appointmentId = String(appointment.id);
                if (alreadySentIds.has(appointmentId)) {
                    skippedDetails.push({ name: patientName, doctor: doctorName, time: appointmentTime, reason: 'SMS tydzień po wizycie już wysłany wcześniej' });
                    skippedCount++; continue;
                }

                // Build salutation and message
                const patientFirstName = patientName.split(' ').find((p: string) => p.length > 1) || patientName.split(' ')[0];
                const salutation = buildSalutation(patientFirstName);
                const message = formatSMSMessage(smsTemplate, {
                    patientFirstName,
                    patientName,
                    salutation,
                    doctor: doctorName,
                    doctorName,
                    appUrl: APP_URL,
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
                    // doctor_id intentionally omitted — not available in week-after-visit cron
                    appointment_type: appointment.appointmentType?.name || '',
                    sms_message: message,
                    status: 'draft',
                    sms_type: 'week_after_visit',
                    already_reviewed: false,
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
                console.log(`   📋 Draft: ${patientName} | ${salutation}`);

            } catch (err: any) {
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
                        title: `📱 SMS tydzień po wizycie: ${draftsCreated} szkiców`,
                        body: `Sprawdź szkice w panelu admin. Wyślemy je za 1 godzinę.`,
                        url: '/admin',
                    });
                }
            } catch (pushErr: any) {
                console.error('Push notification failed (non-critical):', pushErr.message);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`📊 Done: drafts=${draftsCreated} skipped=${skippedCount} dbErrors=${skippedDetails.filter(s => s.reason.startsWith('BLAD')).length} (${duration}s)`);

        return NextResponse.json({
            success: true,
            targetDate: targetDateStr,
            totalAppointments: appointments.length,
            draftsCreated,
            skipped: skippedCount,
            skippedDetails,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('💥 [Week-After-Visit SMS] Fatal error:', error.message);
        return NextResponse.json({ success: false, error: error.message, draftsCreated }, { status: 500 });
    }
}
