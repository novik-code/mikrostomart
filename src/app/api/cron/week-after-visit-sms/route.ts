import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, formatSMSMessage } from '@/lib/smsService';
import { randomUUID } from 'crypto';

export const maxDuration = 120;

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';

// App landing page URL — linked in SMS
const APP_URL = 'https://mikrostomart.pl/aplikacja';

// Doctors list (same as other SMS crons)
const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

// Fallback template (max ~130 chars to leave room for URL + patient name)
// NOTE: Polish diacritics trigger UCS-2 encoding → 70 chars/SMS.
// Use ASCII-friendly text to stay in 1 SMS (GSM-7 = 160 chars).
const FALLBACK_TEMPLATE = 'Dziekujemy, ze jestes naszym pacjentem! 😊 Miej Mikrostomart zawsze przy sobie - pobierz aplikacje na telefon: {appUrl}';

function isDoctorInList(apiDoctorName: string, doctorList: string[]): boolean {
    const normalize = (n: string) =>
        n.replace(/\s*\(I\)\s*/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const api = normalize(apiDoctorName);
    return doctorList.some(listName => {
        const list = normalize(listName);
        const ap = api.split(' ');
        const lp = list.split(' ');
        return lp.every(p => ap.some(a => a.includes(p) || p.includes(a)))
            || ap.every(p => lp.some(l => l.includes(p) || p.includes(l)));
    });
}

/**
 * WEEK-AFTER-VISIT SMS Cron Job
 *
 * Schedule: 0 9 * * * (9:00 UTC = 10:00 Warsaw CET / 11:00 CEST)
 *
 * Flow:
 * 1. Calculate date = today - 7 days
 * 2. Fetch appointments for that date from Prodentis
 * 3. Filter: working hours + doctor list + has phone
 * 4. Skip if week_after_visit SMS already sent (dedup)
 * 5. Send app promotion SMS + save to sms_reminders (sms_type='week_after_visit')
 */
export async function GET(req: Request) {
    console.log('📱 [Week-After-Visit SMS] Starting cron job...');
    const startTime = Date.now();

    // Auth
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';
    const overrideDate = url.searchParams.get('date'); // for testing: ?date=2026-02-17

    if (!isCronAuth && !isManualTrigger && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let processedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ patient: string; error: string }> = [];

    try {
        // Target date: 7 days ago (or override from query param)
        const targetDate = overrideDate
            ? new Date(overrideDate)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        console.log(`📅 [Week-After-Visit SMS] Target date (7 days ago): ${targetDateStr}`);

        // Fetch appointments
        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDateStr}`;
        const apiResponse = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!apiResponse.ok) {
            throw new Error(`Prodentis API error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const appointments = data.appointments || [];

        if (appointments.length === 0) {
            console.log('ℹ️  No appointments for that date');
            return NextResponse.json({ success: true, processed: 0, sent: 0, message: `No appointments on ${targetDateStr}` });
        }

        console.log(`📊 Found ${appointments.length} appointments`);

        // Load template
        const { data: templates } = await supabase
            .from('sms_templates')
            .select('key, template');

        const templateMap = new Map<string, string>();
        for (const t of templates || []) {
            templateMap.set(t.key.toLowerCase(), t.template);
        }

        const smsTemplate = templateMap.get('week_after_visit') || FALLBACK_TEMPLATE;

        // Dedup: already-sent week_after_visit SMS for these appointments
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('prodentis_id')
            .eq('sms_type', 'week_after_visit')
            .neq('status', 'cancelled');

        const alreadySentIds = new Set<string>((alreadySent || []).map((r: any) => String(r.prodentis_id)));
        console.log(`📋 ${alreadySentIds.size} week-after-visit SMS already sent globally`);

        const MIN_HOUR = 8;
        const MAX_HOUR = 20;

        for (const appointment of appointments) {
            processedCount++;

            try {
                const appointmentDate = new Date(appointment.date);
                const aptHour = appointmentDate.getUTCHours();
                const aptMin = appointmentDate.getUTCMinutes();
                const appointmentTime = `${aptHour.toString().padStart(2, '0')}:${aptMin.toString().padStart(2, '0')}`;

                const doctorName = (appointment.doctor?.name || '').replace(/\s*\(I\)\s*/g, ' ').trim();
                const patientName = appointment.patientName || '';
                const phone = appointment.patientPhone;

                console.log(`\n🔍 [${appointment.id}] ${patientName} @ ${appointmentTime} — Dr. ${doctorName}`);

                // Phone check
                if (!phone) {
                    console.log('   ⚠️  No phone — skipping');
                    skippedCount++;
                    continue;
                }

                // Elżbieta Nowosielska exception
                const isNowosielska = doctorName.toLowerCase().includes('nowosielska')
                    && (doctorName.toLowerCase().includes('elżbieta') || doctorName.toLowerCase().includes('elzbieta'));

                if (isNowosielska) {
                    const totalMin = aptHour * 60 + aptMin;
                    if (totalMin < 8 * 60 + 30 || totalMin >= 16 * 60) {
                        skippedCount++;
                        continue;
                    }
                } else {
                    if (appointment.isWorkingHour !== true) {
                        skippedCount++;
                        continue;
                    }
                    if (aptHour < MIN_HOUR || aptHour >= MAX_HOUR) {
                        console.log(`   ⛔ Outside business hours — skipping`);
                        skippedCount++;
                        continue;
                    }
                    if (!isDoctorInList(doctorName, REMINDER_DOCTORS)) {
                        console.log(`   ⛔ Doctor not in list — skipping`);
                        skippedCount++;
                        continue;
                    }
                }

                // Dedup
                const appointmentId = String(appointment.id);
                if (alreadySentIds.has(appointmentId)) {
                    console.log('   ✅ Already sent week-after-visit — skipping');
                    skippedCount++;
                    continue;
                }

                // Build message
                const patientFirstName = patientName.split(' ')[0];
                const message = formatSMSMessage(smsTemplate, {
                    patientFirstName,
                    patientName,
                    doctor: doctorName,
                    doctorName,
                    appUrl: APP_URL,
                });

                console.log(`   📝 Message (${message.length} chars): "${message.substring(0, 100)}"`);

                // Send
                const smsResult = await sendSMS({ to: phone, message });

                // Save to DB
                const smsId = randomUUID();

                let patientId: string | null = null;
                const { data: patientRow } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('prodentis_id', appointment.patientId)
                    .maybeSingle();
                patientId = patientRow?.id || null;

                await supabase.from('sms_reminders').insert({
                    id: smsId,
                    patient_id: patientId,
                    prodentis_id: appointment.id,
                    patient_name: patientName,
                    phone,
                    appointment_date: appointment.date,
                    doctor_name: doctorName,
                    appointment_type: appointment.appointmentType?.name || '',
                    sms_message: message,
                    status: smsResult.success ? 'sent' : 'failed',
                    sms_type: 'week_after_visit',
                    already_reviewed: false,
                    sms_message_id: smsResult.messageId || null,
                    send_error: smsResult.success ? null : (smsResult.error || 'Unknown'),
                    sent_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                if (smsResult.success) {
                    sentCount++;
                    console.log(`   ✅ Sent (msgId: ${smsResult.messageId})`);
                } else {
                    failedCount++;
                    errors.push({ patient: patientName, error: smsResult.error || 'Unknown' });
                }

            } catch (err: any) {
                failedCount++;
                errors.push({ patient: appointment.patientName || 'Unknown', error: err.message });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n📊 Done in ${duration}s — sent:${sentCount} skipped:${skippedCount} failed:${failedCount}`);

        return NextResponse.json({
            success: true,
            targetDate: targetDateStr,
            processed: processedCount,
            sent: sentCount,
            skipped: skippedCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('💥 [Week-After-Visit SMS] Fatal error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message,
            processed: processedCount,
            sent: sentCount,
        }, { status: 500 });
    }
}
