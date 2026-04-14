import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const PRODENTIS_API_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/**
 * Get hour in Europe/Warsaw timezone.
 */
function getWarsawHour(date: Date): number {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour12: false, hour: 'numeric' });
    return parseInt(formatter.format(date));
}

/**
 * Smart-snap algorithm: snap timestamp to reasonable hours (7:00-22:00) in Europe/Warsaw timezone.
 * If the time falls in quiet hours (22:00-07:00 Warsaw time), it snaps to the nearest boundary.
 */
function smartSnap(date: Date, quietStart = 22, quietEnd = 7): Date {
    const warsawHour = getWarsawHour(date);
    const result = new Date(date);
    if (warsawHour >= quietStart) {
        // Past quiet start (e.g. 22:00+ Warsaw) → snap back to quietStart Warsaw time
        const diffMs = (warsawHour - quietStart) * 60 * 60 * 1000;
        result.setTime(result.getTime() - diffMs);
        result.setMinutes(0, 0, 0);
    } else if (warsawHour < quietEnd) {
        // Before quiet end (e.g. before 7:00 Warsaw) → snap forward to quietEnd Warsaw time
        const diffMs = (quietEnd - warsawHour) * 60 * 60 * 1000;
        result.setTime(result.getTime() + diffMs);
        result.setMinutes(0, 0, 0);
    }
    return result;
}

/**
 * CareFlow Auto-Qualification Cron
 * Runs daily at 8:00 AM — scans tomorrow's Prodentis appointments
 * and auto-enrolls patients whose appointment type matches a CareFlow template's procedure_types.
 *
 * Flow:
 * 1. Fetch all active CareFlow templates with their procedure_types
 * 2. Fetch all appointments for tomorrow from Prodentis
 * 3. Match appointment types to template procedure_types (case-insensitive, partial match)
 * 4. Skip if patient already has active enrollment for this appointment
 * 5. Auto-enroll matching patients
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('🏥 [CareFlow Auto-Qualify] Starting cron...');
    const startTime = Date.now();

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let enrolled = 0;
    let skipped = 0;
    let matched = 0;
    const errors: string[] = [];

    try {
        // 1. Fetch all active templates with procedure_types
        const { data: templates, error: tErr } = await supabase
            .from('care_templates')
            .select('*')
            .eq('is_active', true);

        if (tErr) throw new Error(`Templates query failed: ${tErr.message}`);

        // Filter templates that have procedure_types defined (auto-qualify enabled)
        const autoTemplates = (templates || []).filter(
            (t: any) => t.procedure_types && t.procedure_types.length > 0
        );

        if (autoTemplates.length === 0) {
            console.log('🏥 [CareFlow Auto-Qualify] No templates with procedure_types — nothing to auto-qualify.');
            return NextResponse.json({ success: true, enrolled: 0, message: 'No auto-qualify templates' });
        }

        console.log(`📋 Templates with auto-qualify: ${autoTemplates.map((t: any) => `${t.name} (${t.procedure_types.join(', ')})`).join('; ')}`);

        // 2. Calculate target date (tomorrow)
        const url = new URL(req.url);
        const targetDateParam = url.searchParams.get('targetDate');
        const targetDate = new Date();
        if (targetDateParam) {
            // Manual override for testing
            const parts = targetDateParam.split('-');
            targetDate.setFullYear(+parts[0], +parts[1] - 1, +parts[2]);
        } else {
            targetDate.setUTCDate(targetDate.getUTCDate() + 1); // tomorrow
        }
        const targetDateStr = targetDate.toISOString().split('T')[0];
        console.log(`📅 Scanning appointments for: ${targetDateStr}`);

        // 3. Fetch appointments from Prodentis
        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDateStr}`;
        const apiResponse = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!apiResponse.ok) {
            throw new Error(`Prodentis API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        const apiData = await apiResponse.json();
        const appointments = apiData.appointments || [];
        console.log(`📊 Found ${appointments.length} appointments for ${targetDateStr}`);

        if (appointments.length === 0) {
            return NextResponse.json({ success: true, enrolled: 0, message: 'No appointments for target date' });
        }

        // 4. Build procedure_type → template mapping (case-insensitive, partial match)
        // Template procedure_types: ["Chirurgia", "Implantologia"]
        // Appointment type: "Chirurgia stomatologiczna" → should match "Chirurgia"

        // 5. Process each appointment
        for (const appointment of appointments) {
            const appointmentType = appointment.appointmentType?.name || '';
            const patientId = appointment.patientId;
            const patientName = appointment.patientName || 'Nieznany';
            const doctorName = (appointment.doctor?.name || '').replace(/\s*\(I\)\s*/g, ' ').trim();

            if (!patientId || !appointmentType) {
                skipped++;
                continue;
            }

            // Skip non-working-hour appointments
            if (appointment.isWorkingHour !== true) {
                continue;
            }

            // Find matching template
            const normalizedType = appointmentType.toLowerCase().trim();
            let matchedTemplate: any = null;

            for (const template of autoTemplates) {
                const types = (template.procedure_types || []) as string[];
                const isMatch = types.some((pt: string) => {
                    const normalizedPt = pt.toLowerCase().trim();
                    // Partial match: "chirurgia" matches "chirurgia stomatologiczna"
                    return normalizedType.includes(normalizedPt) || normalizedPt.includes(normalizedType);
                });
                if (isMatch) {
                    matchedTemplate = template;
                    break;
                }
            }

            if (!matchedTemplate) {
                // No template matches this appointment type
                continue;
            }

            matched++;
            console.log(`   🎯 Match: "${appointmentType}" → template "${matchedTemplate.name}" for ${patientName}`);

            // 6. Check if patient already enrolled for this appointment
            const { data: existing } = await supabase
                .from('care_enrollments')
                .select('id')
                .eq('patient_id', patientId)
                .eq('status', 'active')
                .gte('appointment_date', `${targetDateStr}T00:00:00`)
                .lte('appointment_date', `${targetDateStr}T23:59:59`)
                .maybeSingle();

            if (existing) {
                console.log(`   ⏭ Already enrolled: ${patientName} (enrollment ${existing.id})`);
                skipped++;
                continue;
            }

            // 7. Get template steps
            const { data: steps } = await supabase
                .from('care_template_steps')
                .select('*')
                .eq('template_id', matchedTemplate.id)
                .order('sort_order', { ascending: true });

            if (!steps || steps.length === 0) {
                console.log(`   ⚠️ Template "${matchedTemplate.name}" has no steps — skipping`);
                skipped++;
                continue;
            }

            // 8. Find patient DB ID
            const { data: patientRow } = await supabase
                .from('patients')
                .select('id')
                .eq('prodentis_id', patientId)
                .maybeSingle();

            // 9. Create enrollment
            // Prodentis gives date and time in Poland's local timezone.
            // We construct an ISO string with the correct Warsaw offset.
            const rawTime = appointment.time || '10:00';
            const rawDateTime = `${appointment.date}T${rawTime}:00`;
            const sampleDate = new Date(rawDateTime + 'Z');
            const warsawFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour12: false, hour: 'numeric' });
            let offsetHours = parseInt(warsawFormatter.format(sampleDate)) - sampleDate.getUTCHours();
            if (offsetHours < -12) offsetHours += 24;
            if (offsetHours > 12) offsetHours -= 24;
            const offsetStr = `${offsetHours >= 0 ? '+' : '-'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
            
            const appointmentDateStr = `${rawDateTime}${offsetStr}`;
            const appointmentDateObj = new Date(appointmentDateStr);
            console.log(`   📅 Parsed Prodentis Date: ${rawDateTime} -> ${appointmentDateStr} (offset ${offsetStr})`);
            
            const pushSettings = matchedTemplate.push_settings || {};
            const quietStart = pushSettings.quiet_hours_start || 22;
            const quietEnd = pushSettings.quiet_hours_end || 7;

            const { data: enrollment, error: eErr } = await supabase
                .from('care_enrollments')
                .insert({
                    patient_id: patientId,
                    patient_name: patientName,
                    patient_phone: appointment.patientPhone || null,
                    patient_db_id: patientRow?.id || null,
                    template_id: matchedTemplate.id,
                    template_name: matchedTemplate.name,
                    appointment_id: appointment.id || null,
                    appointment_date: appointmentDateStr,
                    doctor_name: doctorName,
                    enrolled_by: 'auto-qualify',
                })
                .select()
                .single();

            if (eErr) {
                console.error(`   ❌ Enrollment failed for ${patientName}:`, eErr.message);
                errors.push(`${patientName}: ${eErr.message}`);
                continue;
            }

            // 10. Generate tasks from template steps
            const medications = matchedTemplate.default_medications || [];
            const taskRows = steps.map((step: any) => {
                let scheduledAt = new Date(appointmentDateObj.getTime() + step.offset_hours * 60 * 60 * 1000);
                if (step.smart_snap) {
                    scheduledAt = smartSnap(scheduledAt, quietStart, quietEnd);
                }

                let visibleFrom = null;
                if (step.visible_hours_before) {
                    visibleFrom = new Date(scheduledAt.getTime() - step.visible_hours_before * 60 * 60 * 1000);
                }

                let medName = null, medDose = null, medDesc = null;
                if (step.medication_index !== null && step.medication_index !== undefined && medications[step.medication_index]) {
                    const med = medications[step.medication_index];
                    medName = med.name;
                    medDose = med.dose;
                    medDesc = med.description;
                }

                return {
                    enrollment_id: enrollment.id,
                    step_id: step.id,
                    sort_order: step.sort_order,
                    title: step.title,
                    description: step.description,
                    icon: step.icon,
                    scheduled_at: scheduledAt.toISOString(),
                    original_offset_hours: step.offset_hours,
                    push_max_count: step.reminder_max_count || 6,
                    push_interval_minutes: step.reminder_interval_minutes || 30,
                    medication_name: medName,
                    medication_dose: medDose,
                    medication_description: medDesc,
                    visible_from: visibleFrom?.toISOString() || null,
                    requires_confirmation: step.requires_confirmation ?? true,
                };
            });

            const { error: taskErr } = await supabase.from('care_tasks').insert(taskRows);
            if (taskErr) {
                console.error(`   ❌ Task creation failed for ${patientName}:`, taskErr.message);
                errors.push(`${patientName} tasks: ${taskErr.message}`);
                continue;
            }

            // 11. Audit log
            await supabase.from('care_audit_log').insert({
                enrollment_id: enrollment.id,
                action: 'auto_enrolled',
                actor: 'careflow-auto-qualify',
                details: {
                    template_name: matchedTemplate.name,
                    patient_name: patientName,
                    appointment_type: appointmentType,
                    tasks_created: taskRows.length,
                    appointment_date: appointmentDateStr,
                },
            });

            enrolled++;
            console.log(`   ✅ Auto-enrolled: ${patientName} → "${matchedTemplate.name}" (${taskRows.length} tasks, token: ${enrollment.access_token})`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🏥 [CareFlow Auto-Qualify] Done: ${matched} matched, ${enrolled} enrolled, ${skipped} skipped, ${errors.length} errors (${duration}s)`);

        return NextResponse.json({
            success: true,
            matched,
            enrolled,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            duration: `${duration}s`,
        });
    } catch (err: any) {
        console.error('🏥 [CareFlow Auto-Qualify] Fatal error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
