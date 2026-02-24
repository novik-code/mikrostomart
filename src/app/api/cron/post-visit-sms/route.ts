import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatSMSMessage } from '@/lib/smsService';
import { sendPushToUser } from '@/lib/webpush';
import { randomUUID } from 'crypto';

export const maxDuration = 120;

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';

const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

const SURVEY_URL = 'https://mikrostomart.pl/strefa-pacjenta/ocen-nas';

/**
 * Identical to appointment-reminders isDoctorInList — copy to keep consistent behaviour
 */
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

const FUN_FACTS: string[] = [
    'Czy wiesz, ze zeby sa jak odciski palcow - kazdy czlowiek ma unikalny uklad uzebienia?',
    'Ciekawostka: szkliwo to najtwardszy material w ludzkim ciele - twardszy nawet niz kosc!',
    'Regularne wizyty co 6 miesiecy to najlepsza inwestycja w usmiech.',
    'Zelenina jak marchew i seler naturalnie czyszcza zeby podczas gryenia!',
    'Przecietny czlowiek spedza ok. 38 dni zycia na myciu zebow. Warto!',
    'Zyrafa myje zeby... jezykiem! Ma go tak dlugiego, ze dosiegnie kazdego zeba.',
    'Herbata zielona zawiera fluor i polifenole - naturalny sprzymierzeniec zdrowych zebow.',
    'Slina to superplyn: neutralizuje kwasy, niszczy bakterie i remineralizuje szkliwo.',
    'Rekiny maja setki zebow i wymieniaja je co 1-2 tygodnie. My mamy tylko dwa zestawy.',
    'Pasta do zebow istnieje od starozytnego Egiptu. Tamta receptura: popiol, pumeks i wino.',
    'Zucie gumy bez cukru przez 20 min po jedzeniu pomaga oczyscic zeby. Maly trik!',
    'Ciekawostka: usmiech angazuje od 5 do 53 miesni twarzy. Im szerzej, tym wiecej treningu!',
    'Fluoryzacja wody pitnej to jeden z 10 najwiekszych osiagniec zdrowia publicznego XX w.',
    'Sloniowe ciosy to... zeby! Powiekszonych siekacze slonia waza nawet 90 kg.',
    'Zdrowe dziasula nie krwawia. Jesli zauwazysc cos niepokojacego, odezwij sie do nas.',
    'Dawniej zlote zeby byly oznaka bogactwa. Dzis mamy porcelany i kompozyty - piekniejsze.',
    'Najstarszy wypelniony zab odkryto we Wloszech - ma 13 000 lat!',
    'Wielbłądy mają 34 zęby. Twoje ważą trochę mniej niż 90 kg ci slonia.',
    'Profilaktyka jest tansza niz leczenie — tak samo jak w zyciu: lepiej zapobiegac.',
    'Mozg nie potrafi dokladnie zlokalizowac bolu zeba - dlatego czasem boli cos w okolicach.',
    'Niemowleta rodza sie bez bakterii w ustach. Pierwsze zebuszki to wielkie wydarzenie!',
    'Zwykla woda po jedzeniu jest wietna - naturalie wyplukuje resztki jedzenia.',
];

function pickFunFact(appointmentId: string): string {
    let hash = 0;
    for (let i = 0; i < appointmentId.length; i++) {
        hash = (hash * 31 + appointmentId.charCodeAt(i)) >>> 0;
    }
    return FUN_FACTS[hash % FUN_FACTS.length];
}

/**
 * POST-VISIT SMS Cron — Stage 1: Generate DRAFTS
 *
 * Schedule: 0 18 * * * (18:00 UTC = 19:00 Warsaw CET)
 *
 * Flow:
 * 1. Fetch TODAY's appointments from Prodentis
 * 2. Filter: same logic as appointment-reminders (isWorkingHour, business hours, doctor list)
 * 3. Check google_reviews for fuzzy name match → pick appropriate template
 * 4. Save as DRAFT (status='draft', sms_type='post_visit')
 * 5. Send push notification to admin
 * 6. Auto-send fires 1h later via /api/cron/post-visit-auto-send
 */
export async function GET(req: Request) {
    console.log('🦷 [Post-Visit SMS] Starting draft generation...');
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
        // Target date: today (or override)
        const targetDate = overrideDate ? new Date(overrideDate) : new Date();
        const targetDateStr = targetDate.toISOString().split('T')[0];
        console.log(`📅 [Post-Visit SMS] Target date: ${targetDateStr}`);

        // Fetch appointments
        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDateStr}`;
        const apiResponse = await fetch(apiUrl, { headers: { 'Content-Type': 'application/json' } });
        if (!apiResponse.ok) throw new Error(`Prodentis API error: ${apiResponse.status}`);

        const data = await apiResponse.json();
        const appointments = data.appointments || [];

        if (appointments.length === 0) {
            return NextResponse.json({ success: true, draftsCreated: 0, message: `No appointments on ${targetDateStr}` });
        }
        console.log(`📊 Found ${appointments.length} appointments`);

        // Load templates
        const { data: templates } = await supabase.from('sms_templates').select('key, template');
        const templateMap = new Map<string, string>();
        for (const t of templates || []) templateMap.set(t.key.toLowerCase(), t.template);

        const reviewTemplate = templateMap.get('post_visit_review')
            || 'Dziekujemy za wizyte, {patientFirstName}! Zalezy nam na Twojej opinii - wypelnij ankiete: {surveyUrl} Jesli mozesz, zostaw nam gwiazdki w Google!';

        const reviewedTemplate = templateMap.get('post_visit_reviewed')
            || 'Dziekujemy za wizyte, {patientFirstName}! {funFact} Do zobaczenia! - Zespol Mikrostomart';

        // Load google reviewer names
        const { data: reviewsData } = await supabase.from('google_reviews').select('google_author_name');
        const reviewerNames = (reviewsData || []).map((r: any) => r.google_author_name as string);

        // Clean up old post_visit drafts for this target date
        await supabase.from('sms_reminders')
            .delete()
            .eq('sms_type', 'post_visit')
            .in('status', ['draft', 'cancelled', 'failed'])
            .gte('appointment_date', `${targetDateStr}T00:00:00.000Z`)
            .lte('appointment_date', `${targetDateStr}T23:59:59.999Z`);

        // Already-sent (non-draft) post_visit SMS for dedup
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('prodentis_id')
            .eq('sms_type', 'post_visit')
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

                // Phone check
                if (!phone) { skippedCount++; continue; }

                // Elżbieta Nowosielska exception
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

                // Dedup: skip if already SENT (not just drafted)
                const appointmentId = String(appointment.id);
                if (alreadySentIds.has(appointmentId)) {
                    console.log(`   ✅ Already sent post-visit for #${appointmentId} — skipping`);
                    skippedCount++;
                    continue;
                }

                // Google review check
                const alreadyReviewed = patientAlreadyReviewed(patientName, reviewerNames);
                const patientFirstName = patientName.split(' ')[0];
                const funFact = alreadyReviewed ? pickFunFact(appointmentId) : '';
                const template = alreadyReviewed ? reviewedTemplate : reviewTemplate;

                const message = formatSMSMessage(template, {
                    patientFirstName,
                    patientName,
                    doctor: doctorName,
                    doctorName,
                    time: appointmentTime,
                    surveyUrl: SURVEY_URL,
                    funFact,
                });

                // Find patient_id
                let patientId: string | null = null;
                const { data: patientRow } = await supabase
                    .from('patients').select('id').eq('prodentis_id', appointment.patientId).maybeSingle();
                patientId = patientRow?.id || null;

                // Save as DRAFT
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
                    sms_type: 'post_visit',
                    already_reviewed: alreadyReviewed,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                draftsCreated++;
                console.log(`   📋 Draft created for ${patientName}`);

            } catch (err: any) {
                errors.push(`${appointment.patientName}: ${err.message}`);
            }
        }

        // Push notification to admin
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
                        title: `✉️ SMS po wizycie: ${draftsCreated} wiadomości do wysyłki`,
                        body: 'Sprawdź szkice w panelu admin → SMS po wizycie. Wyślemy je automatycznie za 1 godzinę.',
                        url: '/admin',
                    });
                }
                console.log(`🔔 Push sent to ${adminUserIds.length} admins`);
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
            message: `Created ${draftsCreated} draft post-visit SMS. Auto-send in ~1h.`,
        });

    } catch (error: any) {
        console.error('💥 [Post-Visit SMS] Fatal error:', error.message);
        return NextResponse.json({ success: false, error: error.message, draftsCreated }, { status: 500 });
    }
}
