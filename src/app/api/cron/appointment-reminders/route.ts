import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, getSMSTemplate, formatSMSMessage } from '@/lib/smsService';
import { mapAppointmentTypeToSlug } from '@/lib/appointmentTypeMapper';
import { sendTranslatedPushToUser } from '@/lib/webpush';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import { demoSanitize } from '@/lib/brandConfig';

export const maxDuration = 120; // Vercel function timeout (increased: many appointments + multiple DB queries per appointment)

// Prodentis API base URL
const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

// Doctor list for reminders (comma-separated env variable)
const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska'
];

/**
 * Fuzzy doctor name matching — normalizes and compares name parts
 * Handles variations like "Maćków-Huras" vs "Maćków Huras", with/without "(I)" suffix
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
        // Check if all parts of one name appear in the other
        const apiParts = normalizedApi.split(' ');
        const listParts = normalizedList.split(' ');
        return listParts.every(part => apiParts.some(ap => ap.includes(part) || part.includes(ap)))
            || apiParts.every(part => listParts.some(lp => lp.includes(part) || part.includes(lp)));
    });
}

/**
 * SMS Draft Generation Cron Job (Stage 1 of 2) - API 4.0
 * 
 * Runs daily at 7:00 AM UTC (8 AM Warsaw) — generates drafts for TOMORROW
 * On Fridays, also called at 8:15 AM UTC (9:15 AM Warsaw) with ?targetDate=monday
 * 
 * Flow:
 * 1. Fetch ALL appointments for target date from Prodentis /api/appointments/by-date
 * 2. Filter: working hours + doctor in reminder list + has phone number
 * 3. Generate personalized SMS based on appointment type
 * 4. Save as DRAFT in sms_reminders table (admin review before sending)
 * 
 * Stage 2: Admin reviews drafts in /admin panel OR auto-send cron
 */
export async function GET(req: Request) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('🚀 [SMS Reminders] Starting cron job (API 4.0)...');
    const startTime = Date.now();

    // 1. Authentication check
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Allow manual trigger from admin panel without auth
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';

    if (!isCronAuth && !isManualTrigger && process.env.NODE_ENV === 'production') {
        console.error('❌ [SMS Reminders] Unauthorized access attempt');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    if (isManualTrigger) {
        console.log('🔧 [SMS Reminders] Manual trigger from admin panel');
    }

    // 2. Initialize Supabase
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let processedCount = 0;
    let draftsCreated = 0;
    let skippedCount = 0;
    const errors: Array<{ appointment: string; error: string }> = [];
    const skippedPatients: Array<{
        patientName: string;
        doctorName: string;
        appointmentTime: string;
        appointmentType: string;
        reason: string;
    }> = [];

    try {
        // 3. Calculate target date
        const targetDateParam = url.searchParams.get('targetDate');
        const isMondayMode = targetDateParam === 'monday';

        const targetDate = new Date();
        if (isMondayMode) {
            // Calculate next Monday: add days until dayOfWeek=1
            const dayOfWeek = targetDate.getUTCDay(); // 0=Sun, 5=Fri
            const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
            targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilMonday);
            console.log(`📅 [SMS Reminders] MONDAY MODE — targeting next Monday`);
        } else {
            targetDate.setUTCDate(targetDate.getUTCDate() + 1); // tomorrow (default)
        }
        const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`📅 [SMS Reminders] Fetching appointments for: ${targetDateStr}${isMondayMode ? ' (Monday mode)' : ' (tomorrow)'}`);

        // 4. Fetch ALL appointments for target date from Prodentis API 4.0
        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDateStr}`;
        console.log(`🔍 [SMS Reminders] Calling: ${apiUrl}`);

        const apiResponse = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!apiResponse.ok) {
            throw new Error(`Prodentis API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        const appointments = data.appointments || [];

        if (appointments.length === 0) {
            console.log('ℹ️  [SMS Reminders] No appointments found for tomorrow');
            return NextResponse.json({
                success: true,
                processed: 0,
                draftsCreated: 0,
                skipped: 0,
                message: 'No appointments for tomorrow'
            });
        }

        console.log(`📊 [SMS Reminders] Found ${appointments.length} appointments for ${isMondayMode ? 'Monday' : 'tomorrow'}`);

        // 4a-cache. Pre-fetch SMS templates (cache outside loop to avoid N+1 Supabase queries)
        let cachedTemplates: Map<string, string> | null = null;
        try {
            const { data: templates } = await supabase
                .from('sms_templates')
                .select('key, template');
            if (templates && templates.length > 0) {
                cachedTemplates = new Map();
                for (const t of templates) {
                    cachedTemplates.set(t.key.toLowerCase(), t.template);
                }
                console.log(`   📋 Cached ${cachedTemplates.size} SMS templates`);
            }
        } catch (err) {
            console.error('   ⚠️  Failed to cache templates, will use fallback per-appointment');
        }

        // For Monday mode: pre-compute the formatted date string for replacement
        let mondayDateFormatted = '';
        if (isMondayMode) {
            mondayDateFormatted = targetDate.toLocaleDateString('pl-PL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'Europe/Warsaw'
            });
            console.log(`   📅 Monday date formatted: "${mondayDateFormatted}"`);
        }

        // 4b. Fetch working doctor info from Prodentis slots/free API
        // NOTE: This endpoint returns only FREE (unfilled) slots — not all working-hour slots.
        // We use it ONLY to confirm which doctors are working today (for logging).
        // We do NOT use it for filtering because earliest free slot ≠ earliest working hour
        // (a doctor with fully booked mornings would show free slots starting at e.g. 10:00).
        const slotsUrl = `${PRODENTIS_API_URL}/api/slots/free?date=${targetDateStr}&duration=30`;
        console.log(`📋 [SMS Reminders] Fetching working doctors from: ${slotsUrl}`);

        let workingDoctorIds = new Set<string>();

        try {
            const slotsResponse = await fetch(slotsUrl, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (slotsResponse.ok) {
                const slotsData: Array<{ doctor: string; doctorName: string; start: string; end: string }> = await slotsResponse.json();
                console.log(`   ✅ Received ${slotsData.length} free slots`);

                for (const slot of slotsData) {
                    workingDoctorIds.add(slot.doctor);
                }

                console.log(`   📋 Confirmed working doctors (with free slots): ${workingDoctorIds.size}`);
            } else {
                console.error(`   ⚠️  Failed to fetch free slots: ${slotsResponse.status}`);
            }
        } catch (slotsErr) {
            console.error(`   ⚠️  Free slots fetch error:`, slotsErr);
        }

        // Business hours: appointments must be between 8:00 and 20:00
        // This filters informational entries that appear at 5:45, 6:45, 7:15 etc.
        const MIN_BUSINESS_HOUR = 8;
        const MAX_BUSINESS_HOUR = 20;

        // 5. Clean up old drafts
        if (isMondayMode) {
            // Monday mode: only delete drafts for Monday (don't touch Saturday drafts)
            console.log(`🧹 [SMS Reminders] Cleaning up old MONDAY drafts only...`);
            const mondayStart = `${targetDateStr}T00:00:00.000Z`;
            const mondayEnd = `${targetDateStr}T23:59:59.999Z`;
            const { data: deletedDrafts, error: deleteError } = await supabase
                .from('sms_reminders')
                .delete()
                .in('status', ['draft', 'cancelled', 'failed'])
                .gte('appointment_date', mondayStart)
                .lte('appointment_date', mondayEnd)
                .select();

            if (deleteError) {
                console.error(`   ⚠️  Failed to delete Monday drafts:`, deleteError);
            } else {
                console.log(`   ✅ Deleted ${deletedDrafts?.length || 0} old Monday drafts`);
            }
        } else {
            // Normal daily mode: clean ALL old drafts (existing behavior)
            console.log(`🧹 [SMS Reminders] Cleaning up ALL old drafts...`);
            const { data: deletedDrafts, error: deleteError } = await supabase
                .from('sms_reminders')
                .delete()
                .in('status', ['draft', 'cancelled', 'failed'])
                .select();

            if (deleteError) {
                console.error(`   ⚠️  Failed to delete old drafts:`, deleteError);
            } else {
                console.log(`   ✅ Deleted ${deletedDrafts?.length || 0} old drafts`);
            }
        }

        // 6. Process each appointment
        for (const appointment of appointments) {
            processedCount++;

            try {
                // Prodentis returns Poland local time WITHOUT timezone info.
                // When JS parses on Vercel (UTC), the UTC hours = Polish hours directly.
                // NO timezone conversion needed — confirmed by Telegram/email showing correct times.
                const appointmentDate = new Date(appointment.date);
                const appointmentHour = appointmentDate.getUTCHours();
                const appointmentMinute = appointmentDate.getUTCMinutes();

                const appointmentTime = `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinute.toString().padStart(2, '0')}`;

                console.log(`\n🔍 [Appointment ${appointment.id}] Processing...`);
                console.log(`   Patient: ${appointment.patientName}`);
                console.log(`   Doctor: ${appointment.doctor.name}`);
                console.log(`   Time: ${appointmentTime}`);
                console.log(`   Type: ${appointment.appointmentType.name}`);
                console.log(`   Phone: ${appointment.patientPhone || 'MISSING'}`);
                console.log(`   Working Hour: ${appointment.isWorkingHour}`);

                const doctorId = appointment.doctor?.id || '';
                const doctorName = appointment.doctor.name.replace(/\s*\(I\)\s*/g, ' ').trim();

                // ======== SPECIAL EXCEPTION: Elżbieta Nowosielska ========
                // She's the practice owner — books patients on any field type (white/grey/red).
                // No isWorkingHour rule applies. Custom hours: 8:30-16:00.
                const isNowosielska = doctorName.toLowerCase().includes('nowosielska')
                    && (doctorName.toLowerCase().includes('elżbieta') || doctorName.toLowerCase().includes('elzbieta'));

                if (isNowosielska) {
                    const totalMinutes = appointmentHour * 60 + appointmentMinute;
                    if (totalMinutes < 8 * 60 + 30 || totalMinutes >= 16 * 60) {
                        console.log(`   ⛔ Skipping: Nowosielska outside custom hours (${appointmentTime}, must be 08:30-16:00)`);
                        skippedCount++;
                        continue;
                    }
                    console.log(`   👑 Nowosielska exception: bypassing isWorkingHour check (custom 08:30-16:00)`);
                } else {
                    // 6a. WORKING HOUR VALIDATION (standard doctors)
                    // Three filters: isWorkingHour flag + business hours window (8-20) + doctor list

                    // Filter 1: isWorkingHour flag — from Prodentis calendar (white vs grey/red)
                    if (appointment.isWorkingHour !== true) {
                        console.log(`   ⛔ Skipping: Non-working hour (grey/red field in Prodentis calendar)`);
                        skippedCount++;
                        continue;
                    }

                    // Filter 2: Business hours window (8:00 - 20:00)
                    // Catches informational entries at 5:45, 6:45, 7:15 etc. that have isWorkingHour=true
                    if (appointmentHour < MIN_BUSINESS_HOUR || appointmentHour >= MAX_BUSINESS_HOUR) {
                        console.log(`   ⛔ Skipping: Outside business hours (${appointmentTime}, must be ${MIN_BUSINESS_HOUR}:00-${MAX_BUSINESS_HOUR}:00)`);
                        skippedCount++;
                        continue;
                    }

                    // Log working doctor confirmation
                    if (workingDoctorIds.has(doctorId)) {
                        console.log(`   ✅ Doctor confirmed working today (has free slots)`);
                    } else {
                        console.log(`   ℹ️  Doctor not in free slots (fully booked) — proceeding with isWorkingHour=true`);
                    }
                }

                // 5b. Filter: Has phone number?
                if (!appointment.patientPhone) {
                    console.log(`   ⚠️  Skipping: No phone number`);
                    skippedCount++;
                    skippedPatients.push({
                        patientName: appointment.patientName || 'Nieznany pacjent',
                        doctorName: doctorName,
                        appointmentTime: appointmentTime,
                        appointmentType: appointment.appointmentType?.name || '',
                        reason: 'Brak numeru telefonu'
                    });
                    errors.push({
                        appointment: `${appointment.patientName} (${appointment.id})`,
                        error: 'Missing phone number'
                    });
                    continue;
                }

                // 5c. Filter: Is doctor in reminder list? (fuzzy matching)
                // Nowosielska bypasses this — she's hardcoded as a special case
                if (!isNowosielska && !isDoctorInList(doctorName, REMINDER_DOCTORS)) {
                    console.log(`   ⚠️  Skipping: Doctor not in reminder list (${doctorName})`);
                    skippedCount++;
                    skippedPatients.push({
                        patientName: appointment.patientName || 'Nieznany pacjent',
                        doctorName: doctorName,
                        appointmentTime: appointmentTime,
                        appointmentType: appointment.appointmentType?.name || '',
                        reason: `Lekarz spoza listy przypomnień (${doctorName})`
                    });
                    continue;
                }

                // NOTE: No duplicate-check needed — we always clean up old drafts above (step 5)
                // and new drafts should always be generated regardless of previous sent status

                // 6. Generate personalized SMS message
                const appointmentType = appointment.appointmentType.name;
                // appointmentDate already declared in white-field validation above

                // Get template (use cached templates if available, otherwise fetch per-appointment)
                let template: string;
                if (cachedTemplates) {
                    const normalizedType = appointmentType.toLowerCase();
                    const typeKey = `bytype:${normalizedType}`;
                    template = cachedTemplates.get(typeKey)
                        || cachedTemplates.get('default')
                        || 'Gabinet Mikrostomart przypomina o wizycie {date} o {time}. Prosimy o potwierdzenie:';
                } else {
                    template = await getSMSTemplate(doctorName, appointmentType);
                }

                const formattedDate = appointmentDate.toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'Europe/Warsaw'
                });

                let message = formatSMSMessage(template, {
                    patientName: appointment.patientName.split(' ')[0], // First name only
                    doctor: doctorName,
                    date: formattedDate,
                    time: appointmentTime,
                    appointmentType: appointmentType
                });

                // In Monday mode (Friday→Monday): replace 'jutro'/'jutrzejszej' with actual date
                // Templates hardcode 'jutro' but for Friday pass, appointment is on Monday
                if (isMondayMode) {
                    message = message
                        .replace(/jutrzejszej wizycie/gi, `wizycie w ${formattedDate}`)
                        .replace(/jutrzejszej/gi, formattedDate)
                        .replace(/jutro/gi, `w ${formattedDate}`);
                }

                console.log(`   📝 Generated SMS (${message.length} chars): "${message.substring(0, 80)}..."`);

                // 7. Find or create patient_id (for FK relationship)
                let patientId = null;
                const { data: existingPatient } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('prodentis_id', appointment.patientId)
                    .maybeSingle();

                patientId = existingPatient?.id || null;

                // 8. Always INSERT new draft (old drafts cleaned up at step 5)
                const draftId = randomUUID();
                const { data: draftData, error: draftError } = await supabase
                    .from('sms_reminders')
                    .insert([{
                        id: draftId,
                        patient_id: patientId,
                        prodentis_id: appointment.id,
                        patient_name: appointment.patientName,
                        phone: appointment.patientPhone,
                        appointment_date: appointment.date,
                        doctor_name: doctorName,
                        appointment_type: appointmentType,
                        sms_message: message,
                        status: 'draft',
                        sms_type: 'reminder',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }])
                    .select();

                if (!draftError && draftData && draftData[0]) {
                    console.log(`   ✅ Draft created (ID: ${draftData[0].id})`);
                }

                if (draftError) {
                    console.error(`   ❌ Failed to save draft:`, draftError);
                    errors.push({
                        appointment: `${appointment.patientName} (${appointment.id})`,
                        error: `Draft save failed: ${draftError.message}`
                    });
                    continue;
                }

                draftsCreated++;

                // Send push notification to patient (if subscribed)
                if (patientId) {
                    sendTranslatedPushToUser(
                        patientId,
                        'patient',
                        'appointment_24h',
                        {
                            time: appointmentTime,
                            doctor: doctorName,
                            type: appointmentType,
                        },
                        '/strefa-pacjenta/dashboard'
                    ).catch(err => console.error('   ⚠️  Push notification error:', err));
                }

                try {
                    const appointmentActionId = randomUUID();

                    // Calculate end date (default 30 minutes duration)
                    const appointmentEndDate = new Date(appointment.date);
                    appointmentEndDate.setMinutes(appointmentEndDate.getMinutes() + 30);

                    // Upsert appointment_action (update if exists, insert if not)
                    const { data: actionData, error: actionError } = await supabase
                        .from('appointment_actions')
                        .upsert({
                            id: appointmentActionId,
                            patient_id: patientId, // Can be NULL for patients without accounts
                            prodentis_id: appointment.id,
                            patient_name: appointment.patientName || 'Nieznany pacjent',
                            patient_phone: appointment.patientPhone || 'Brak',
                            appointment_date: appointment.date,
                            appointment_end_date: appointmentEndDate.toISOString(),
                            doctor_name: doctorName,
                            appointment_type: appointmentType,
                            status: 'pending',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'prodentis_id,appointment_date', // Update on duplicate
                            ignoreDuplicates: false
                        })
                        .select()
                        .single();

                    if (actionError) {
                        console.error(`   ⚠️  Failed to upsert appointment_action:`, actionError);
                    } else {
                        const finalActionId = actionData?.id || appointmentActionId;
                        console.log(`   ✅ Appointment action upserted (ID: ${finalActionId})`);

                        // 10. Generate short link for landing page
                        const appointmentSlug = mapAppointmentTypeToSlug(appointmentType);
                        const fullUrl = `https://mikrostomart.pl/wizyta/${appointmentSlug}?appointmentId=${finalActionId}&date=${targetDateStr}&time=${appointmentTime}&doctor=${encodeURIComponent(doctorName)}`;

                        const shortCode = nanoid(6);

                        // Calculate expiration (3 days after appointment)
                        const expiresAt = new Date(appointment.date);
                        expiresAt.setDate(expiresAt.getDate() + 3);

                        const { data: shortLink, error: shortLinkError } = await supabase
                            .from('short_links')
                            .insert({
                                short_code: shortCode,
                                destination_url: fullUrl,
                                appointment_id: appointmentActionId,
                                patient_id: patientId,
                                appointment_type: appointmentSlug,
                                expires_at: expiresAt.toISOString()
                            })
                            .select()
                            .single();

                        if (shortLinkError) {
                            console.error(`   ⚠️  Failed to create short link:`, shortLinkError);
                        } else {
                            const shortUrl = `https://mikrostomart.pl/s/${shortCode}`;
                            console.log(`   ✅ Short link created: ${shortUrl}`);

                            // Update SMS draft with short link
                            const messageWithLink = `${message}\n\n${shortUrl}`;

                            await supabase
                                .from('sms_reminders')
                                .update({ sms_message: messageWithLink })
                                .eq('id', draftId);

                            console.log(`   📝 Updated SMS with short link`);
                        }
                    }
                } catch (actionErr) {
                    console.error(`   ⚠️  Error creating appointment_action or short link:`, actionErr);
                }


            } catch (error: any) {
                console.error(`   ❌ Error processing appointment:`, error);
                errors.push({
                    appointment: `${appointment.patientName || 'Unknown'} (${appointment.id})`,
                    error: error.message
                });
            }
        }

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n📊 [SMS Reminders] Summary:`);
        console.log(`   Total appointments: ${processedCount}`);
        console.log(`   Drafts created: ${draftsCreated}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Errors: ${errors.length}`);
        console.log(`   Duration: ${duration}s`);

        if (errors.length > 0) {
            console.error(`\n❌ [SMS Reminders] Errors:`, errors);
        }

        await logCronHeartbeat('appointment-reminders', 'ok', `Drafts: ${draftsCreated}, Skipped: ${skippedCount}`, Date.now() - startTime);

        return NextResponse.json({
            success: true,
            processed: processedCount,
            draftsCreated: draftsCreated,
            skipped: skippedCount,
            skippedPatients: skippedPatients.length > 0 ? skippedPatients : undefined,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined,
            duration: `${duration}s`
        });

    } catch (error: any) {
        console.error('💥 [SMS Reminders] Fatal error:', error);
        await logCronHeartbeat('appointment-reminders', 'error', error.message, Date.now() - startTime);
        return NextResponse.json({
            success: false,
            error: error.message,
            processed: processedCount,
            draftsCreated: draftsCreated,
            skipped: skippedCount
        }, { status: 500 });
    }
}
