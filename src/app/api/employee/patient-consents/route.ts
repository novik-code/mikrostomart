import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { readPatientConsentPii } from '@/lib/encryptedPiiFields';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employee/patient-consents?prodentisId=X
 * Returns list of signed consents for a patient.
 * Auth: employee or admin role required.
 */
export async function GET(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const prodentisId = req.nextUrl.searchParams.get('prodentisId');
    const patientName = req.nextUrl.searchParams.get('patientName');

    if (!prodentisId && !patientName) {
        return NextResponse.json({ error: 'prodentisId or patientName required' }, { status: 400 });
    }

    try {
        let query = supabase
            .from('patient_consents')
            .select('id, consent_type, consent_label, file_url, file_name, signed_at, prodentis_synced, biometric_data, biometric_data_encrypted, signature_data, signature_data_encrypted, metadata')
            .order('signed_at', { ascending: false });

        if (prodentisId) {
            query = query.eq('prodentis_patient_id', prodentisId);
        } else if (patientName) {
            query = query.eq('patient_name', patientName);
        }

        const { data, error } = await query;

        if (error) throw error;

        // GDPR audit log
        logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_consents', resourceType: 'consent',
            resourceId: prodentisId || patientName || undefined,
            patientName: patientName || undefined,
            metadata: { count: data?.length || 0 },
            request: req,
        });

        // S8-7: decrypt PII per row — prefers encrypted column, falls back to plaintext.
        const decryptedConsents = (data || []).map((row: any) => {
            const pii = readPatientConsentPii(row);
            return {
                ...row,
                signature_data: pii.signature_data,
                biometric_data: pii.biometric_data,
                // strip encrypted columns from response (caller doesn't need them)
                signature_data_encrypted: undefined,
                biometric_data_encrypted: undefined,
            };
        });

        return NextResponse.json({ consents: decryptedConsents });
    } catch (err: any) {
        console.error('[PatientConsents] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
