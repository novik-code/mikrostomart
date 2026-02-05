import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type { ConfirmAttendanceRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params;
        const body: ConfirmAttendanceRequest = await request.json();

        // Get JWT token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone')
            .eq('id', user.id)
            .single();

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        // Get appointment action
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id)
            .single();

        if (actionError || !action) {
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const appointmentAction = action as AppointmentAction;

        // Validate timing (must be <24h before appointment)
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil > 24) {
            return NextResponse.json(
                { error: 'Potwierdzenie obecności możliwe tylko 24h przed wizytą' },
                { status: 400 }
            );
        }

        if (hoursUntil <= 0) {
            return NextResponse.json(
                { error: 'Wizyta już się odbyła' },
                { status: 400 }
            );
        }

        if (appointmentAction.attendance_confirmed) {
            return NextResponse.json(
                { error: 'Obecność już potwierdzona' },
                { status: 400 }
            );
        }

        // Update appointment action
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                attendance_confirmed: true,
                attendance_confirmed_at: new Date().toISOString(),
                status: 'attendance_confirmed',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        // Format dates for email
        const appointmentDateFormatted = appointmentDate.toLocaleDateString('pl-PL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const appointmentTime = appointmentDate.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const confirmedAt = new Date().toLocaleString('pl-PL');

        // Send email to clinic
        const emailHtml = `
            <h2>✅ Pacjent potwierdził obecność na wizycie</h2>
            
            <p>Dzień dobry,</p>
            
            <p>Pacjent <strong>POTWIERDZIŁ obecność</strong> na wizycie:</p>
            
            <ul>
                <li><strong>📅 Data:</strong> ${appointmentDateFormatted}</li>
                <li><strong>🕐 Godzina:</strong> ${appointmentTime}</li>
                <li><strong>👤 Pacjent:</strong> ${patient.phone}</li>
                <li><strong>👨‍⚕️ Lekarz:</strong> ${appointmentAction.doctor_name || 'Nie podano'}</li>
                <li><strong>📱 Telefon:</strong> ${patient.phone}</li>
            </ul>
            
            <hr>
            
            <p><strong>Status:</strong> Obecność potwierdzona<br>
            <strong>Potwierdzono:</strong> ${confirmedAt}</p>
            
            <hr>
            <p style="color: #666; font-size: 12px;">
                Wiadomość wysłana automatycznie z systemu Strefa Pacjenta<br>
                Mikrostomart - Dentysta Opole
            </p>
        `;

        let emailSent = false;
        try {
            await resend.emails.send({
                from: 'Strefa Pacjenta <noreply@mikrostomart.pl>',
                to: ['recepcja@mikrostomart.pl'], // TODO: Get from env or config
                subject: '✅ Pacjent potwierdził obecność na wizycie',
                html: emailHtml
            });
            emailSent = true;
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the request if email fails
        }

        // TODO: Send SMS (SMSAPI.pl integration in Phase 2)
        const smsSent = false;

        const response: AppointmentActionResponse = {
            success: true,
            message: 'Potwierdzenie obecności wysłane. Gabinet został powiadomiony.',
            emailSent,
            smsSent
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error confirming attendance:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
