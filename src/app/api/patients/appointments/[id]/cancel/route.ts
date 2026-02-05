import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type { CancelAppointmentRequest, AppointmentActionResponse, AppointmentAction } from '@/types/appointmentActions';

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
        const body: CancelAppointmentRequest = await request.json();

        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get patient
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone')
            .eq('id', user.id)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Get appointment action
        const { data: action, error: actionError } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id)
            .single();

        if (actionError || !action) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        const appointmentAction = action as AppointmentAction;

        // Validate appointment hasn't passed
        const appointmentDate = new Date(appointmentAction.appointment_date);
        const now = new Date();

        if (appointmentDate <= now) {
            return NextResponse.json(
                { error: 'Nie można odwołać wizyty która już się odbyła' },
                { status: 400 }
            );
        }

        if (appointmentAction.cancellation_requested) {
            return NextResponse.json(
                { error: 'Prośba o odwołanie już została wysłana' },
                { status: 400 }
            );
        }

        // Update appointment action
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                cancellation_requested: true,
                cancellation_requested_at: new Date().toISOString(),
                cancellation_reason: body.reason || null,
                status: 'cancellation_pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        // Format dates
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

        // Send email to clinic
        const emailHtml = `
            <h2>⚠️ Pacjent prosi o odwołanie wizyty</h2>
            
            <p>Dzień dobry,</p>
            
            <p>Pacjent <strong>PROSI O ODWOŁANIE</strong> wizyty:</p>
            
            <ul>
                <li><strong>📅 Data:</strong> ${appointmentDateFormatted}</li>
                <li><strong>🕐 Godzina:</strong> ${appointmentTime}</li>
                <li><strong>👤 Pacjent:</strong> ${patient.phone}</li>
                <li><strong>👨‍⚕️ Lekarz:</strong> ${appointmentAction.doctor_name || 'Nie podano'}</li>
                <li><strong>📱 Telefon:</strong> ${patient.phone}</li>
            </ul>
            
            ${body.reason ? `
            <p><strong>Powód:</strong><br>
            ${body.reason}</p>
            ` : '<p><strong>Powód:</strong> Nie podano</p>'}
            
            <hr>
            
            <p>⚠️ <strong>Wymagane działanie:</strong><br>
            Prośba wymaga <strong>ręcznego odwołania</strong> wizyty w systemie Prodentis.</p>
            
            <p>Pacjent został poinformowany, że wizyta zostanie odwołana w ciągu 24h.</p>
            
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
                to: ['recepcja@mikrostomart.pl'],
                subject: '⚠️ Pacjent prosi o odwołanie wizyty',
                html: emailHtml
            });
            emailSent = true;
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
        }

        const response: AppointmentActionResponse = {
            success: true,
            message: 'Prośba o odwołanie wizyty została wysłana. Gabinet skontaktuje się w ciągu 24h.',
            emailSent
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error canceling appointment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
