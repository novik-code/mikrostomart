import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Verify JWT
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const appointmentId = params.id;

        // Verify patient owns this appointment action
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (!patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        const { data: appointmentAction } = await supabase
            .from('appointment_actions')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', patient.id)
            .single();

        if (!appointmentAction) {
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        // Reset status
        const { error: updateError } = await supabase
            .from('appointment_actions')
            .update({
                cancellation_requested: false,
                reschedule_requested: false,
                attendance_confirmed: false,
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: 'Status zresetowany - możesz ponownie przetestować akcje'
        });

    } catch (error: any) {
        console.error('Error resetting appointment status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
