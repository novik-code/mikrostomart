import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/patients/documents
 * Returns list of signed consent documents for the authenticated patient.
 * JWT authenticated — uses prodentisId from token.
 * 
 * Also returns e-karta (patient_intake_submissions) if available.
 */
export async function GET(req: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(req);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prodentisId = payload.prodentisId;
        if (!prodentisId) {
            return NextResponse.json({ error: 'Missing patient ID' }, { status: 400 });
        }

        // ── 1. Signed consents ──
        const { data: consents, error: consentErr } = await supabase
            .from('patient_consents')
            .select('id, consent_type, consent_label, file_url, file_name, signed_at')
            .eq('prodentis_patient_id', prodentisId)
            .order('signed_at', { ascending: false });

        if (consentErr) {
            console.error('[PatientDocs] Consents query error:', consentErr);
        }

        // ── 2. E-karta submissions ──
        const { data: intakes, error: intakeErr } = await supabase
            .from('patient_intake_submissions')
            .select('id, created_at, pdf_url')
            .eq('prodentis_id', prodentisId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (intakeErr) {
            console.error('[PatientDocs] Intake query error:', intakeErr);
        }

        // Build unified document list
        const documents: Array<{
            id: string;
            type: 'consent' | 'ekarta';
            label: string;
            fileUrl: string | null;
            fileName: string | null;
            date: string;
        }> = [];

        // Add consents
        for (const c of (consents || [])) {
            documents.push({
                id: c.id,
                type: 'consent',
                label: c.consent_label || c.consent_type || 'Zgoda',
                fileUrl: c.file_url || null,
                fileName: c.file_name || null,
                date: c.signed_at,
            });
        }

        // Add e-karta
        for (const i of (intakes || [])) {
            documents.push({
                id: i.id,
                type: 'ekarta',
                label: 'E-Karta Pacjenta',
                fileUrl: i.pdf_url || null,
                fileName: `ekarta_${i.created_at?.slice(0, 10)}.pdf`,
                date: i.created_at,
            });
        }

        return NextResponse.json({ documents });

    } catch (err: any) {
        console.error('[PatientDocs] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
