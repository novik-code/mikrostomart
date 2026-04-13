import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Smart-snap algorithm: snap timestamp to reasonable hours (7:00-22:00).
 * If time falls outside this window, move to nearest boundary.
 */
function smartSnap(date: Date, quietStart = 22, quietEnd = 7): Date {
    const h = date.getHours();
    const result = new Date(date);
    if (h >= quietStart) {
        // After 22:00 → snap to 22:00 same day
        result.setHours(quietStart, 0, 0, 0);
    } else if (h < quietEnd) {
        // Before 7:00 → snap to 7:00 same day
        result.setHours(quietEnd, 0, 0, 0);
    }
    return result;
}

/**
 * POST /api/employee/careflow/enroll
 * Enroll a patient in a CareFlow process.
 * Auth: employee or admin role.
 * Body: { templateId, patientId, patientName, patientPhone, appointmentId, appointmentDate, doctorName, doctorId, prescriptionCode?, customNotes?, customMedications? }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { templateId, patientId, patientName, patientPhone, appointmentId, appointmentDate, doctorName, doctorId, prescriptionCode, customNotes, customMedications } = body;

        if (!templateId || !patientId || !patientName || !appointmentDate) {
            return NextResponse.json({ error: 'Missing required fields: templateId, patientId, patientName, appointmentDate' }, { status: 400 });
        }

        // Check for existing active enrollment for this patient+appointment
        const { data: existing } = await supabase
            .from('care_enrollments')
            .select('id')
            .eq('patient_id', patientId)
            .eq('appointment_id', appointmentId || '')
            .eq('status', 'active')
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Pacjent już ma aktywny CareFlow dla tej wizyty', enrollmentId: existing.id }, { status: 409 });
        }

        // Get template with steps
        const { data: template, error: tErr } = await supabase
            .from('care_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        const { data: steps } = await supabase
            .from('care_template_steps')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true });

        if (!steps || steps.length === 0) {
            return NextResponse.json({ error: 'Template has no steps' }, { status: 400 });
        }

        // Find patient's DB UUID for push notifications
        const { data: patientRow } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', patientId)
            .maybeSingle();

        const appointmentDateObj = new Date(appointmentDate);
        const pushSettings = template.push_settings || {};
        const quietStart = pushSettings.quiet_hours_start || 22;
        const quietEnd = pushSettings.quiet_hours_end || 7;

        // Create enrollment
        const { data: enrollment, error: eErr } = await supabase
            .from('care_enrollments')
            .insert({
                patient_id: patientId,
                patient_name: patientName,
                patient_phone: patientPhone || null,
                patient_db_id: patientRow?.id || null,
                template_id: templateId,
                template_name: template.name,
                appointment_id: appointmentId || null,
                appointment_date: appointmentDate,
                doctor_name: doctorName || null,
                doctor_id: doctorId || null,
                prescription_code: prescriptionCode || null,
                custom_notes: customNotes || null,
                custom_medications: customMedications || null,
                enrolled_by: user.email || 'employee',
            })
            .select()
            .single();

        if (eErr) throw new Error(eErr.message);

        // Generate tasks from template steps
        const medications = customMedications || template.default_medications || [];
        const taskRows = steps.map((step: any) => {
            // Calculate scheduled time
            let scheduledAt = new Date(appointmentDateObj.getTime() + step.offset_hours * 60 * 60 * 1000);
            if (step.smart_snap) {
                scheduledAt = smartSnap(scheduledAt, quietStart, quietEnd);
            }

            // Calculate visible_from
            let visibleFrom = null;
            if (step.visible_hours_before) {
                visibleFrom = new Date(scheduledAt.getTime() - step.visible_hours_before * 60 * 60 * 1000);
            }

            // Get medication details if applicable
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
        if (taskErr) throw new Error(`Task creation failed: ${taskErr.message}`);

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: enrollment.id,
            action: 'enrolled',
            actor: user.email || 'employee',
            details: { template_name: template.name, patient_name: patientName, tasks_created: taskRows.length },
        });

        return NextResponse.json({
            success: true,
            enrollment: {
                id: enrollment.id,
                accessToken: enrollment.access_token,
                landingPageUrl: `/opieka/${enrollment.access_token}`,
                tasksCreated: taskRows.length,
            },
        });
    } catch (err: any) {
        console.error('[CareFlow] Enroll error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
