import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/careflow/[token]
 * Public endpoint — token is the auth.
 * Returns enrollment data with tasks for the patient landing page.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

        if (!token || token.length < 10) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        const { data: enrollment, error } = await supabase
            .from('care_enrollments')
            .select('id, patient_name, template_name, appointment_date, doctor_name, status, prescription_code, custom_notes, custom_medications, follow_up_appointments, template_id')
            .eq('access_token', token)
            .single();

        if (error || !enrollment) {
            return NextResponse.json({ error: 'Nie znaleziono procesu opieki' }, { status: 404 });
        }

        if (enrollment.status === 'cancelled') {
            return NextResponse.json({ error: 'Ten proces opieki został anulowany', status: 'cancelled' }, { status: 410 });
        }

        // Get tasks
        const now = new Date();
        const { data: tasks } = await supabase
            .from('care_tasks')
            .select('id, sort_order, title, description, icon, scheduled_at, completed_at, skipped_at, medication_name, medication_dose, medication_description, visible_from, requires_confirmation')
            .eq('enrollment_id', enrollment.id)
            .order('sort_order', { ascending: true });

        // Filter tasks by visibility
        const visibleTasks = (tasks || []).filter((t: any) => {
            if (!t.visible_from) return true;
            return new Date(t.visible_from) <= now;
        });

        // Get template medications for reference
        const { data: template } = await supabase
            .from('care_templates')
            .select('default_medications')
            .eq('id', enrollment.template_id)
            .single();

        const medications = enrollment.custom_medications || template?.default_medications || [];

        // Determine current phase
        const aptDate = new Date(enrollment.appointment_date);
        const phase = now < aptDate ? 'pre' : 'post';

        // Time until appointment
        const msUntil = aptDate.getTime() - now.getTime();
        const hoursUntil = Math.round(msUntil / (1000 * 60 * 60) * 10) / 10;

        return NextResponse.json({
            enrollment: {
                patientName: enrollment.patient_name,
                templateName: enrollment.template_name,
                appointmentDate: enrollment.appointment_date,
                doctorName: enrollment.doctor_name,
                status: enrollment.status,
                prescriptionCode: enrollment.prescription_code,
                customNotes: enrollment.custom_notes,
                followUpAppointments: enrollment.follow_up_appointments || [],
            },
            tasks: visibleTasks.map((t: any) => ({
                id: t.id,
                sortOrder: t.sort_order,
                title: t.title,
                description: t.description,
                icon: t.icon,
                scheduledAt: t.scheduled_at,
                completedAt: t.completed_at,
                skippedAt: t.skipped_at,
                medicationName: t.medication_name,
                medicationDose: t.medication_dose,
                medicationDescription: t.medication_description,
                requiresConfirmation: t.requires_confirmation,
            })),
            medications,
            phase,
            hoursUntilAppointment: hoursUntil,
        });
    } catch (err: any) {
        console.error('[CareFlow] GET token error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}
