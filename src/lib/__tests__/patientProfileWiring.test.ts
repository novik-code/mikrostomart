/**
 * STRAŻNIK WIDOKU PROFILU PACJENTA (P-023).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /api/patients/me` i `POST /api/patients/login` oddawały
 * pacjentowi CAŁĄ odpowiedź kartoteki z Prodentisa przez spread (`{ ...patientData }`,
 * `{ ...patientDetails }`). Kontrakt tej trasy PMS niesie `pesel`, `birthDate`, `gender`,
 * `middleName`, `maidenName`, `notes` i `warnings[]` („Uwagi i ostrzeżenia dla lekarza") —
 * czyli wewnętrzne notatki personelu i dane szczególne. Web i apka konsumują z tego
 * wyłącznie imię, nazwisko, telefon, e-mail, adres i identyfikator.
 *
 * 🔑 POMIAR PRODUKCYJNY (06.09, konto DEMO recenzentów, klucz PACJENCKI — ten sam,
 * którym idą obie trasy). Odpowiedzi zawierały DOKŁADNIE:
 *   · `/login` → patient: 15 kluczy, w tym `pesel` (11 znaków, NIEPUSTY), `birthDate`,
 *     `gender`, `middleName`, `maidenName`, `notes`, `warnings[]`;
 *   · `/me`    → 17 kluczy, ten sam komplet pól wrażliwych.
 * Dziura była więc ŻYWA, a nie teoretyczna: PMS nie filtruje niczego dla klucza pacjenta.
 * (`notes`/`warnings` na koncie demo są puste, bo to pacjent syntetyczny — pola przychodzą.)
 *
 * 🔑 Ten plik WYKONUJE oba prawdziwe handlery na `NextRequest`, a nie grepuje źródeł.
 * Powód jest w historii projektu: strażnik szukający wzorca tekstowego przepuścił tu
 * cztery regresje z rzędu, a istniejące strażniki tras logowania (`loginAttemptCounting`)
 * czytają PLIK, więc na tę klasę błędu są ślepe.
 *
 * 🔑 KOMPLET KONSUMENTÓW ZMIERZONY, NIE ZAŁOŻONY (06.09, przegląd adwersaryjny ośmiu
 * agentów po OBU repozytoriach, trzech niezależnych sceptyków z zadaniem OBALENIA listy):
 * web czyta z tego źródła `id`, `firstName`, `lastName`, `phone`, `email`, `locale`,
 * `account_status`, `supabaseId` i pięć podpól adresu; apka to samo plus `avatar`.
 * Ani jednego czytelnika pola wrażliwego — `pesel`/`birthDate`/`warnings` bierze strefa
 * PERSONELU z osobnej trasy `/api/employee/patient-details`, a strona zgód z własnej
 * whitelisty w `consents/verify`. Obu tych miejsc naprawa nie dotyka.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `...patientData` w `me/route.ts` albo
 * `...patientDetails` w `login/route.ts` → pada odpowiednio pierwszy albo czwarty test.
 *
 * Uruchomienie: `npx vitest run patientProfileWiring`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const PRODENTIS_ID = '0100001110';
const PACJENT_UUID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

/**
 * Kształt 1:1 z pomiaru produkcyjnego — wszystkie klucze, jakie PMS realnie oddaje
 * kluczem pacjenckim, plus jedno pole, którego dziś nie ma. To ostatnie pilnuje, że
 * naprawa jest ALLOW-listą: pole, o którym nikt nie wiedział w chwili pisania kodu,
 * ma nie przeciekać samo z siebie.
 */
const REKORD_PMS = {
    id: PRODENTIS_ID,
    firstName: 'Jan',
    lastName: 'Demo',
    middleName: 'Maria',
    maidenName: 'Kowalski',
    pesel: '90010123671',
    birthDate: '1990-01-01',
    gender: 'M',
    phone: '570810800',
    email: 'kartoteka@example.test',
    address: {
        street: 'Testowa',
        houseNumber: '1',
        apartmentNumber: '2',
        postalCode: '45-000',
        city: 'Opole',
        // Podpole, którego nikt nie czyta — allow-lista adresu też ma być allow-listą.
        country: 'PL',
    },
    notes: 'Ankieta E-Karty: nosicielstwo, nalogi, leki staly.',
    warnings: [{ text: 'Uwaga dla lekarza', date: '2026-01-01', author: 'Recepcja' }],
    przyszlePoleDostawcy: 'cokolwiek dostawca doda jutro',
};

/** Siedem udokumentowanych pól wrażliwych + pole nieznane. Żadne nie ma prawa wyjść. */
const ZAKAZANE = [
    'pesel',
    'birthDate',
    'gender',
    'middleName',
    'maidenName',
    'notes',
    'warnings',
    'przyszlePoleDostawcy',
] as const;

// ── Mocki ───────────────────────────────────────────────────────────────────

let wywolaniaPMS: string[] = [];

vi.mock('@/lib/jwt', () => ({
    verifyPatientSession: async () => ({ prodentisId: PRODENTIS_ID, userId: PACJENT_UUID }),
}));

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (path: string) => {
        wywolaniaPMS.push(path);
        return { ok: true, status: 200, json: async () => ({ ...REKORD_PMS }) };
    },
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));

/** Wiersz `patients` w Supabase — pola dokładane do odpowiedzi obok kartoteki PMS. */
const WIERSZ_SUPABASE = {
    id: PACJENT_UUID,
    prodentis_id: PRODENTIS_ID,
    email: 'konto@example.test',
    phone: '570810800',
    account_status: 'active',
    email_verified: true,
    locale: 'pl',
    avatar: 'preset_3',
    password_hash: '$2a$04$zamockowanyhaszktoregonikorzysta',
    // Kolumny, które NIE mają prawa wyjść do klienta razem z profilem.
    notification_preferences: { push_wizyty: true },
    last_login: '2026-09-06T06:00:00.000Z',
};

function zapytanie(table: string): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'gte', 'lt', 'lte', 'gt', 'in', 'ilike', 'order', 'limit', 'neq', 'is']) {
        q[m] = () => q;
    }
    q.single = async () =>
        table === 'patients'
            ? { data: WIERSZ_SUPABASE, error: null }
            : { data: null, error: { message: 'brak' } };
    q.maybeSingle = async () => q.single();
    q.insert = () => {
        const r: any = { select: () => r, single: async () => ({ data: null, error: null }) };
        r.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return r;
    };
    q.update = () => q;
    q.delete = () => q;
    // `login_attempts` czytane jest przez await na builderze — pusta lista = brak blokady.
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => zapytanie(t) }),
}));

vi.mock('bcryptjs', () => ({ default: { compare: async () => true, hash: async () => 'h' } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: () => 'zamockowany.jwt.token' } }));

const getMe = () =>
    new NextRequest('https://example.test/api/patients/me', {
        method: 'GET',
        headers: { authorization: 'Bearer t', 'x-client': 'native' },
    });

const postLogin = () =>
    new NextRequest('https://example.test/api/patients/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-client': 'native' },
        body: JSON.stringify({ phone: '570810800', password: 'AppReview2026!' }),
    });

beforeEach(() => {
    vi.clearAllMocks();
    wywolaniaPMS = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
    process.env.JWT_SECRET = 'sekret-testowy';
});

// ── GET /api/patients/me ────────────────────────────────────────────────────

describe('P-023 · GET /api/patients/me oddaje widok profilu, nie kartotekę', () => {
    it('🔴 SEDNO: ani jedno z siedmiu pól wrażliwych nie wychodzi do pacjenta', async () => {
        const { GET } = await import('@/app/api/patients/me/route');
        const res = await GET(getMe());
        const body = await res.json();

        // Kontrola pozytywna miernika: poszliśmy ścieżką PMS, nie gałęzią demo,
        // i atrapa NAPRAWDĘ oddała komplet pól wrażliwych.
        expect(res.status).toBe(200);
        expect(wywolaniaPMS).toEqual([`/api/patient/${PRODENTIS_ID}/details`]);
        expect(Object.keys(REKORD_PMS)).toEqual(expect.arrayContaining([...ZAKAZANE]));

        for (const pole of ZAKAZANE) {
            expect(body, `pole "${pole}" wyciekło z /me`).not.toHaveProperty(pole);
        }
    });

    it('pola, z których żyją web i apka, zostają na miejscu', async () => {
        const { GET } = await import('@/app/api/patients/me/route');
        const body = await (await GET(getMe())).json();

        // Web: PatientData (usePatientAuth.ts) + dashboard + profil + CheckoutForm.
        // Apka: typ Patient (api.ts) + ekran profilu.
        expect(body.id).toBe(PRODENTIS_ID);
        expect(body.firstName).toBe('Jan');
        expect(body.lastName).toBe('Demo');
        expect(body.supabaseId).toBe(PACJENT_UUID);
        expect(body.account_status).toBe('active');
        expect(body.locale).toBe('pl');
        expect(body.avatar).toBe('preset_3');
        // Supabase ma pierwszeństwo przed kartoteką — to zachowanie sprzed naprawy.
        expect(body.email).toBe('konto@example.test');
        expect(body.phone).toBe('570810800');
    });

    it('adres dojeżdża w całości — pięć podpól, których używa profil i checkout', async () => {
        const { GET } = await import('@/app/api/patients/me/route');
        const body = await (await GET(getMe())).json();

        expect(body.address).toEqual({
            street: 'Testowa',
            houseNumber: '1',
            apartmentNumber: '2',
            postalCode: '45-000',
            city: 'Opole',
        });
        // 🪤 Podpole spoza listy ma odpaść razem z resztą — inaczej „allow-lista” kłamie.
        expect(body.address).not.toHaveProperty('country');
    });

    it('🪤 kolumny Supabase spoza kontraktu nie jadą razem z profilem', async () => {
        const { GET } = await import('@/app/api/patients/me/route');
        const body = await (await GET(getMe())).json();

        expect(body).not.toHaveProperty('password_hash');
        expect(body).not.toHaveProperty('last_login');
        /**
         * 🔑 CELOWO NIE MA TU `notification_preferences`. Apka czyta to pole w dwóch
         * miejscach (`(patient)/panel.tsx` — czy planować lokalne przypomnienia,
         * `(patient)/profil.tsx` — hydracja przełączników), a `/me` go dziś nie oddaje,
         * bo `select` z Supabase go nie bierze. To jest osobna pozycja audytu (P-018,
         * Fala 1g) i jej naprawa POLEGA na dołożeniu tego klucza. Asercja „nie ma"
         * zamieniłaby ten plik w blokadę własnej kolejki napraw.
         */
    });
});

// ── POST /api/patients/login ────────────────────────────────────────────────

describe('P-023 · POST /api/patients/login oddaje widok profilu, nie kartotekę', () => {
    it('🔴 SEDNO: ani jedno z siedmiu pól wrażliwych nie wychodzi w `patient`', async () => {
        const { POST } = await import('@/app/api/patients/login/route');
        const res = await POST(postLogin());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(wywolaniaPMS).toEqual([`/api/patient/${PRODENTIS_ID}/details`]);

        for (const pole of ZAKAZANE) {
            expect(body.patient, `pole "${pole}" wyciekło z /login`).not.toHaveProperty(pole);
        }
    });

    it('kontrakt natywnego klienta zostaje nietknięty: token + trzy pola konta', async () => {
        const { POST } = await import('@/app/api/patients/login/route');
        const body = await (await POST(postLogin())).json();

        // Apka (auth-context) bierze `res.token` i `res.patient`; bez tego logowanie pada.
        expect(body.success).toBe(true);
        expect(body.token).toBe('zamockowany.jwt.token');
        expect(body.patient.supabaseId).toBe(PACJENT_UUID);
        expect(body.patient.prodentis_id).toBe(PRODENTIS_ID);
        expect(body.patient.email).toBe('konto@example.test');
        expect(body.patient.id).toBe(PRODENTIS_ID);
        expect(body.patient.firstName).toBe('Jan');
        expect(body.patient.lastName).toBe('Demo');
        expect(body.patient.phone).toBe('570810800');
        expect(body.patient.address.city).toBe('Opole');
    });

    it('🪤 wiersz `patients` z Supabase nie przecieka przez odpowiedź logowania', async () => {
        const { POST } = await import('@/app/api/patients/login/route');
        const body = await (await POST(postLogin())).json();

        expect(body.patient).not.toHaveProperty('password_hash');
        expect(body.patient).not.toHaveProperty('last_login');
    });
});
