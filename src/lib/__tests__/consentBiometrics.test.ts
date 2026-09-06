/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST i handlerów tras Next są z natury dynamiczne: builder zwraca
 * sam siebie z dowolnej metody, a `params` bywa `Promise`. Zawężenie tych kształtów do
 * typów SDK wywala kompilację na `TS2589` (rekurencyjne generyki `SupabaseClient`).
 * Konwencja repo dla tej klasy przypadków to jawne wyłączenie z powodem, nie ciche `any`.
 */
/**
 * STRAŻNIK MINIMALIZACJI BIOMETRII PODPISU (P-071 + P-095).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /api/employee/patient-consents` odszyfrowywał i odsyłał
 * w KAŻDYM wierszu pełną trajektorię podpisu — `biometric_data.strokes` z pozycją,
 * NACISKIEM i czasem każdego punktu plus `deviceInfo` — oraz `signature_data`, czyli
 * obraz podpisu. To są dane biometryczne, czyli szczególna kategoria z art. 9 RODO.
 *
 * 🔑 KTO TEGO REALNIE UŻYWA (zmierzone w kodzie, nie założone):
 *   · panel weba (`ScheduleTab`) czyta WYŁĄCZNIE liczby: `pointCount`, `pointerType`,
 *     `avgPressure`, `maxPressure`, `strokeCount`, `totalDuration` — czyli dokładnie to,
 *     co mieści się w streszczeniu — oraz `signature_data` do podglądu w popoverze;
 *   · apka personelu (`PatientActionSheet`) ma typ `SignedConsent` z siedmioma polami,
 *     BEZ indeksu `[key: string]`, i renderuje etykietę, datę i link do pliku. Pełnej
 *     biometrii nie czyta ani razu — dostawała ją i trzymała w pamięci bez powodu.
 *
 * Naprawa: biometria wychodzi jako STRESZCZENIE (kształt 1:1 z `/api/admin/patient-consents`,
 * żeby nie powstała trzecia definicja), a obraz podpisu wyłącznie na żądanie
 * `?includeSignature=1` — dokładane przez panel, który jako jedyny go renderuje.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `biometric_data: pii.biometric_data` w trasie
 * → pada pierwszy test. Usuń warunek `includeSignature` → pada trzeci.
 *
 * Uruchomienie: `npx vitest run consentBiometrics`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const PRODENTIS_ID = '0100001110';

/** Kształt 1:1 z tego, co produkuje podpis na tablecie: punkt ma nacisk i czas. */
const BIOMETRIA_PELNA = {
    pointCount: 412,
    avgPressure: 0.5123,
    maxPressure: 0.9871,
    totalDuration: 3480,
    deviceInfo: { pointerType: 'pen', userAgent: 'iPad', screen: '2048x1536' },
    strokes: [
        { points: [{ x: 10, y: 20, p: 0.4, t: 0 }, { x: 12, y: 22, p: 0.6, t: 16 }] },
        { points: [{ x: 30, y: 40, p: 0.7, t: 900 }] },
    ],
};

const WIERSZ = {
    id: 'cccccccc-3333-4333-8333-cccccccccccc',
    consent_type: 'implant',
    consent_label: 'Zgoda na zabieg implantacji',
    file_url: 'https://example.test/plik.pdf',
    file_path: 'consents/plik.pdf',
    file_name: 'zgoda.pdf',
    signed_at: '2026-09-01T10:00:00.000Z',
    prodentis_synced: true,
    metadata: {},
    signature_data_encrypted: 'szyfr-1',
    biometric_data_encrypted: 'szyfr-2',
};

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'personel@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/auditLog', () => ({ logAudit: () => {} }));
vi.mock('@/lib/privateStorage', () => ({
    PATIENT_DOC_BUCKET: 'patient-docs',
    displayUrlFor: async () => 'https://example.test/podpisany.pdf',
}));
vi.mock('@/lib/encryptedPiiFields', () => ({
    readPatientConsentPii: () => ({
        signature_data: 'data:image/png;base64,PODPISOBRAZ',
        biometric_data: BIOMETRIA_PELNA,
    }),
}));

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'in']) q[m] = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [WIERSZ], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const req = (qs = '') =>
    new NextRequest(`https://example.test/api/employee/patient-consents?prodentisId=${PRODENTIS_ID}${qs}`);

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-071+P-095 · lista zgód nie niesie surowej biometrii', () => {
    it('🔴 SEDNO: trajektoria podpisu (strokes, deviceInfo) NIE wychodzi do klienta', async () => {
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        const body = await (await GET(req())).json();
        const c = body.consents[0];

        // Kontrola pozytywna miernika: źródło NAPRAWDĘ miało pełną trajektorię.
        expect(BIOMETRIA_PELNA.strokes[0].points[0]).toHaveProperty('p');

        expect(c.biometric_data).not.toHaveProperty('strokes');
        expect(c.biometric_data).not.toHaveProperty('deviceInfo');
        /**
         * 🪤 Asercja MUSI celować w PRZEBIEG, nie w statystyki. Pierwsza wersja
         * sprawdzała brak `0.9871` — a to `maxPressure`, czyli legalne pole
         * streszczenia, które panel renderuje. Nie wolno przejść: współrzędne
         * punktów, czas pojedynczego punktu i `userAgent` urządzenia.
         */
        const json = JSON.stringify(body);
        expect(json).not.toContain('"t":16');
        expect(json).not.toContain('"x":10');
        expect(json).not.toContain('iPad');
        expect(json).not.toContain('2048x1536');
    });

    it('🔴 obraz podpisu domyślnie nie wychodzi', async () => {
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        const body = await (await GET(req())).json();
        expect(body.consents[0].signature_data).toBeUndefined();
        expect(JSON.stringify(body)).not.toContain('PODPISOBRAZ');
    });

    it('panel dostaje obraz na żądanie: ?includeSignature=1', async () => {
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        const body = await (await GET(req('&includeSignature=1'))).json();
        expect(body.consents[0].signature_data).toContain('PODPISOBRAZ');
        // 🔑 ...ale trajektoria zostaje streszczona TAKŻE wtedy — obraz to nie to samo
        // co przebieg ruchu ręki, a panel przebiegu nie renderuje.
        expect(body.consents[0].biometric_data).not.toHaveProperty('strokes');
    });

    it('🔑 streszczenie ma DOKŁADNIE te pola, które renderuje panel', async () => {
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        const body = await (await GET(req())).json();
        const bio = body.consents[0].biometric_data;

        // ScheduleTab: plakietka (pointerType, pointCount) i popover
        // (avgPressure, maxPressure, strokeCount, totalDuration).
        expect(bio).toEqual({
            hasData: true,
            pointCount: 412,
            avgPressure: 0.5123,
            maxPressure: 0.9871,
            totalDuration: 3480,
            pointerType: 'pen',
            strokeCount: 2,
        });
    });

    it('pola, z których żyją apka i panel, zostają nietknięte', async () => {
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        const c = (await (await GET(req())).json()).consents[0];

        // Apka: typ SignedConsent — siedem pól, żadnego biometrycznego.
        expect(c.id).toBe(WIERSZ.id);
        expect(c.consent_type).toBe('implant');
        expect(c.consent_label).toBe('Zgoda na zabieg implantacji');
        expect(c.file_name).toBe('zgoda.pdf');
        expect(c.signed_at).toBe(WIERSZ.signed_at);
        expect(c.prodentis_synced).toBe(true);
        // `file_url` MUSI zostać otwieralnym adresem — binarka ze sklepu otwiera go wprost.
        expect(c.file_url).toBe('https://example.test/podpisany.pdf');
    });

    it('🪤 kolumny zaszyfrowane nie przeciekają w żadnym wariancie', async () => {
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        for (const qs of ['', '&includeSignature=1']) {
            const body = await (await GET(req(qs))).json();
            expect(JSON.stringify(body)).not.toContain('szyfr-1');
            expect(JSON.stringify(body)).not.toContain('szyfr-2');
        }
    });

    it('🪤 zgoda BEZ biometrii (podpis papierowy) nie wywraca trasy', async () => {
        vi.doUnmock('@/lib/encryptedPiiFields');
        vi.resetModules();
        vi.doMock('@/lib/encryptedPiiFields', () => ({
            readPatientConsentPii: () => ({ signature_data: null, biometric_data: null }),
        }));
        const { GET } = await import('@/app/api/employee/patient-consents/route');
        const body = await (await GET(req())).json();
        expect(body.consents[0].biometric_data).toBeNull();
        vi.doUnmock('@/lib/encryptedPiiFields');
        vi.resetModules();
    });
});

/**
 * 🪤 DRUGA POŁOWA KONTRAKTU — i jedyny w tym pliku strażnik czytający ŹRÓDŁO.
 *
 * Testy wyżej wołają trasę SAME podając `includeSignature=1`, więc nie powiedzą ani słowa,
 * gdy panel przestanie ten parametr dokładać. Wtedy `c.signature_data` przychodzi
 * `undefined`, podgląd podpisu w popoverze gaśnie CICHO, a `npm test` zostaje zielony —
 * dokładnie klasa „strażnik czerwony bywa jednocześnie ślepy".
 *
 * Wykonać tego nie da się w vitest (to komponent panelu, nie handler), więc czytamy plik —
 * tak samo jak istniejący `storagePathWiring.test.ts`. To wyjątek, nie wzorzec.
 */
describe('P-071+P-095 · panel dokłada includeSignature=1', () => {
    it('🔴 ScheduleTab prosi o obraz podpisu — inaczej popover gaśnie po cichu', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('src/app/pracownik/components/ScheduleTab.tsx', 'utf8');

        // Kontrola pozytywna miernika: plik NAPRAWDĘ woła tę trasę i renderuje podpis.
        expect(zrodlo).toContain('/api/employee/patient-consents?prodentisId=');
        expect(zrodlo).toContain('src={c.signature_data}');

        /**
         * 🪤 ASERCJA CELUJE W ADRES ŻĄDANIA, NIE W GOŁY NAPIS. Pierwsza wersja sprawdzała
         * `toContain('includeSignature=1')` i przechodziła po usunięciu parametru z `fetch` —
         * bo ten sam ciąg stoi w KOMENTARZU obok. Zmierzone cofką: wystąpień było dwa,
         * po skasowaniu z adresu zostawało jedno i test świecił na zielono.
         */
        expect(zrodlo).toMatch(
            /patient-consents\?prodentisId=\$\{[^}]+\}&includeSignature=1/,
        );
    });
});
