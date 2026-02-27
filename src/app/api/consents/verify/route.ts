import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CONSENT_TYPES } from '@/lib/consentTypes';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * POST /api/consents/verify
 * Verifies consent token and returns consent list + patient details from Prodentis.
 * Body: { token }
 */
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const { data: tokenRow, error } = await supabase
            .from('consent_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !tokenRow) {
            return NextResponse.json({ error: 'Token nieważny' }, { status: 404 });
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token wygasł' }, { status: 410 });
        }

        // Get already signed consents for this token
        const { data: signed } = await supabase
            .from('patient_consents')
            .select('consent_type')
            .eq('prodentis_patient_id', tokenRow.prodentis_patient_id || '')
            .eq('patient_name', tokenRow.patient_name);

        const signedTypes = new Set((signed || []).map((s: any) => s.consent_type));

        // Build consent list
        const consents = tokenRow.consent_types
            .filter((ct: string) => CONSENT_TYPES[ct])
            .map((ct: string) => ({
                type: ct,
                label: CONSENT_TYPES[ct].label,
                file: `/zgody/${CONSENT_TYPES[ct].file}`,
                signed: signedTypes.has(ct),
            }));

        // Fetch patient details from Prodentis for PDF pre-fill
        let patientDetails: any = null;
        if (tokenRow.prodentis_patient_id) {
            try {
                const detailsRes = await fetch(
                    `${PRODENTIS_API}/api/patient/${tokenRow.prodentis_patient_id}/details`
                );
                if (detailsRes.ok) {
                    const details = await detailsRes.json();
                    patientDetails = {
                        firstName: details.firstName || '',
                        lastName: details.lastName || '',
                        pesel: details.pesel || '',
                        birthDate: details.birthDate || '',
                        phone: details.phone || '',
                        address: details.address || null,
                    };
                }
            } catch (e) {
                console.error('[ConsentVerify] Prodentis details fetch error:', e);
            }
        }

        return NextResponse.json({
            patientName: tokenRow.patient_name,
            prodentisPatientId: tokenRow.prodentis_patient_id,
            patientDetails,
            consents,
        });
    } catch (err: any) {
        console.error('[ConsentVerify] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
