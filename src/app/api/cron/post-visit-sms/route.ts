import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, formatSMSMessage } from '@/lib/smsService';
import { randomUUID } from 'crypto';

export const maxDuration = 120;

// Prodentis API URL
const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';

// Doctors for which post-visit SMS is enabled (same list as appointment-reminders)
const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

// The internal survey / review page — patient reads our survey first, then optionally goes to Google
const SURVEY_URL = 'https://mikrostomart.pl/strefa-pacjenta/ocen-nas';

/**
 * Pool of varied messages for patients who already left a Google review.
 * Each one is a fun dental fact, anecdote, joke or warm tip (Polish).
 * Append new entries freely — the pool auto-grows.
 */
const FUN_FACTS: string[] = [
    'Czy wiesz, że zęby są jak odciski palców — każdy człowiek ma unikalny układ uzębienia? 😄',
    'Ciekawostka: szkliwo to najtwardszy materiał w ludzkim ciele — twardszy nawet niż kość! 🦷',
    'Słyszałeś/aś o „cheese effect"? Zjedzenie kawałka sera po posiłku neutralizuje kwasy w jamie ustnej. Serio! 🧀',
    'Dawniej w Europie ból zęba leczono muzyką — wierzono, że dźwięk odpędzi „robaka zębowego". Na szczęście mamy wiertła 😄',
    'Przeciętny człowiek spędza ok. 38 dni życia na myciu zębów. Warto, bo szkliwo nie odrasta! ⏱️',
    'Żyrafa myje zęby... językiem! Ma go tak długiego, że dosięga każdego zęba. Ty masz szczoteczkę 😄 🦒',
    'Herbata zielona zawiera fluor i polifenole — to naturalny sprzymierzeniec zdrowych zębów. Herbatka wieczorkiem? 🍵',
    'Ślina to superpłyn: neutralizuje kwasy, niszczy bakterie i pomaga remineralizować szkliwo. Dbaj o nawodnienie! 💧',
    'W średniowieczu dentysta i fryzjer to był jeden zawód — barbier-chirurg. Na szczęście czasy się zmieniły! ✂️😄',
    'Rekiny mają setki zębów i wymieniają je co 1-2 tygodnie. My mamy tylko dwa zestawy — dlatego warto o nie dbać! 🦈',
    'Niemowlęta rodzą się bez bakterii w ustach — środowisko to tworzy się dopiero po czasie. Pierwsze zębuszki to wielkie wydarzenie! 🍼',
    'Pasta do zębów istnieje od starożytnego Egiptu. Tamta receptura: popiół, pumeks i wino. My wolimy miętę 😄',
    'Ciekawostka: uśmiech angażuje od 5 do 53 mięśni twarzy. Im szerzej, tym więcej treningu! 😁',
    'Żucie gumy bez cukru przez 20 minut po jedzeniu stymuluje śliniankę i pomaga oczyścić zęby. Mały trik, duży efekt! 🍬',
    'Mózg nie potrafi dokładnie zlokalizować bólu zęba — dlatego czasem boli „coś w okolicach". Dlatego lepiej nam o tym powiedzieć! 😄',
    'Wielbłądy mają 34 zęby i potrafią gryźć przez skórę. Nie próbuj tego w domu 🐪😄',
    'Fluoryzacja wody pitnej to jeden z 10 największych osiągnięć zdrowia publicznego XX wieku — tak mówi WHO. Fluor to Twój sprzymierzeniec! 💧',
    'Najstarszy wypełniony ząb odkryto we Włoszech — ma 13 000 lat i był wypełniony smołą drzewną. My używamy czegoś zdecydowanie lepszego 😄',
    'Słoniowe ciosy to... zęby! Powiększone siekacze słonia ważą nawet 90 kg. Twoje ważą trochę mniej 🐘',
    'Zdrowe dziąsła nie krwawią. Jeśli zauważysz coś niepokojącego, napisz lub zadzwoń — chętnie pomożemy 🙂',
    'Dawniej złote zęby były oznaką bogactwa. Dziś mamy porcelany i kompozyty — piękniejsze i zdrowsze 👑',
    'Regularne wizyty co 6 miesięcy to najlepsza inwestycja w uśmiech — i w portfel, bo profilaktyka jest tańsza niż leczenie 😄',
];

/**
 * Pick a fun fact deterministically from the pool based on appointmentId.
 * Same ID always → same fact (stable on retry / re-run).
 * Different appointments → different facts (rotates through the pool).
 */
function pickFunFact(appointmentId: string): string {
    let hash = 0;
    for (let i = 0; i < appointmentId.length; i++) {
        hash = (hash * 31 + appointmentId.charCodeAt(i)) >>> 0;
    }
    return FUN_FACTS[hash % FUN_FACTS.length];
}


/**
 * Fuzzy match: check if patientFullName appears in the list of google_author_names.
 * Normalises: lowercase, remove diacritics (loose), collapse spaces, ignore hyphen vs space.
 */
function normalName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function patientAlreadyReviewed(patientName: string, reviewerNames: string[]): boolean {
    const norm = normalName(patientName);
    const normParts = norm.split(' ').filter(Boolean);
    return reviewerNames.some(reviewer => {
        const revNorm = normalName(reviewer);
        // All parts of patient name must appear in reviewer name (handles middle-name order differences)
        return normParts.every(part => revNorm.includes(part));
    });
}

/**
 * Fuzzy doctor name matching
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

/**
 * POST-VISIT SMS Cron Job
 *
 * Schedule: 0 18 * * * (18:00 UTC = 19:00 Warsaw CET / 20:00 CEST)
 *
 * Flow:
 * 1. Fetch today's appointments from Prodentis
 * 2. Filter: working hours + active doctors + has phone
 * 3. Check Supabase for duplicate (already sent post_visit SMS for this appointment)
 * 4. Check google_reviews: has patient already reviewed us?
 * 5. Select template: post_visit_review (new reviewer) OR post_visit_reviewed (already reviewed)
 * 6. Send SMS immediately + save to sms_reminders with sms_type='post_visit'
 */
export async function GET(req: Request) {
    console.log('🚀 [Post-Visit SMS] Starting cron job...');
    const startTime = Date.now();

    // 1. Auth
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';

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
        // 2. Target date — today (we send AFTER the appointments happened)
        const todayStr = new Date().toISOString().split('T')[0];
        console.log(`📅 [Post-Visit SMS] Fetching appointments for TODAY: ${todayStr}`);

        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${todayStr}`;
        const apiResponse = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!apiResponse.ok) {
            throw new Error(`Prodentis API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        const appointments = data.appointments || [];

        if (appointments.length === 0) {
            console.log('ℹ️  [Post-Visit SMS] No appointments for today');
            return NextResponse.json({ success: true, processed: 0, sent: 0, message: 'No appointments today' });
        }

        console.log(`📊 [Post-Visit SMS] Found ${appointments.length} appointments`);

        // 3. Load templates from Supabase
        const { data: templates } = await supabase
            .from('sms_templates')
            .select('key, template');

        const templateMap = new Map<string, string>();
        for (const t of templates || []) {
            templateMap.set(t.key.toLowerCase(), t.template);
        }

        const reviewTemplate = templateMap.get('post_visit_review')
            || 'Dziękujemy za wizytę, {patientFirstName}! 😊 Podziel się z nami swoją opinią: {surveyUrl} A jeśli możesz — zostaw gwiazdki w Google. Dziękujemy!';

        const reviewedTemplate = templateMap.get('post_visit_reviewed')
            || 'Dziękujemy za wizytę, {patientFirstName}! 😊 {funFact} Do zobaczenia! — Mikrostomart';

        // 4. Load all google_reviews reviewer names for fast lookup
        const { data: reviewsData } = await supabase
            .from('google_reviews')
            .select('google_author_name');

        const reviewerNames = (reviewsData || []).map((r: any) => r.google_author_name as string);
        console.log(`📋 [Post-Visit SMS] Loaded ${reviewerNames.length} Google reviewer names`);

        // 5. Load already-sent post-visit prodentis_ids for today (dedup)
        const todayStart = `${todayStr}T00:00:00.000Z`;
        const todayEnd = `${todayStr}T23:59:59.999Z`;
        const { data: alreadySent } = await supabase
            .from('sms_reminders')
            .select('prodentis_id')
            .eq('sms_type', 'post_visit')
            .neq('status', 'cancelled')
            .gte('created_at', todayStart)
            .lte('created_at', todayEnd);

        const alreadySentIds = new Set<string>((alreadySent || []).map((r: any) => String(r.prodentis_id)));
        console.log(`📋 [Post-Visit SMS] ${alreadySentIds.size} post-visit SMS already sent today`);

        // 6. Business-hour constants
        const MIN_HOUR = 8;
        const MAX_HOUR = 20;

        // 7. Process each appointment
        for (const appointment of appointments) {
            processedCount++;

            try {
                const appointmentDate = new Date(appointment.date);
                const appointmentHour = appointmentDate.getUTCHours();
                const appointmentMinute = appointmentDate.getUTCMinutes();
                const appointmentTime = `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinute.toString().padStart(2, '0')}`;

                const doctorName = (appointment.doctor?.name || '').replace(/\s*\(I\)\s*/g, ' ').trim();
                const patientName = appointment.patientName || '';
                const phone = appointment.patientPhone;

                console.log(`\n🔍 [${appointment.id}] ${patientName} @ ${appointmentTime} — Dr. ${doctorName}`);

                // a. Phone check
                if (!phone) {
                    console.log('   ⚠️  No phone number — skipping');
                    skippedCount++;
                    continue;
                }

                // b. Elżbieta Nowosielska exception
                const isNowosielska = doctorName.toLowerCase().includes('nowosielska')
                    && (doctorName.toLowerCase().includes('elżbieta') || doctorName.toLowerCase().includes('elzbieta'));

                if (isNowosielska) {
                    const totalMin = appointmentHour * 60 + appointmentMinute;
                    if (totalMin < 8 * 60 + 30 || totalMin >= 16 * 60) {
                        console.log(`   ⛔ Nowosielska outside 08:30-16:00 — skipping`);
                        skippedCount++;
                        continue;
                    }
                } else {
                    // c. isWorkingHour check
                    if (appointment.isWorkingHour !== true) {
                        console.log('   ⛔ Non-working hour — skipping');
                        skippedCount++;
                        continue;
                    }
                    // d. Business hours window
                    if (appointmentHour < MIN_HOUR || appointmentHour >= MAX_HOUR) {
                        console.log(`   ⛔ Outside business hours (${appointmentTime}) — skipping`);
                        skippedCount++;
                        continue;
                    }
                    // e. Doctor in list
                    if (!isDoctorInList(doctorName, REMINDER_DOCTORS)) {
                        console.log(`   ⛔ Doctor not in list (${doctorName}) — skipping`);
                        skippedCount++;
                        continue;
                    }
                }

                // f. Dedup check
                const appointmentId = String(appointment.id);
                if (alreadySentIds.has(appointmentId)) {
                    console.log('   ✅ Already sent post-visit SMS today — skipping');
                    skippedCount++;
                    continue;
                }

                // g. Google review check — fuzzy match
                const alreadyReviewed = patientAlreadyReviewed(patientName, reviewerNames);
                console.log(`   ${alreadyReviewed ? '⭐ Already reviewed' : '📝 Not yet reviewed'}`);

                // h. Pick template + build message
                const template = alreadyReviewed ? reviewedTemplate : reviewTemplate;
                const patientFirstName = patientName.split(' ')[0];
                // Pick a unique fun fact per appointment (deterministic hash of appointmentId)
                const funFact = alreadyReviewed ? pickFunFact(appointmentId) : '';
                console.log(`   ${alreadyReviewed ? `🎲 Fun fact #${String(appointment.id).length % FUN_FACTS.length}: "${funFact.substring(0, 40)}..."` : 'ℹ️  No fun fact (new reviewer)'}`);

                const message = formatSMSMessage(template, {
                    patientFirstName,
                    patientName,
                    doctor: doctorName,
                    doctorName,
                    time: appointmentTime,
                    surveyUrl: SURVEY_URL,
                    funFact,
                });

                console.log(`   📝 Message (${message.length} chars): "${message.substring(0, 80)}..."`);

                // i. Send SMS
                const smsResult = await sendSMS({ to: phone, message });

                // j. Save to sms_reminders
                const smsId = randomUUID();
                const smsStatus = smsResult.success ? 'sent' : 'failed';

                // Find patient_id from patients table
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
                    status: smsStatus,
                    sms_type: 'post_visit',
                    already_reviewed: alreadyReviewed,
                    sms_message_id: smsResult.messageId || null,
                    send_error: smsResult.success ? null : (smsResult.error || 'Unknown error'),
                    sent_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                if (smsResult.success) {
                    sentCount++;
                    console.log(`   ✅ Sent (msgId: ${smsResult.messageId})`);
                } else {
                    failedCount++;
                    console.error(`   ❌ Failed: ${smsResult.error}`);
                    errors.push({ patient: patientName, error: smsResult.error || 'Unknown' });
                }

            } catch (err: any) {
                failedCount++;
                const msg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`   ❌ Error processing appointment:`, msg);
                errors.push({ patient: appointment.patientName || 'Unknown', error: msg });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n📊 [Post-Visit SMS] Done in ${duration}s — sent:${sentCount} skipped:${skippedCount} failed:${failedCount}`);

        return NextResponse.json({
            success: true,
            processed: processedCount,
            sent: sentCount,
            skipped: skippedCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('💥 [Post-Visit SMS] Fatal error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message,
            processed: processedCount,
            sent: sentCount,
        }, { status: 500 });
    }
}
