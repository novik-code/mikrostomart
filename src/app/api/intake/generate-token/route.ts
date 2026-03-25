import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';

/**
 * POST /api/intake/generate-token
 * Generuje jednorazowy token do cyfrowej karty pacjenta.
 * Wywoływane przez pracownika z grafiku / strefy pracownika.
 *
 * Body: {
 *   prodentisPatientId?: string,   // jeśli pacjent już istnieje
 *   prefillFirstName?: string,
 *   prefillLastName?: string,
 *   appointmentId?: string,
 *   appointmentDate?: string,
 *   appointmentType?: string,
 *   createdByEmployee: string,     // e-mail pracownika
 *   expiresInHours?: number,       // domyślnie 24
 * }
 *
 * Response: { token, url, expiresAt }
 */
export async function POST(req: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
        prodentisPatientId,
        prefillFirstName,
        prefillLastName,
        appointmentId,
        appointmentDate,
        appointmentType,
        createdByEmployee,
        expiresInHours = 24,
    } = body;

    if (!createdByEmployee) {
        return NextResponse.json({ error: 'createdByEmployee is required' }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('patient_intake_tokens')
        .insert({
            prodentis_patient_id: prodentisPatientId || null,
            prefill_first_name: prefillFirstName || null,
            prefill_last_name: prefillLastName || null,
            appointment_id: appointmentId || null,
            appointment_date: appointmentDate || null,
            appointment_type: appointmentType || null,
            created_by_employee: createdByEmployee,
            expires_at: expiresAt,
        })
        .select('token, expires_at')
        .single();

    if (error) {
        console.error('Error creating intake token:', error);
        return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
    const url = `${baseUrl}/ekarta/${data.token}`;

    return NextResponse.json({
        token: data.token,
        url,
        expiresAt: data.expires_at,
    });
}
