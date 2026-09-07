import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { readPatientConsentPii } from '@/lib/encryptedPiiFields';
import { streszczenieBiometrii } from '@/lib/biometriaPodpisu';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/patient-consents
 * Returns all signed consents with biometric data for admin viewer.
 * Auth: admin required.
 */
export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    const id = req.nextUrl.searchParams.get('id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    try {
        if (id) {
            // Single consent with full details
            const { data, error } = await supabase
                .from('patient_consents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // S8-7: decrypt PII (signature_data, biometric_data) before returning to admin viewer.
            const pii = readPatientConsentPii(data);

            /**
             * 🔴 ŚLAD JEST OBOWIĄZKOWY WŁAŚNIE TUTAJ. Po P-071 (trasa personelu oddaje już
             * tylko streszczenie) to jest JEDYNE miejsce w systemie zwracające PEŁNĄ
             * trajektorię podpisu — pozycję, nacisk i czas każdego punktu, czyli dane
             * szczególnej kategorii z art. 9 RODO. Do 07.09 nie zostawiało żadnego wpisu,
             * więc na pytanie „kto oglądał czyją biometrię" system nie umiał odpowiedzieć.
             * Siostrzana trasa personelu loguje `view_consents` od dawna.
             */
            void logAudit({
                userId: user.id, userEmail: user.email || '',
                action: 'view_biometric', resourceType: 'biometric',
                resourceId: id, patientName: data?.patient_name || undefined,
                request: req,
            });

            return NextResponse.json({
                ...data,
                signature_data: pii.signature_data,
                biometric_data: pii.biometric_data,
                signature_data_encrypted: undefined,
                biometric_data_encrypted: undefined,
            });
        }

        // List consents (without heavy biometric data)
        const { data, error, count } = await supabase
            .from('patient_consents')
            .select('id, patient_name, prodentis_patient_id, consent_type, consent_label, file_url, file_name, signed_at, prodentis_synced, created_by, biometric_data, biometric_data_encrypted', { count: 'exact' })
            .order('signed_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        /**
         * Lista niesie nazwiska pacjentów i identyfikatory kartotek — też zostawia ślad,
         * ale z licznikiem zamiast pojedynczego zasobu (wzorzec z trasy personelu).
         */
        void logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_consents', resourceType: 'consent',
            metadata: { count: data?.length || 0, offset, limit },
            request: req,
        });

        // For list view, decrypt biometric to compute summary, then drop full payload.
        const simplified = (data || []).map((c: any) => {
            const pii = readPatientConsentPii(c);
            const bio: any = pii.biometric_data;
            return {
                ...c,
                // Kształt przeniesiony do `lib/biometriaPodpisu.ts` (P-071/P-095) —
                // ta sama definicja obsługuje teraz także trasę personelu, więc panel
                // pracownika i widok admina nie mogą się rozjechać.
                biometric_data: streszczenieBiometrii(bio),
                biometric_data_encrypted: undefined,
            };
        });

        return NextResponse.json({ consents: simplified, total: count });
    } catch (err: any) {
        console.error('[AdminConsents] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
