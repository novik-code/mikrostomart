import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatSMSMessage } from '@/lib/smsService';
import { sendPushToUser } from '@/lib/webpush';
import { randomUUID } from 'crypto';

export const maxDuration = 120;

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';
const APP_URL = 'https://mikrostomart.pl/aplikacja';

const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

const FALLBACK_TEMPLATE = 'Dziekujemy, ze jestes naszym pacjentem! Miej Mikrostomart zawsze przy sobie - pobierz aplikacje na telefon: {appUrl}';

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

/**
 * WEEK-AFTER-VISIT SMS Cron — Stage 1: Generate DRAFTS
 *
 * Schedule: 0 9 * * * (9:00 UTC = 10:00 Warsaw CET)
 *
 * Flow:
 * 1. Fetch appointments from 7 days ago
 * 2. Filter: same logic as appointment-reminders (isWorkingHour, business hours, doctor list)
 * 3. Save as DRAFT (status='draft', sms_type='week_after_visit')
 * 4. Send push to admin — auto-send fires ~1h later via post-visit-auto-send cron
 */
export async function GET(req: Request) {
    console.log('📱 [Week-After-Visit SMS] Starting draft generation...');
    const startTime = Date.now();

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

    let processedCount = 0;
    let draftsCreated = 0;
    let skippedCount = 0;
    const errors: string[] = [];

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

        if (appointments.length === 0) {
            return NextResponse.json({ success: true, draftsCreated: 0, message: `No appointments on ${targetDateStr}` });
        }
        console.log(`📊 Found ${appointments.length} appointments`);

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

        // Already-sent week_after_visit SMS for dedup (only sent status, not drafts)
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('prodentis_id')
            .eq('sms_type', 'week_after_visit')
            .eq('status', 'sent');
        const alreadySentIds = new Set<string>((alreadySent || []).map((r: any) => String(r.prodentis_id)));

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

                if (!phone) { skippedCount++; continue; }

                // Nowosielska exception
                const isNowosielska = doctorName.toLowerCase().includes('nowosielska')
                    && (doctorName.toLowerCase().includes('elżbieta') || doctorName.toLowerCase().includes('elzbieta'));

                if (isNowosielska) {
                    const totalMin = aptHour * 60 + aptMin;
                    if (totalMin < 8 * 60 + 30 || totalMin >= 16 * 60) { skippedCount++; continue; }
                } else {
                    if (appointment.isWorkingHour !== true) { skippedCount++; continue; }
                    if (aptHour < MIN_HOUR || aptHour >= MAX_HOUR) { skippedCount++; continue; }
                    if (!isDoctorInList(doctorName, REMINDER_DOCTORS)) { skippedCount++; continue; }
                }

                const appointmentId = String(appointment.id);
                if (alreadySentIds.has(appointmentId)) {
                    console.log(`   ✅ Already sent week-after for #${appointmentId}`);
                    skippedCount++;
                    continue;
                }

                const patientFirstName = patientName.split(' ')[0];
                const message = formatSMSMessage(smsTemplate, {
                    patientFirstName,
                    patientName,
                    doctor: doctorName,
                    doctorName,
                    appUrl: APP_URL,
                });

                let patientId: string | null = null;
                const { data: patientRow } = await supabase
                    .from('patients').select('id').eq('prodentis_id', appointment.patientId).maybeSingle();
                patientId = patientRow?.id || null;

                const smsId = randomUUID();
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
                    status: 'draft',
                    sms_type: 'week_after_visit',
                    already_reviewed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                draftsCreated++;
                console.log(`   📋 Draft created for ${patientName}`);

            } catch (err: any) {
                errors.push(`${appointment.patientName}: ${err.message}`);
            }
        }

        // Push to admin
        if (draftsCreated > 0) {
            try {
                const { data: adminUsers } = await supabase
                    .from('push_subscriptions')
                    .select('user_id')
                    .eq('role', 'admin')
                    .limit(10);
                const adminUserIds = [...new Set((adminUsers || []).map((u: any) => u.user_id))];
                for (const userId of adminUserIds) {
                    await sendPushToUser(userId, 'admin', {
                        title: `📱 SMS tydzień po wizycie: ${draftsCreated} wiadomości`,
                        body: 'Sprawdź szkice w panelu admin → SMS tydzień po wizycie. Wyślemy je za 1 godzinę.',
                        url: '/admin',
                    });
                }
            } catch (pushErr: any) {
                console.error('Push notification failed (non-critical):', pushErr.message);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        return NextResponse.json({
            success: true,
            targetDate: targetDateStr,
            processed: processedCount,
            draftsCreated,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('💥 [Week-After-Visit SMS] Fatal error:', error.message);
        return NextResponse.json({ success: false, error: error.message, draftsCreated }, { status: 500 });
    }
}
