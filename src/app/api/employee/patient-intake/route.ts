import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { readIntakeSubmissionPii } from '@/lib/encryptedPiiFields';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/patient-intake?prodentisId=X
 * Returns e-karta submission data including signature.
 * Auth: employee or admin role required.
 */
export async function GET(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
                .select('id, first_name, last_name, signature_data, signature_data_encrypted, medical_survey, medical_survey_encrypted, submitted_at, pdf_url, prodentis_patient_id')
                .in('token_id', tokenIds)
                .order('submitted_at', { ascending: false })
                .limit(1);
            if (byToken?.length) submissions = byToken;
        }

        if (!submissions.length) {
            const { data: byProdentis } = await supabase
                .from('patient_intake_submissions')
                .select('id, first_name, last_name, signature_data, signature_data_encrypted, medical_survey, medical_survey_encrypted, submitted_at, pdf_url, prodentis_patient_id')
                .eq('prodentis_patient_id', prodentisId)
                .order('submitted_at', { ascending: false })
                .limit(1);
            if (byProdentis?.length) submissions = byProdentis;
        }

        const intake = submissions[0] || null;

        // GDPR audit log
        logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_intake', resourceType: 'intake',
            resourceId: prodentisId || undefined,
            patientName: intake ? `${intake.first_name} ${intake.last_name}` : undefined,
            request: req,
        });

        // S8-7: decrypt PII (signature_data, medical_survey) — prefers encrypted column, fallback to plaintext.
        const piiDecrypted = intake ? readIntakeSubmissionPii(intake) : null;

        return NextResponse.json({
            intake: intake ? {
                id: intake.id,
                firstName: intake.first_name,
                lastName: intake.last_name,
                hasSignature: !!piiDecrypted?.signature_data,
                signatureData: piiDecrypted?.signature_data ?? null,
                pdfUrl: intake.pdf_url || null,
                createdAt: intake.submitted_at,
            } : null,
        });
    } catch (err: any) {
        console.error('[PatientIntake] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
