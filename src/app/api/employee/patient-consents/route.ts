import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { readPatientConsentPii } from '@/lib/encryptedPiiFields';
import { PATIENT_DOC_BUCKET, displayUrlFor } from '@/lib/privateStorage';

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
            .select('id, consent_type, consent_label, file_url, file_path, file_name, signed_at, prodentis_synced, biometric_data, biometric_data_encrypted, signature_data, signature_data_encrypted, metadata')
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

        /**
          * 🔴 `file_url` MUSI ZOSTAĆ OTWIERALNYM ADRESEM — apka 1.2.0 ze sklepu otwiera
          * go wprost (`PatientActionSheet.tsx:214`, `WebBrowser.openBrowserAsync`).
          * Podmieniamy WARTOŚĆ na adres podpisany: dla binarki bez różnicy, a link
          * przestaje żyć wiecznie. Bez tego zamknięcie bucketa gasi zgody w apce
          * personelu do czasu wydania 1.3.0.
          *
          * 🪤 Podpisujemy w liście świadomie — inaczej niż przy dokumentach otwieranych
          * z panelu. Audyt nic tu nie traci: `view_consents` leci wyżej, przy pobraniu
          * tej właśnie listy (linia ~49), więc ślad „kto oglądał zgody tego pacjenta"
          * powstaje tak czy owak.
          */
        const podpisy = await Promise.all(
            (data || []).map((row: any) =>
                displayUrlFor(PATIENT_DOC_BUCKET, row.file_path, row.file_url, { downloadAs: row.file_name || undefined }),
            ),
        );

        // S8-7: decrypt PII per row — prefers encrypted column, falls back to plaintext.
        const decryptedConsents = (data || []).map((row: any, idx: number) => {
            const pii = readPatientConsentPii(row);
            return {
                ...row,
                file_url: podpisy[idx] ?? row.file_url,
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
