import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { PATIENT_DOC_BUCKET, TASK_IMAGE_BUCKET, displayUrlFor } from '@/lib/privateStorage';

/**
 * GET /api/employee/documents/file?type=consent|ekarta|task-image&id=…  (dla `task-image`: &path=…)
 *
 * Trasa-pośrednik personelu do plików leżących dziś w PUBLICZNYCH bucketach
 * (`consents`, `task-images`). Druga i trzecia z trzech tras kroku 4 planu —
 * pierwsza (`/api/patients/documents/[id]/file`) obsługuje pacjenta.
 *
 * 🔑 CZEMU JEDNA TRASA NA TRZY RODZAJE. Wzorzec jest identyczny: sprawdź, że obiekt
 * NAPRAWDĘ należy do czegoś w bazie → podpisz → zapisz ślad. Trzy osobne pliki
 * znaczyłyby trzy miejsca do poprawienia przy każdej korekcie, a przy takiej
 * powtarzalności to właśnie jest droga do „naprawiliśmy dwa z trzech".
 *
 * 🔑 ISTNIENIE W BAZIE ZAMIAST KSZTAŁTU ŚCIEŻKI. Personel ma prawo widzieć dokumenty
 * pacjentów (to jego praca), ale NIE ma prawa dostać podpisu do dowolnego obiektu
 * w buckecie na podstawie stringa z adresu. Dlatego `task-image` weryfikuje ścieżkę
 * w `employee_tasks` — dokładnie jak `photoBelongsToIncident` w awariach.
 *
 * 🔑 AUDYT JEST SENSEM TEJ TRASY. Publiczny bucket nie zostawiał ŻADNEGO śladu pobrania
 * e-Karty z PESEL-em. `view_consents` istniało w słowniku akcji od migracji 066 i nikt
 * go nigdy nie emitował dla pliku.
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const typ = sp.get('type');
    const id = sp.get('id');

    // ── Zdjęcie zadania ──────────────────────────────────────────────────────
    if (typ === 'task-image') {
        const path = sp.get('path');
        if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

        /**
         * 🔴 KSZTAŁT ŚCIEŻKI WALIDUJEMY, ZANIM DOTKNIE ZAPYTANIA.
         *
         * Pierwsza wersja tego bloku sklejała filtr PostgREST stringiem
         * (`.or('image_paths.cs.{"' + path + '"}')`) — a `path` przychodzi z adresu.
         * Przecinek albo cudzysłów w parametrze rozbijał wtedy wyrażenie filtra
         * i pozwalał dopisać własny warunek. To wstrzyknięcie, nie kosmetyka.
         *
         * Teraz: najpierw twardy wzorzec (klucze zdjęć zadań mają postać
         * `tasks/<nazwa>` — patrz `tasks/upload-image`), potem zapytania budowane
         * przez klienta, bez sklejania.
         */
        if (!/^tasks\/[A-Za-z0-9._-]{1,120}$/.test(path)) {
            return NextResponse.json({ error: 'Nieprawidłowa ścieżka' }, { status: 400 });
        }

        // Ścieżka MUSI należeć do jakiegoś zadania. Sprawdzamy w bazie, nie po wyglądzie.
        const poj = await supabase
            .from('employee_tasks').select('id').eq('image_path', path).limit(1);
        const tab = poj.data?.length
            ? poj
            : await supabase.from('employee_tasks').select('id').contains('image_paths', [path]).limit(1);
        const zadania = tab.data;

        if (!zadania || zadania.length === 0) {
            return NextResponse.json({ error: 'Nie znaleziono zdjęcia' }, { status: 404 });
        }

        const url = await displayUrlFor(TASK_IMAGE_BUCKET, path, null);
        if (!url) return NextResponse.json({ error: 'Nie udało się podpisać linku' }, { status: 500 });

        /**
         * Tryb `redirect=1` obsługuje MINIATURY: `<img src>` potrzebuje bajtów, a nie
         * JSON-a z adresem. Świadomie BEZ wpisu do audytu — lista dwudziestu zadań
         * zrobiłaby dwadzieścia wpisów przy każdym wejściu na ekran i rejestr przestałby
         * cokolwiek znaczyć. Ślad zostaje przy JAWNYM otwarciu (tryb JSON, niżej), czyli
         * wtedy, gdy człowiek naprawdę patrzy na zdjęcie w pełnym rozmiarze.
         *
         * ⚠️ Tryb przekierowania działa TYLKO dla zdjęć zadań. Dokumenty pacjenta
         * (zgoda, e-Karta) idą wyłącznie torem JSON i są audytowane ZAWSZE — tam wpis
         * jest sensem istnienia tej trasy, nie dodatkiem.
         */
        if (sp.get('redirect') === '1') {
            return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
        }

        void logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_task_image', resourceType: 'task',
            resourceId: zadania[0].id, request: req,
        });

        return NextResponse.json({ url, expiresIn: 900 });
    }

    // ── Dokument pacjenta: zgoda albo e-Karta ────────────────────────────────
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    let path: string | null = null;
    let legacyUrl: string | null = null;
    let nazwaPliku: string | null = null;
    let pacjent: string | null = null;

    if (typ === 'consent') {
        const { data } = await supabase
            .from('patient_consents')
            .select('id, file_path, file_url, file_name, prodentis_patient_id')
            .eq('id', id)
            .maybeSingle();
        if (!data) return NextResponse.json({ error: 'Nie znaleziono dokumentu' }, { status: 404 });
        path = data.file_path; legacyUrl = data.file_url;
        nazwaPliku = data.file_name; pacjent = data.prodentis_patient_id;
    } else if (typ === 'ekarta') {
        const { data } = await supabase
            .from('patient_intake_submissions')
            .select('id, pdf_path, pdf_url, submitted_at, prodentis_patient_id')
            .eq('id', id)
            .maybeSingle();
        if (!data) return NextResponse.json({ error: 'Nie znaleziono dokumentu' }, { status: 404 });
        path = data.pdf_path; legacyUrl = data.pdf_url;
        nazwaPliku = `ekarta_${(data.submitted_at || '').slice(0, 10)}.pdf`;
        pacjent = data.prodentis_patient_id;
    } else {
        return NextResponse.json({ error: 'Nieznany typ dokumentu' }, { status: 400 });
    }

    const url = await displayUrlFor(PATIENT_DOC_BUCKET, path, legacyUrl, {
        downloadAs: nazwaPliku || undefined,
    });
    if (!url) return NextResponse.json({ error: 'Dokument niedostępny' }, { status: 404 });

    // 🔑 Ślad powstaje TU, przy otwarciu konkretnego dokumentu — nie w liście.
    // Lista podpisująca wszystko naraz zapisywałaby „przejrzał 30 dokumentów"
    // za każdym wejściem na kartę pacjenta i rejestr przestałby cokolwiek znaczyć.
    void logAudit({
        userId: user.id, userEmail: user.email || '',
        action: typ === 'consent' ? 'view_consent_file' : 'view_intake_file',
        resourceType: typ === 'consent' ? 'consent' : 'intake',
        resourceId: id,
        metadata: { prodentis_patient_id: pacjent },
        request: req,
    });

    return NextResponse.json({ url, expiresIn: 900 });
}
