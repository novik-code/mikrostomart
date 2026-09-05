/**
 * STRAŻNIK WŁASNOŚCI WIZYTY (P-001) — najcięższa pozycja audytu 2026-09-05.
 *
 * 🔴 CO BYŁO ZEPSUTE. Żadna z dziewięciu tras w `src/app/api/patients/appointments`
 * nie porównała ani razu `wizyta.patientId` z `payload.prodentisId` (`grep patientId`
 * po całym katalogu → ZERO trafień). Własność sprawdzano wyłącznie wobec NASZEGO wiersza
 * w `appointment_actions` — a ten wiersz powstawał z identyfikatora, który przysłał klient.
 * Zalogowany pacjent, który znał albo zgadł numer cudzej wizyty (są sekwencyjne), mógł ją
 * skreślić, przełożyć albo oznaczyć jako potwierdzoną. Klucz do PMS jest gabinetowy, więc
 * Prodentis takiego żądania nie odrzuca.
 *
 * 🔑 Ten plik WYKONUJE cztery prawdziwe handlery na `NextRequest`, a nie sprawdza obecności
 * słów w kodzie. Powód jest w historii projektu: strażnik szukający wzorca tekstowego
 * przepuścił w tym repo cztery regresje z rzędu, a `staff-guards` przez trzy tygodnie
 * świecił na czerwono na jedynym pliku, którego chronić nie trzeba.
 *
 * 🔑 POMIAR PRODUKCYJNY (05.09), na którym stoi porównanie:
 *   · `GET /api/schedule/appointment/:id` oddaje `patientId` jako string 10 cyfr
 *     z zerami wiodącymi (`"0100001110"`); cztery różne wizyty → cztery różne id;
 *   · `patients.prodentis_id`: 149 z 149 kont ma ten sam kształt;
 *   · `future-appointments?days=365` PMS przyjmuje (HTTP 200).
 *
 * Uruchomienie: `npx vitest run appointmentOwnership`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Tożsamości ──────────────────────────────────────────────────────────────
const JA = '0100001110';
const OBCY = '0100005778';
const MOJA_WIZYTA = '0100234418';
const CUDZA_WIZYTA = '0100213775';
const WIERSZ = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const PACJENT_UUID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

/** Kształt 1:1 z pomiaru produkcyjnego — pola techniczne, bez danych osobowych. */
const wizytaPMS = (id: string, patientId: string) => ({
    id,
    patientId,
    doctorId: '0100000001',
    doctorName: 'Lekarz Testowy',
    date: '2026-09-11',
    startTime: '16:30',
    endTime: '17:00',
    duration: 30,
    status: 'scheduled',
    cancelDate: null,
});

const pozycjaListy = (id: string, patientId: string) => ({
    id,
    date: '2026-09-11T14:30:00.000Z',
    patientId,
    duration: 30,
    doctor: { id: '0100000001', name: 'Lekarz Testowy' },
});

// ── Mocki ───────────────────────────────────────────────────────────────────
let zapisyDoPMS: { path: string; method: string }[] = [];
let wierszeWstawione: Record<string, unknown>[] = [];
let wierszeZmienione: Record<string, unknown>[] = [];
/** Do kogo NAPRAWDĘ należy wizyta, którą PMS odda przy odświeżeniu. */
let wlascicielWizytyWPMS = JA;
/**
 * 🔴 TRZY OSOBNE PRZEŁĄCZNIKI, nie jeden „PMS działa".
 * Sceptyk audytu obalił pierwszą wersję tego strażnika WYKONANIEM: jeden przełącznik
 * wywalał WSZYSTKIE wywołania naraz, więc test nie potrafił odtworzyć awarii CZĄSTKOWEJ —
 * a to właśnie ona otwierała dziurę (odczyt wizyty pada → `unavailable` → bramka pomijana,
 * a `DELETE` dalej żywy i kasuje cudzą wizytę).
 */
let pmsOdczytWizyty = true;
let pmsLista = true;
/** Czy PMS oddaje pole `patientId` (gałąź fail-open w `wizytaNalezyDoPacjenta`). */
let pmsOddajePatientId = true;

vi.mock('@/lib/jwt', () => ({
    verifyPatientSession: async () => ({ prodentisId: JA }),
}));

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (path: string, opts?: { method?: string }) => {
        const method = opts?.method || 'GET';

        if (/\/future-appointments/.test(path)) {
            if (!pmsLista) throw new Error('PMS: lista niedostępna');
            // 🔑 Adres budowany jest z `prodentisId` z TOKENU, więc lista z definicji zawiera
            // wyłącznie wizyty wołającego. Trzy pozycje, żeby dopasowanie musiało być RÓWNOŚCIĄ,
            // a nie `includes` — sceptyk pokazał, że przy jednej pozycji mutant `includes` żyje.
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    appointments: [
                        pozycjaListy(MOJA_WIZYTA, JA),
                        pozycjaListy('0100234400', JA),
                        pozycjaListy('0100234418999', JA),
                    ],
                }),
            };
        }
        const m = path.match(/\/api\/schedule\/appointment\/([0-9]+)$/);
        if (m && method === 'GET') {
            if (!pmsOdczytWizyty) throw new Error('PMS: odczyt wizyty niedostępny');
            const w: Record<string, unknown> = wizytaPMS(m[1], wlascicielWizytyWPMS);
            if (!pmsOddajePatientId) delete w.patientId;
            return { ok: true, status: 200, json: async () => w };
        }
        // Wszystko poniżej to ZAPIS do PMS — dokładnie to, czego strażnik pilnuje.
        zapisyDoPMS.push({ path, method });
        return { ok: true, status: 200, json: async () => ({ success: true }), text: async () => '' };
    },
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));

/** Wiersz `appointment_actions`, jaki „mamy u siebie" w danym przypadku. */
let wierszAkcji: Record<string, unknown> | null = null;

function zapytanie(table: string): any {
    const q: any = {};
    /**
     * 🔴 `.eq()` MUSI FILTROWAĆ. Pierwsza wersja tej atrapy zwracała wiersz niezależnie od
     * warunków, więc strażnik NIE WIDZIAŁ pierwszego piętra własności — tego, że trasy
     * zawężają `appointment_actions` przez `.eq('patient_id', patient.id)`. Mutant kasujący
     * to zawężenie przechodził na zielono. Zmierzone przez sceptyka audytu.
     */
    const filtry: [string, unknown][] = [];
    for (const m of ['select', 'gte', 'lt', 'lte', 'gt', 'in', 'order', 'limit', 'neq', 'is']) {
        q[m] = () => q;
    }
    q.eq = (kolumna: string, wartosc: unknown) => {
        filtry.push([kolumna, wartosc]);
        return q;
    };
    const pasuje = (wiersz: Record<string, unknown> | null) =>
        !!wiersz && filtry.every(([k, v]) => wiersz[k] === undefined || String(wiersz[k]) === String(v));

    q.single = async () =>
        table === 'patients'
            ? { data: { id: PACJENT_UUID, prodentis_id: JA, phone: '+48000000000' }, error: null }
            : pasuje(wierszAkcji)
              ? { data: wierszAkcji, error: null }
              : { data: null, error: { message: 'brak' } };
    q.maybeSingle = async () => ({
        data: table === 'appointment_actions' && pasuje(wierszAkcji) ? wierszAkcji : null,
        error: null,
    });
    q.insert = (payload: unknown) => {
        wierszeWstawione.push(payload as Record<string, unknown>);
        const r: any = { select: () => r, single: async () => ({ data: { id: WIERSZ, status: 'unpaid_reservation' }, error: null }) };
        r.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return r;
    };
    q.update = (payload: unknown) => {
        wierszeZmienione.push(payload as Record<string, unknown>);
        return q;
    };
    q.delete = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => zapytanie(t) }),
}));

// Boczne skutki, które nie mają znaczenia dla własności — uciszone, żeby nie hałasowały.
vi.mock('@/lib/careflowLifecycle', () => ({
    // 🪤 Kształt MUSI się zgadzać: trasy czytają `.ambiguousEnrollmentIds` bez opcjonalności,
    // więc atrapa zwracająca `undefined` wywala je na 500. Złapane przez kontrolę pozytywną.
    cancelCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    rescheduleCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    findOpenEnrollments: async () => [],
}));
vi.mock('@/lib/telegram', () => ({ sendTelegramMessage: async () => {}, notifyTelegram: async () => {} }));
vi.mock('@/lib/pushService', () => ({ broadcastPush: async () => {}, pushToUser: async () => {} }));
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => ({ data: null, error: null }) }; } }));

const req = (body: unknown) =>
    new NextRequest('https://example.test/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
        body: JSON.stringify(body),
    });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
    vi.clearAllMocks();
    zapisyDoPMS = [];
    wierszeWstawione = [];
    wierszeZmienione = [];
    wlascicielWizytyWPMS = JA;
    pmsOdczytWizyty = true;
    pmsLista = true;
    pmsOddajePatientId = true;
    wierszAkcji = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    // 🪤 Bez klucza `prodentisFetch` rzuca `BrakKluczaPMS` ZANIM dojdzie do atrapy, więc
    // asercja „zero zapisów do PMS" przechodziła z niewłaściwego powodu — była PUSTA.
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
});

// ── PIĘTRO A: create nie ufa identyfikatorowi z ciała żądania ────────────────

describe('P-001 · piętro A — create weryfikuje wizytę wobec listy PACJENTA', () => {
    it('🔴 SEDNO: cudzy identyfikator wizyty → 404 i ANI JEDEN wiersz nie powstaje', async () => {
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(req({ schedule_appointment_id: CUDZA_WIZYTA, appointment_date: '2026-09-11T14:30:00.000Z' }));

        expect(res.status).toBe(404);
        expect(wierszeWstawione).toHaveLength(0);
    });

    it('własny identyfikator → 200, a termin i lekarz pochodzą z PMS, nie z ciała żądania', async () => {
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(
            req({
                schedule_appointment_id: MOJA_WIZYTA,
                // Klient podaje bzdury — nie mają prawa dojść do bazy.
                appointment_date: '2030-01-01T00:00:00.000Z',
                doctor_id: 'PODSTAWIONY',
                doctor_name: 'Podstawiony Lekarz',
            }),
        );

        expect(res.status).toBe(200);
        expect(wierszeWstawione).toHaveLength(1);
        const w = wierszeWstawione[0];
        expect(w.prodentis_id).toBe(MOJA_WIZYTA);
        expect(w.appointment_date).toBe('2026-09-11T14:30:00.000Z');
        expect(w.doctor_id).toBe('0100000001');
        expect(w.doctor_name).toBe('Lekarz Testowy');
    });

    it('🪤 data z PMS idzie DOSŁOWNIE — nie składamy jej z części (offset strefy)', async () => {
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        await POST(req({ schedule_appointment_id: MOJA_WIZYTA, appointment_date: '2026-09-11T14:30:00.000Z' }));
        // Lista mówi 14:30Z, a widok szczegółu 16:30 czasu ściennego. To ta sama chwila;
        // odtwarzanie jej z `date`+`startTime` przesunęłoby zapis o offset.
        expect(wierszeWstawione[0].appointment_date).toBe('2026-09-11T14:30:00.000Z');
    });

    it('🪤 PMS niedostępny → 503, a NIE cichy zapis na niezweryfikowanym identyfikatorze', async () => {
        pmsLista = false;
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(req({ schedule_appointment_id: MOJA_WIZYTA, appointment_date: '2026-09-11T14:30:00.000Z' }));

        expect(res.status).toBe(503);
        expect(wierszeWstawione).toHaveLength(0);
    });

    it('🔑 ciało BEZ `schedule_appointment_id` → kolumna dostaje NULL, nie wartość z ciała', async () => {
        // Dashboard ZAWSZE wysyła `prodentis_id: patient.id` (id PACJENTA). Dawny fallback
        // `schedule_appointment_id || prodentis_id` wpisywał go do kolumny na id WIZYTY —
        // zmierzone na produkcji: 25 z 3837 wierszy, jeden ŻYWY, wskazujący na realną wizytę
        // innego pacjenta. Bez tej asercji przywrócenie fallbacku przechodzi na zielono.
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(req({ prodentis_id: CUDZA_WIZYTA, appointment_date: '2026-09-11T14:30:00.000Z' }));

        expect(res.status).toBe(200);
        expect(wierszeWstawione).toHaveLength(1);
        expect(wierszeWstawione[0].prodentis_id).toBeNull();
    });

    it('🔴 dopasowanie do listy to RÓWNOŚĆ, nie „zawiera": FRAGMENT identyfikatora → 404', async () => {
        // Sceptyk audytu pokazał, że mutant `includes` zamiast równości przeżywa strażnika,
        // dopóki lista ma jedną pozycję i pyta się o pełny numer. Tu pytamy o PREFIKS:
        // przy równości nie pasuje nic (404), przy `includes` trafiłby w cudzy wpis listy.
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(req({ schedule_appointment_id: '0100234', appointment_date: '2026-09-11T14:30:00.000Z' }));

        expect(res.status).toBe(404);
        expect(wierszeWstawione).toHaveLength(0);
    });

    it('🔑 SKAŻONY wiersz SAM SIĘ LECZY: stare `prodentis_id` zostaje podmienione na zweryfikowane', async () => {
        // Stan zastany zmierzony na produkcji 05.09: 25 z 3837 wierszy ma w kolumnie
        // `prodentis_id` identyfikator PACJENTA zamiast wizyty (skutek dawnego fallbacku
        // `schedule_appointment_id || prodentis_id`). Jeden z nich jest ŻYWY i wskazuje na
        // realnie istniejącą wizytę INNEGO pacjenta. Ta ścieżka naprawia takie wiersze przy
        // pierwszym wejściu pacjenta — bez migracji i bez ręcznej interwencji.
        wierszAkcji = {
            id: WIERSZ,
            patient_id: PACJENT_UUID,
            prodentis_id: JA, // ← id PACJENTA w kolumnie na id WIZYTY: dokładnie to skażenie
            appointment_date: '2026-09-11T14:30:00.000Z',
            status: 'unpaid_reservation',
        };
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(req({ schedule_appointment_id: MOJA_WIZYTA, appointment_date: '2026-09-11T14:30:00.000Z' }));

        expect(res.status).toBe(200);
        expect(wierszeZmienione).toHaveLength(1);
        expect(wierszeZmienione[0].prodentis_id).toBe(MOJA_WIZYTA);
    });

    it('zera wiodące nie rozstrzygają o własności (PMS bywa niekonsekwentny)', async () => {
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(
            req({ schedule_appointment_id: MOJA_WIZYTA.replace(/^0+/, ''), appointment_date: '2026-09-11T14:30:00.000Z' }),
        );
        expect(res.status).toBe(200);
    });
});

// ── PIĘTRO B: ścieżki zapisu porównują właściciela ───────────────────────────

describe('P-001 · piętro B — cancel/reschedule/confirm nie ruszają cudzej wizyty', () => {
    beforeEach(() => {
        // Wiersz NALEŻY do nas (tak jak po skażeniu z piętra A), ale wskazuje na wizytę,
        // która w PMS należy do kogoś innego. To jest dokładnie stan po ataku.
        wierszAkcji = {
            id: WIERSZ,
            patient_id: PACJENT_UUID,
            prodentis_id: CUDZA_WIZYTA,
            appointment_date: '2099-01-01T10:00:00.000Z',
            status: 'unpaid_reservation',
            attendance_confirmed: false,
            cancellation_requested: false,
            reschedule_requested: false,
        };
    });

    it('🔴 SEDNO: cancel na cudzej wizycie → 404 i ZERO zapisów do PMS', async () => {
        wlascicielWizytyWPMS = OBCY;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(404);
        expect(zapisyDoPMS).toHaveLength(0);
    });

    it('🔴 SEDNO: reschedule na cudzej wizycie → 404 i ZERO zapisów do PMS', async () => {
        wlascicielWizytyWPMS = OBCY;
        const { POST } = await import('@/app/api/patients/appointments/[id]/reschedule/route');
        const res = await POST(
            req({ newDate: '2026-10-01', newStartTime: '10:00' }),
            params(WIERSZ),
        );

        expect(res.status).toBe(404);
        expect(zapisyDoPMS).toHaveLength(0);
    });

    it('🔴 SEDNO: confirm-attendance na cudzej wizycie → 404 i NIC nie zapisuje się w bazie', async () => {
        wlascicielWizytyWPMS = OBCY;
        wierszAkcji!.appointment_date = new Date(Date.now() + 3 * 3600_000).toISOString();
        const { POST } = await import('@/app/api/patients/appointments/[id]/confirm-attendance/route');
        const res = await POST(req({}), params(WIERSZ));

        expect(res.status).toBe(404);
        // 🔴 To jest sedno przeniesienia bramki: zapis „obecność potwierdzona" stał PRZED
        // sprawdzeniem PMS, więc bramka postawiona niżej nie ochroniłaby bazy ani maila.
        expect(wierszeZmienione).toHaveLength(0);
        expect(zapisyDoPMS).toHaveLength(0);
    });

    it('KONTROLA POZYTYWNA: własna wizyta przechodzi — cancel realnie kasuje w PMS', async () => {
        wlascicielWizytyWPMS = JA;
        wierszAkcji!.prodentis_id = MOJA_WIZYTA;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(200);
        expect(zapisyDoPMS.some((z) => z.method === 'DELETE' && z.path.includes(MOJA_WIZYTA))).toBe(true);
    });

    it('🪤 DOSTĘPNOŚĆ: odczyt wizyty milczy, ale wizyta jest na MOJEJ liście → pacjent dalej odwołuje', async () => {
        // Reguła całego `prodentisAppointment.ts`: „nie wiemy" ≠ „nie ma". Gdyby bramka
        // traktowała milczenie jak cudzą wizytę, mrugnięcie tunelu odcinałoby WSZYSTKICH
        // pacjentów od odwołania własnej wizyty. Ratuje nas DRUGIE źródło własności — lista.
        wierszAkcji!.prodentis_id = MOJA_WIZYTA;
        pmsOdczytWizyty = false;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(200);
    });

    it('🔴 SEDNO: awaria CZĄSTKOWA (odczyt pada, zapisy żyją) NIE otwiera cudzej wizyty', async () => {
        // To jest dziura, którą sceptyk audytu odtworzył wykonaniem na pierwszej wersji
        // bramki: warunek miał kształt `stanWizyty.ok && !należy(...)`, więc przy
        // `unavailable` sprawdzenie własności było POMIJANE, a DELETE leciał dalej.
        // Wynik przed poprawką: HTTP 200 + `DELETE .../0100213775` na CUDZEJ wizycie.
        wierszAkcji!.prodentis_id = CUDZA_WIZYTA;
        pmsOdczytWizyty = false; // odczyt milczy
        pmsLista = true;         // ...ale lista (i zapisy) żyją
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(404);
        expect(zapisyDoPMS).toHaveLength(0);
    });

    it('🪤 PEŁNA awaria PMS → 503, a nie ciche skreślenie na niezweryfikowanym identyfikatorze', async () => {
        wierszAkcji!.prodentis_id = MOJA_WIZYTA;
        pmsOdczytWizyty = false;
        pmsLista = false;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(503);
        expect(zapisyDoPMS).toHaveLength(0);
    });

    it('🔴 PIERWSZE PIĘTRO: wiersz należący do INNEGO pacjenta → 404 (zawężenie `.eq(patient_id)`)', async () => {
        // Osobne piętro od porównania z PMS: trasy zawężają `appointment_actions` po
        // `patient_id`. Mutant kasujący to zawężenie przechodził, dopóki atrapa `.eq()`
        // była no-opem — czyli strażnik nie widział tej warstwy w ogóle.
        wlascicielWizytyWPMS = JA;
        wierszAkcji!.patient_id = 'cccccccc-3333-4333-8333-cccccccccccc';
        wierszAkcji!.prodentis_id = MOJA_WIZYTA;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(404);
        expect(zapisyDoPMS).toHaveLength(0);
    });

    it('🪤 PMS bez pola `patientId` → fail-open, ale WYŁĄCZNIE gdy lista potwierdza wizytę', async () => {
        // `wizytaNalezyDoPacjenta` przepuszcza brak pola („nie wiemy"), żeby zniknięcie
        // pola po stronie dostawcy nie odcięło wszystkich pacjentów. Ta asercja pilnuje,
        // że gałąź istnieje — bez niej mutant „zawsze true" przechodził niezauważony.
        wierszAkcji!.prodentis_id = MOJA_WIZYTA;
        pmsOddajePatientId = false;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(req({ reason: 'test' }), params(WIERSZ));

        expect(res.status).toBe(200);
    });
});
