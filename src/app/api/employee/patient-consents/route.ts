import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/patient-consents?prodentisId=X
 * Returns list of signed consents for a patient.
 */
export async function GET(req: NextRequest) {
    const prodentisId = req.nextUrl.searchParams.get('prodentisId');
    const patientName = req.nextUrl.searchParams.get('patientName');

    if (!prodentisId && !patientName) {
        return NextResponse.json({ error: 'prodentisId or patientName required' }, { status: 400 });
    }

    try {
        let query = supabase
            .from('patient_consents')
            .select('id, consent_type, consent_label, file_url, file_name, signed_at, prodentis_synced, biometric_data, signature_data')
            .order('signed_at', { ascending: false });

        if (prodentisId) {
            query = query.eq('prodentis_patient_id', prodentisId);
        } else if (patientName) {
            query = query.eq('patient_name', patientName);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ consents: data || [] });
    } catch (err: any) {
        console.error('[PatientConsents] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
