import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/intake/verify/[token]
 * Sprawdza czy token jest ważny i zwraca dane do pre-fill formularza.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('patient_intake_tokens')
        .select('*')
        .eq('token', token)
        .single();

    if (error || !data) {
        return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 });
    }

    if (data.used_at) {
        return NextResponse.json({ valid: false, reason: 'already_used' }, { status: 410 });
    }

    if (new Date(data.expires_at) < new Date()) {
        return NextResponse.json({ valid: false, reason: 'expired' }, { status: 410 });
    }

    return NextResponse.json({
        valid: true,
        prefill: {
            firstName: data.prefill_first_name || '',
            lastName: data.prefill_last_name || '',
        },
        prodentisPatientId: data.prodentis_patient_id || null,
        appointmentType: data.appointment_type || null,
        appointmentDate: data.appointment_date || null,
        expiresAt: data.expires_at,
    });
}
