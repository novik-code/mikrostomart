import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

const REPORT_BUCKET = 'careflow-reports';

/** Link ma żyć tyle, ile trwa kliknięcie „Pobierz PDF" — nie dłużej. */
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Z zapisanego `report_pdf_url` wyciąga ścieżkę obiektu w buckecie.
 * Generatory raportów zapisują albo pełny signed URL
 * (`.../storage/v1/object/sign/careflow-reports/careflow-reports/plik.pdf?token=...`),
 * albo — gdy podpisanie się nie powiodło — samą ścieżkę `careflow-reports/plik.pdf`.
 */
function extractStoragePath(reportPdfUrl: string): string | null {
    const raw = reportPdfUrl.trim();
    if (!raw) return null;

    if (!/^https?:\/\//i.test(raw)) {
        return raw.replace(/^\/+/, '');
    }

    let pathname: string;
    try {
        pathname = new URL(raw).pathname;
    } catch {
        return null;
    }

    const marker = `/${REPORT_BUCKET}/`;
    const idx = pathname.indexOf(marker);
    if (idx === -1) return null;

    const objectPath = decodeURIComponent(pathname.slice(idx + marker.length));
    return objectPath || null;
}

/**
 * GET /api/employee/careflow/enrollments/[id]/report-link
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * Raport zgodności to pełna dokumentacja medyczna, a zapisany w bazie signed URL
 * jest ważny rok — dlatego nie opuszcza serwera. Tutaj podpisujemy plik na nowo,
 * na 5 minut, i odnotowujemy pobranie w audycie.
 *
 * Zwraca: { url } albo 404 { error: 'no_report' }, gdy raportu jeszcze nie ma.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { id } = await params;

        const { data: enrollment, error } = await supabase
            .from('care_enrollments')
            .select('id, report_pdf_url, patient_name, patient_id')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('[CareFlow] Report link query failed:', error);
            return NextResponse.json({ error: 'Nie udało się pobrać linku do raportu' }, { status: 500, headers: NO_STORE });
        }
        if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        if (!enrollment.report_pdf_url) {
            return NextResponse.json({ error: 'no_report' }, { status: 404, headers: NO_STORE });
        }

        const objectPath = extractStoragePath(enrollment.report_pdf_url);
        if (!objectPath) {
            console.error('[CareFlow] Report link — nieczytelna ścieżka raportu dla', id);
            return NextResponse.json({ error: 'no_report' }, { status: 404, headers: NO_STORE });
        }

        // `download` wymusza Content-Disposition: attachment — przeglądarka pobiera plik
        // zamiast nawigować panel personelu do podglądu PDF.
        const fileName = objectPath.split('/').pop() || 'careflow-raport.pdf';
        const { data: signed, error: signErr } = await supabase.storage
            .from(REPORT_BUCKET)
            .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS, { download: fileName });

        if (signErr || !signed?.signedUrl) {
            console.error('[CareFlow] Report link signing failed:', signErr);
            return NextResponse.json({ error: 'Nie udało się pobrać linku do raportu' }, { status: 500, headers: NO_STORE });
        }

        await logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'download_careflow_report',
            resourceType: 'careflow',
            resourceId: id,
            patientName: enrollment.patient_name || undefined,
            metadata: { patient_id: enrollment.patient_id, ttl_seconds: SIGNED_URL_TTL_SECONDS },
            request: req,
        });

        return NextResponse.json({ url: signed.signedUrl }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] Report link error:', err);
        return NextResponse.json({ error: 'Nie udało się pobrać linku do raportu' }, { status: 500, headers: NO_STORE });
    }
}
