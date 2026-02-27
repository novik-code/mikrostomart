import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/patient-intake?prodentisId=X
 * Returns e-karta submission data including signature.
 */
export async function GET(req: NextRequest) {
    const prodentisId = req.nextUrl.searchParams.get('prodentisId');

    if (!prodentisId) {
        return NextResponse.json({ error: 'prodentisId required' }, { status: 400 });
    }

    try {
        // Find intake submission via token that had this prodentis_patient_id
        const { data: tokens } = await supabase
            .from('patient_intake_tokens')
            .select('id')
            .eq('prodentis_patient_id', prodentisId);

        if (!tokens?.length) {
            return NextResponse.json({ intake: null });
        }

        const tokenIds = tokens.map((t: any) => t.id);

        const { data: submissions, error } = await supabase
            .from('patient_intake_submissions')
            .select('id, first_name, last_name, signature_data, medical_survey, created_at')
            .in('token_id', tokenIds)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        const intake = submissions?.[0] || null;

        return NextResponse.json({
            intake: intake ? {
                id: intake.id,
                firstName: intake.first_name,
                lastName: intake.last_name,
                hasSignature: !!intake.signature_data,
                signatureData: intake.signature_data,
                createdAt: intake.created_at,
            } : null,
        });
    } catch (err: any) {
        console.error('[PatientIntake] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
