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
        // Strategy 1: Find via token's prodentis_patient_id
        const { data: tokens } = await supabase
            .from('patient_intake_tokens')
            .select('id')
            .eq('prodentis_patient_id', prodentisId);

        const tokenIds = tokens?.map((t: any) => t.id) || [];

        // Strategy 2: Also search submissions directly by prodentis_patient_id
        // (set after Prodentis sync in submit route)
        let submissions: any[] = [];

        if (tokenIds.length) {
            const { data: byToken } = await supabase
                .from('patient_intake_submissions')
                .select('id, first_name, last_name, signature_data, medical_survey, created_at, pdf_url, prodentis_patient_id')
                .in('token_id', tokenIds)
                .order('created_at', { ascending: false })
                .limit(1);
            if (byToken?.length) submissions = byToken;
        }

        if (!submissions.length) {
            const { data: byProdentis } = await supabase
                .from('patient_intake_submissions')
                .select('id, first_name, last_name, signature_data, medical_survey, created_at, pdf_url, prodentis_patient_id')
                .eq('prodentis_patient_id', prodentisId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (byProdentis?.length) submissions = byProdentis;
        }

        const intake = submissions[0] || null;

        return NextResponse.json({
            intake: intake ? {
                id: intake.id,
                firstName: intake.first_name,
                lastName: intake.last_name,
                hasSignature: !!intake.signature_data,
                signatureData: intake.signature_data,
                pdfUrl: intake.pdf_url || null,
                createdAt: intake.created_at,
            } : null,
        });
    } catch (err: any) {
        console.error('[PatientIntake] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
