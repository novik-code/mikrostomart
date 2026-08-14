import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { PATIENT_DOC_BUCKET, displayUrlFor } from '@/lib/privateStorage';

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
        const payload = await verifyPatientSession(req);
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
            .select('id, consent_type, consent_label, file_url, file_path, file_name, signed_at')
            .eq('prodentis_patient_id', prodentisId)
            .order('signed_at', { ascending: false });

        if (consentErr) {
            console.error('[PatientDocs] Consents query error:', consentErr);
        }

        // ── 2. E-karta submissions ──
        const { data: intakes, error: intakeErr } = await supabase
            .from('patient_intake_submissions')
            .select('id, submitted_at, pdf_url, pdf_path')
            .eq('prodentis_patient_id', prodentisId)
            .order('submitted_at', { ascending: false })
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

        /**
         * 🔴 `fileUrl` MUSI ZOSTAĆ OTWIERALNYM ADRESEM — apka 1.2.0 jest w sklepach
         * i robi wprost `Linking.openURL(doc.fileUrl)` (`panel.tsx:749`). Nie parsuje go
         * i nie zna trasy-pośrednika, więc jedyny sposób, żeby przeżyła zamknięcie
         * bucketa, to podmiana WARTOŚCI tego pola na adres PODPISANY. Dla binarki to
         * ten sam typ danych; dla nas — link, który umiera po 900 s zamiast żyć wiecznie.
         *
         * 🪤 ŚWIADOME ZŁAMANIE REGUŁY „nie podpisuj w liście". Reguła chroni audyt i TTL,
         * ale tu nie ma czego chronić: ta trasa nigdy nie audytowała (pacjent czyta
         * WŁASNE dokumenty), a 900 s dobrano właśnie pod ten przypadek — apka pobiera
         * listę przy wejściu na ekran i przy pociągnięciu w dół, a człowiek dotyka
         * pozycji chwilę później. Dokument otwierany przez pośrednika (`[id]/file`)
         * nadal zostawia ślad; ta lista jest drogą zgodności wstecznej, nie obejściem.
         */
        const [zgodyUrl, ekartyUrl] = await Promise.all([
            Promise.all((consents || []).map(c => displayUrlFor(PATIENT_DOC_BUCKET, c.file_path, c.file_url, { downloadAs: c.file_name || undefined }))),
            Promise.all((intakes || []).map(i => displayUrlFor(PATIENT_DOC_BUCKET, i.pdf_path, i.pdf_url))),
        ]);

        // Add consents
        (consents || []).forEach((c, idx) => {
            documents.push({
                id: c.id,
                type: 'consent',
                label: c.consent_label || c.consent_type || 'Zgoda',
                fileUrl: zgodyUrl[idx] || null,
                fileName: c.file_name || null,
                date: c.signed_at,
            });
        });

        // Add e-karta
        (intakes || []).forEach((i, idx) => {
            documents.push({
                id: i.id,
                type: 'ekarta',
                label: 'E-Karta Pacjenta',
                fileUrl: ekartyUrl[idx] || null,
                fileName: `ekarta_${i.submitted_at?.slice(0, 10)}.pdf`,
                date: i.submitted_at,
            });
        });

        return NextResponse.json({ documents });

    } catch (err: any) {
        console.error('[PatientDocs] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
