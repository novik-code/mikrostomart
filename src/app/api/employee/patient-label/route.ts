import { NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { checkRateLimit } from '@/lib/rateLimit';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/** Nazwisko pacjenta nie może osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * Ten sam wzorzec co CHECK `staff_messages.ref_patient_prodentis_id` w migracji 183.
 * Jeśli kiedykolwiek się rozjadą, chip zapisany w bazie przestanie być rozwiązywalny —
 * zmiana w jednym miejscu wymaga zmiany w drugim. Cyfry, nigdy UUID.
 */
const PRODENTIS_ID_RE = /^[0-9]{6,12}$/;

const MAX_BATCH = 50;
/** Ile równoległych zapytań do Prodentisa na jedno żądanie wsadowe. */
const FETCH_CONCURRENCY = 8;

const LABEL_TTL_MS = 5 * 60_000;
/** Brak pacjenta cache'ujemy krócej — zwykle to literówka w identyfikatorze, nie stan trwały. */
const MISS_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;
const AUDIT_DEDUP_MS = 10 * 60_000;

type PatientLabel = {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
};

/**
 * Cache w pamięci lambdy: apka pyta o etykietę przy każdym renderze listy wiadomości,
 * a jedna wiadomość z chipem to jeden pacjent — bez cache każde przewinięcie ekranu
 * to seria zapytań do Prodentisa (jedyne źródło danych, tunel Cloudflare, ~setki ms).
 * Świadomie NIE trzymamy tego w Supabase ani w Redis: to by znaczyło zapisać nazwisko
 * pacjenta poza Prodentisem, czyli dokładnie to, czego zabrania D3. Pamięć procesu
 * znika razem z lambdą i nie jest kopią zapasową niczyich danych.
 */
const labelCache = new Map<string, { label: PatientLabel | null; expiresAt: number }>();

/** `${userId}|${prodentisId}` → do kiedy nie logujemy ponownie (patrz auditableIds). */
const auditSeen = new Map<string, number>();

function pruneExpired<T>(map: Map<string, T>, max: number, expiryOf: (value: T) => number) {
    const now = Date.now();
    for (const [key, value] of map) {
        if (expiryOf(value) <= now) map.delete(key);
    }
    if (map.size >= max) {
        // Map zachowuje kolejność wstawiania — kasujemy najstarsze.
        const excess = map.size - Math.floor(max / 2);
        let i = 0;
        for (const key of map.keys()) {
            if (i++ >= excess) break;
            map.delete(key);
        }
    }
}

function cacheGet(prodentisId: string): { label: PatientLabel | null } | undefined {
    const hit = labelCache.get(prodentisId);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
        labelCache.delete(prodentisId);
        return undefined;
    }
    return hit;
}

function cacheSet(prodentisId: string, label: PatientLabel | null) {
    if (labelCache.size >= CACHE_MAX_ENTRIES) {
        pruneExpired(labelCache, CACHE_MAX_ENTRIES, (v) => v.expiresAt);
    }
    labelCache.set(prodentisId, {
        label,
        expiresAt: Date.now() + (label ? LABEL_TTL_MS : MISS_TTL_MS),
    });
}

/**
 * Identyfikatory, które ten użytkownik zobaczył po raz pierwszy w ostatnich 10 minutach.
 * Ślad „kto oglądał czyje dane" zostaje (pierwsze wejście zawsze trafia do audytu),
 * ale przewijanie tej samej listy nie zamienia dziennika RODO w log renderowania.
 * Mapa jest per-lambda, więc awaria pamięci daje WIĘCEJ wpisów, nigdy mniej.
 */
function auditableIds(userId: string, ids: string[]): string[] {
    const now = Date.now();
    if (auditSeen.size >= CACHE_MAX_ENTRIES) {
        pruneExpired(auditSeen, CACHE_MAX_ENTRIES, (v) => v);
    }
    const fresh: string[] = [];
    for (const id of ids) {
        const key = `${userId}|${id}`;
        const seenUntil = auditSeen.get(key);
        if (seenUntil && seenUntil > now) continue;
        auditSeen.set(key, now + AUDIT_DEDUP_MS);
        fresh.push(id);
    }
    return fresh;
}

/**
 * Prodentis nie ma endpointu „sama etykieta" — pobieramy `/api/patient/:id/details`
 * (ta sama trasa co /api/employee/patient-details) i zostawiamy WYŁĄCZNIE imię
 * i nazwisko. PESEL, adres, telefon, notatki i ostrzeżenia nie opuszczają serwera.
 * `prodentisFetch` celowo bez własnego `signal`: on ustawia świeży timeout dla tunelu
 * i dla zapasowego IP, a jeden współdzielony sygnał po przekroczeniu czasu tunelu
 * ubiłby też próbę zapasową.
 */
async function fetchLabel(prodentisId: string): Promise<PatientLabel | null> {
    const res = await prodentisFetch(`/api/patient/${encodeURIComponent(prodentisId)}/details`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Prodentis ${res.status}`);

    const data = (await res.json()) as Record<string, unknown>;
    const firstName = typeof data?.firstName === 'string' ? data.firstName.trim() : '';
    const lastName = typeof data?.lastName === 'string' ? data.lastName.trim() : '';
    if (!firstName && !lastName) return null;

    return { id: prodentisId, firstName, lastName, fullName: `${firstName} ${lastName}`.trim() };
}

type Resolved = { found: PatientLabel[]; missing: string[]; failed: string[]; cacheHits: number };

async function resolveLabels(ids: string[]): Promise<Resolved> {
    const out: Resolved = { found: [], missing: [], failed: [], cacheHits: 0 };
    const toFetch: string[] = [];

    for (const id of ids) {
        const hit = cacheGet(id);
        if (hit) {
            out.cacheHits++;
            if (hit.label) out.found.push(hit.label);
            else out.missing.push(id);
        } else {
            toFetch.push(id);
        }
    }

    for (let i = 0; i < toFetch.length; i += FETCH_CONCURRENCY) {
        const chunk = toFetch.slice(i, i + FETCH_CONCURRENCY);
        const results = await Promise.all(
            chunk.map(async (id) => {
                try {
                    const label = await fetchLabel(id);
                    cacheSet(id, label);
                    return { id, label, failed: false };
                } catch (err) {
                    // Awaria łącza to NIE „nie ma takiego pacjenta" — nie cache'ujemy
                    // i oddajemy osobno, żeby apka nie pokazała chipa jako usuniętego.
                    console.error(`[PatientLabel] Prodentis fetch failed for ${id}:`, err);
                    return { id, label: null, failed: true };
                }
            })
        );
        for (const r of results) {
            if (r.failed) out.failed.push(r.id);
            else if (r.label) out.found.push(r.label);
            else out.missing.push(r.id);
        }
    }

    return out;
}

/**
 * GET /api/employee/patient-label
 * Auth: employee lub admin (Bearer OK — strefa personelu w apce).
 *
 * Podmiana identyfikatora Prodentisa na etykietę chipa „#pacjent" w czacie zespołowym
 * (D3, migracja 183). W bazie wiadomości leży WYŁĄCZNIE `ref_patient_prodentis_id`;
 * imię i nazwisko dostawia ta trasa przy wyświetlaniu i nigdzie ich nie zapisuje.
 *
 * Warianty:
 *   ?prodentisId=123456            → 200 { patient }, 404 gdy nie ma, 502 gdy Prodentis nie odpowiada
 *   ?prodentisIds=123456,234567    → 200 { patients, missing, failed } (max 50)
 *
 * Wsad jest ważniejszy niż wygoda: lista wiadomości ma zwykle kilka chipów, więc apka
 * powinna zebrać identyfikatory z ekranu i zapytać RAZ, zamiast raz na wiadomość.
 */
export async function GET(request: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const singleParam = searchParams.get('prodentisId')?.trim() || '';
    const batchParam = searchParams.get('prodentisIds')?.trim() || '';

    if (!singleParam && !batchParam) {
        return NextResponse.json(
            { error: 'Podaj prodentisId lub prodentisIds' },
            { status: 400, headers: NO_STORE }
        );
    }

    const rawIds = singleParam
        ? [singleParam]
        : Array.from(new Set(batchParam.split(',').map((s) => s.trim()).filter(Boolean)));

    if (rawIds.length === 0) {
        return NextResponse.json({ error: 'Pusta lista identyfikatorów' }, { status: 400, headers: NO_STORE });
    }
    if (rawIds.length > MAX_BATCH) {
        return NextResponse.json(
            { error: `Maksymalnie ${MAX_BATCH} identyfikatorów na zapytanie` },
            { status: 400, headers: NO_STORE }
        );
    }
    if (!rawIds.every((id) => PRODENTIS_ID_RE.test(id))) {
        return NextResponse.json(
            { error: 'Nieprawidłowy identyfikator pacjenta' },
            { status: 400, headers: NO_STORE }
        );
    }

    // Limit per użytkownik, nie per IP — cała klinika wychodzi jednym adresem, więc
    // limit na IP karałby zespół za jedną zapętloną apkę. Liczbę pacjentów na żądanie
    // ogranicza MAX_BATCH, więc jeden licznik żądań wystarcza.
    const rl = await checkRateLimit(`patient-label:${auth.user.id}`, 120, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele zapytań — spróbuj za chwilę' },
            { status: 429, headers: NO_STORE }
        );
    }

    try {
        const resolved = await resolveLabels(rawIds);

        // Audyt RODO: sam fakt zobaczenia, o kogo chodzi. Świadomie BEZ nazwisk —
        // ta trasa istnieje po to, żeby nazwisko nie osiadało poza Prodentisem,
        // więc kopiowanie go do dziennika audytu przeczyłoby jej celowi.
        const fresh = auditableIds(auth.user.id, rawIds);
        if (fresh.length > 0) {
            await logAudit({
                userId: auth.user.id,
                userEmail: auth.user.email || '',
                action: 'view_patient_label',
                resourceType: 'patient',
                resourceId: singleParam || undefined,
                metadata: {
                    prodentisIds: fresh,
                    requested: rawIds.length,
                    cacheHits: resolved.cacheHits,
                    missing: resolved.missing.length,
                    failed: resolved.failed.length,
                    source: 'staff_messaging',
                },
                request,
            });
        }

        if (singleParam) {
            if (resolved.failed.length > 0) {
                return NextResponse.json(
                    { error: 'Brak połączenia z Prodentis' },
                    { status: 502, headers: NO_STORE }
                );
            }
            const patient = resolved.found[0];
            if (!patient) {
                // Bez szczegółów: „nie ma" i „nie mam prawa pokazać" wyglądają tak samo.
                return NextResponse.json(
                    { error: 'Nie znaleziono pacjenta' },
                    { status: 404, headers: NO_STORE }
                );
            }
            return NextResponse.json({ patient }, { headers: NO_STORE });
        }

        if (resolved.found.length === 0 && resolved.failed.length === rawIds.length) {
            return NextResponse.json(
                { error: 'Brak połączenia z Prodentis' },
                { status: 502, headers: NO_STORE }
            );
        }

        return NextResponse.json(
            { patients: resolved.found, missing: resolved.missing, failed: resolved.failed },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[PatientLabel] Error:', err);
        return NextResponse.json(
            { error: 'Nie udało się pobrać danych pacjenta' },
            { status: 500, headers: NO_STORE }
        );
    }
}
