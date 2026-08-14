import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { PATIENT_DOC_BUCKET, displayUrlFor } from '@/lib/privateStorage';

/**
 * GET /api/patients/documents/[id]/file?type=consent|ekarta
 *
 * Trasa-pośrednik do dokumentu pacjenta: sprawdza WŁASNOŚĆ, podpisuje adres
 * i zostawia ślad. Powstaje w etapie A zamykania publicznych bucketów — dziś
 * jest drogą alternatywną, po zamknięciu `consents` stanie się JEDYNĄ.
 *
 * 🔑 DLACZEGO OSOBNA TRASA, A NIE PODPIS W LIŚCIE `/api/patients/documents`:
 *  1. **Audyt.** Podpis wybity przy liście zapisuje „pobrał listę dokumentów"
 *     dla wszystkich pozycji naraz — także tych, których pacjent nie otworzył.
 *     Wpis ma odpowiadać na pytanie „kto i co REALNIE otworzył".
 *  2. **TTL.** Podpis żyje 900 s. Wybity przy liście wypala się, zanim człowiek
 *     zdąży dotknąć pozycji, do której wraca po chwili.
 * (Ten sam układ co `employee/incidents/photo` i załączniki czatu.)
 *
 * 🔑 WŁASNOŚĆ SPRAWDZAMY W BAZIE, nie po kształcie ścieżki. Bez tego trasa byłaby
 * generatorem podpisanych linków do dowolnego dokumentu w buckecie — a tam leżą
 * e-Karty z PESEL-em pod przewidywalnym numerem kartoteki.
 *
 * ⚠️ Apka 1.2.0 ze sklepu tej trasy NIE ZNA — bierze `fileUrl` prosto z listy.
 * Dlatego kontrakt listy zostaje w etapie A NIETKNIĘTY, a ta trasa jest dodatkiem.
 * Przełączenie listy na podpisy to osobna decyzja przy zamykaniu bucketa (etap C).
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const payload = await verifyPatientSession(req);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prodentisId = payload.prodentisId;
    if (!prodentisId) {
        return NextResponse.json({ error: 'Missing patient ID' }, { status: 400 });
    }

    const { id } = await params;
    const typ = new URL(req.url).searchParams.get('type') === 'ekarta' ? 'ekarta' : 'consent';

    // ── Własność: dokument MUSI należeć do pacjenta z tokenu ─────────────────
    // Filtr po `prodentis_patient_id` jest częścią zapytania, a nie sprawdzeniem
    // po fakcie — cudzy identyfikator nie zwróci wiersza i kończy się na 404.
    let path: string | null = null;
    let legacyUrl: string | null = null;
    let nazwaPliku: string | null = null;

    if (typ === 'consent') {
        const { data } = await supabase
            .from('patient_consents')
            .select('id, file_path, file_url, file_name')
            .eq('id', id)
            .eq('prodentis_patient_id', prodentisId)
            .maybeSingle();
        if (!data) return NextResponse.json({ error: 'Nie znaleziono dokumentu' }, { status: 404 });
        path = data.file_path;
        legacyUrl = data.file_url;
        nazwaPliku = data.file_name;
    } else {
        const { data } = await supabase
            .from('patient_intake_submissions')
            .select('id, pdf_path, pdf_url, submitted_at')
            .eq('id', id)
            .eq('prodentis_patient_id', prodentisId)
            .maybeSingle();
        if (!data) return NextResponse.json({ error: 'Nie znaleziono dokumentu' }, { status: 404 });
        path = data.pdf_path;
        legacyUrl = data.pdf_url;
        nazwaPliku = `ekarta_${(data.submitted_at || '').slice(0, 10)}.pdf`;
    }

    const url = await displayUrlFor(PATIENT_DOC_BUCKET, path, legacyUrl, {
        downloadAs: nazwaPliku || undefined,
    });
    if (!url) {
        return NextResponse.json({ error: 'Dokument niedostępny' }, { status: 404 });
    }

    // Audyt — pacjent czytający własny dokument. Rejestr czynności (art. 30 RODO)
    // ma pokazywać także dostęp uprawniony; bez tego nie da się później odpowiedzieć
    // na pytanie, czy dokument w ogóle był kiedykolwiek otwierany.
    void supabase.from('patient_document_access_log').insert({
        prodentis_patient_id: prodentisId,
        document_type: typ,
        document_id: id,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        user_agent: req.headers.get('user-agent') || null,
    }).then(({ error }) => {
        // Audyt nie może blokować dostępu pacjenta do własnego dokumentu, ale cisza
        // przy nieudanym zapisie zostawiłaby dziurę w rejestrze bez żadnego sygnału.
        if (error) console.error('[PatientDocs] audyt nieudany:', error.code, error.message);
    });

    return NextResponse.json({ url, expiresIn: 900 });
}
