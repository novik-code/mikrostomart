/**
 * STRAŻNIK WSTRZYKNIĘĆ DO FILTRA PostgREST (P-005 + P-014, audyt 2026-09-05).
 *
 * 🔴 KLASA BŁĘDU. `.or()` w postgrest-js przyjmuje SUROWĄ składnię PostgREST i wysyła ją
 * dosłownie — a przecinek jest w tej składni SEPARATOREM WARUNKÓW. Sklejenie filtra
 * stringiem z wartości, którą kontroluje użytkownik, dokłada więc do zapytania warunki,
 * których nikt nie napisał. Zapytania idą kluczem `service_role`, czyli OMIJAJĄ RLS.
 *
 * Dwa zmierzone egzemplarze:
 * · **P-005** `export-data`: `patient_phone.eq.${patient.phone}` w `.or()`. Pacjent sam
 *   ustawia sobie `phone` przez `PATCH /api/patients/me` (do 05.09 BEZ walidacji formatu),
 *   więc numer `x,reason.gte.` dokładał warunek prawdziwy dla każdego wiersza z niepustym
 *   powodem — i pacjent dostawał w SWOJEJ paczce RODO odwołane wizyty WSZYSTKICH pacjentów
 *   (`patient_name`, `patient_phone`, `doctor_name`, `appointment_date`, `reason`).
 * · **P-014** `admin/push-send` i `employee/push/to-patient`: warianty numeru sklejane
 *   w `.or(...)` + `.limit(1)`. Gałąź „unknown format" wkłada tam `phone.replace(/\s+/g,'')`,
 *   czyli ciąg z zachowanymi przecinkami — push mógł polecieć do niewłaściwego pacjenta.
 *
 * 🔑 JAK TEN STRAŻNIK MIERZY. Atrapa klienta ma `.eq()`/`.in()`, które REALNIE filtrują,
 * oraz `.or()`, które **rzuca wyjątkiem**. Dzięki temu nie sprawdzamy, czy w kodzie stoi
 * jakieś słowo — sprawdzamy, czy ścieżka wykonania w ogóle sięga po niebezpieczną metodę.
 * Powrót do `.or()` wywala test niezależnie od tego, jak zostanie zapisany.
 *
 * Uruchomienie: `npx vitest run postgrestFilterInjection`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pobierzOdwolaneWizyty, type KlientOdwolanych } from '../patientExportCancelled';

// ── Dane, na których mierzymy ───────────────────────────────────────────────
const MOJ_PRODENTIS = '0100001110';
const MOJ_TELEFON = '+48600000000';
/** Ładunek, który do 05.09 przechodził przez `PATCH /me` bez jednego sprawdzenia. */
const LADUNEK = 'x,reason.gte.';

const WIERSZE = [
    { id: 'A', patient_prodentis_id: MOJ_PRODENTIS, patient_phone: '111111111', reason: 'moja', cancelled_at: '2026-01-02' },
    { id: 'B', patient_prodentis_id: '0100009999', patient_phone: MOJ_TELEFON, reason: 'moja druga', cancelled_at: '2026-01-03' },
    { id: 'C', patient_prodentis_id: '0100007777', patient_phone: '222222222', reason: 'CUDZA — ból zęba', cancelled_at: '2026-01-04' },
];

/**
 * Atrapa z semantyką PostgREST. `.or()` celowo NIE jest zaimplementowane jako filtr —
 * jest MINĄ: jeśli kod produkcyjny po nie sięgnie, test pada z jawnym komunikatem.
 */
function klient(zapamietajOr?: (s: string) => void): KlientOdwolanych {
    return {
        from: () => ({
            select: () => {
                const stan: { kolumna?: string; wartosc?: string } = {};
                const builder: Record<string, unknown> = {
                    eq: (kolumna: string, wartosc: string) => {
                        stan.kolumna = kolumna;
                        stan.wartosc = wartosc;
                        return builder;
                    },
                    or: (s: string) => {
                        zapamietajOr?.(s);
                        throw new Error(
                            'ZABRONIONE: sklejany `.or()` na wartości od użytkownika — to jest dokładnie P-005/P-014',
                        );
                    },
                    order: async () => ({
                        data: WIERSZE.filter(
                            (w) => (w as Record<string, unknown>)[stan.kolumna as string] === stan.wartosc,
                        ),
                    }),
                };
                return builder;
            },
        }),
    } as unknown as KlientOdwolanych;
}

describe('P-005 · paczka RODO nie wycieka cudzych odwołanych wizyt', () => {
    it('🔴 SEDNO: telefon z ładunkiem PostgREST NIE dokłada cudzych wierszy', async () => {
        const wynik = await pobierzOdwolaneWizyty(klient(), {
            prodentisId: MOJ_PRODENTIS,
            phone: LADUNEK,
        });
        // Pasuje tylko wiersz A (po `prodentis_id`); ładunek nie jest niczyim telefonem.
        expect(wynik.map((w) => w.id)).toEqual(['A']);
        expect(JSON.stringify(wynik)).not.toContain('CUDZA');
    });

    it('🔴 SEDNO: ścieżka wykonania NIE sięga po `.or()` (atrapa rzuca, gdyby sięgnęła)', async () => {
        const zlapane: string[] = [];
        await expect(
            pobierzOdwolaneWizyty(klient((s) => zlapane.push(s)), {
                prodentisId: MOJ_PRODENTIS,
                phone: MOJ_TELEFON,
            }),
        ).resolves.toBeDefined();
        expect(zlapane).toHaveLength(0);
    });

    it('KONTROLA POZYTYWNA: pacjent dostaje SWOJE wiersze z obu dróg dopasowania', async () => {
        const wynik = await pobierzOdwolaneWizyty(klient(), {
            prodentisId: MOJ_PRODENTIS,
            phone: MOJ_TELEFON,
        });
        expect(wynik.map((w) => w.id).sort()).toEqual(['A', 'B']);
    });

    it('wiersz pasujący OBIEMA drogami pojawia się RAZ, nie dwa', async () => {
        const wynik = await pobierzOdwolaneWizyty(klient(), {
            prodentisId: MOJ_PRODENTIS,
            phone: '111111111', // ten sam wiersz A
        });
        expect(wynik.map((w) => w.id)).toEqual(['A']);
    });

    it('sortowanie malejąco po `cancelled_at` — jak dotąd', async () => {
        const wynik = await pobierzOdwolaneWizyty(klient(), {
            prodentisId: MOJ_PRODENTIS,
            phone: MOJ_TELEFON,
        });
        expect(wynik.map((w) => w.cancelled_at)).toEqual(['2026-01-03', '2026-01-02']);
    });

    it('brak tożsamości → puste, bez jednego zapytania', async () => {
        expect(await pobierzOdwolaneWizyty(klient(), {})).toEqual([]);
    });

    it('DOWÓD COFKI: stara wersja (sklejone `.or()`) ODDAWAŁA cudzy wiersz', async () => {
        // Odtworzenie kodu sprzed 05.09 wraz z semantyką PostgREST: warunek `reason.gte.`
        // jest prawdziwy dla każdego wiersza z niepustym `reason`, więc `.or()` zwraca
        // WSZYSTKO. Bez tej asercji nie wiadomo, czy naprawa cokolwiek zmieniła.
        const staryKod = (prodentisId: string, phone: string) => {
            const cancelFilters: string[] = [];
            if (prodentisId) cancelFilters.push(`patient_prodentis_id.eq.${prodentisId}`);
            if (phone) cancelFilters.push(`patient_phone.eq.${phone}`);
            const warunki = cancelFilters.join(',').split(',');
            return WIERSZE.filter((w) =>
                warunki.some((c) => {
                    if (c.startsWith('reason.gte.')) return String(w.reason ?? '') >= c.slice('reason.gte.'.length);
                    const [kol, , wart] = [c.split('.')[0], c.split('.')[1], c.split('.').slice(2).join('.')];
                    return (w as Record<string, unknown>)[kol] === wart;
                }),
            );
        };
        const wyciek = staryKod(MOJ_PRODENTIS, LADUNEK);
        expect(wyciek.map((w) => w.id)).toContain('C'); // ← cudza wizyta w paczce RODO
        expect(JSON.stringify(wyciek)).toContain('CUDZA');
    });
});

// ── P-005 źródło: walidacja telefonu w PATCH /me ─────────────────────────────

vi.mock('@/lib/jwt', () => ({ verifyPatientSession: async () => ({ prodentisId: MOJ_PRODENTIS }) }));
vi.mock('@/lib/authGuards', () => ({
    requireAdmin: async () => ({ ok: true, user: { id: 'admin-uuid', email: 'a@b.pl' }, roles: ['admin'] }),
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'emp-uuid', email: 'e@b.pl' }, roles: ['employee'] }),
}));
vi.mock('@/lib/pushService', () => ({ pushToPatientAll: async () => ({ sent: 0, failed: 0 }) }));
vi.mock('@/lib/expoPush', () => ({ hasPatientAppToken: async () => false }));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));

let zapisaneUpdaty: Record<string, unknown>[] = [];
let wywolaniaOr: string[] = [];
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        // 🪤 Atrapa MUSI być świadoma tabeli. Pierwsza wersja oddawała `maybeSingle() → null`
        // dla wszystkiego, więc `export-data` wychodziło na 404 przy odczycie pacjenta
        // i asercja o `.or()` była PUSTA — przeżywała cofkę. Złapane sondą, nie odczytem.
        from: (tabela: string) => {
            const q: Record<string, unknown> = {};
            for (const m of ['select', 'eq', 'order', 'limit', 'in']) q[m] = () => q;
            // 🪤 NAGRYWA, nie rzuca: sekcje `export-data` są w `try/catch`, więc wyjątek
            // zostałby POŁKNIĘTY i strażnik nie zauważyłby powrotu do `.or()`.
            q.or = (filtr: string) => {
                wywolaniaOr.push(filtr);
                return q;
            };
            q.update = (p: Record<string, unknown>) => {
                zapisaneUpdaty.push(p);
                return q;
            };
            const pacjent = {
                id: 'uuid',
                prodentis_id: MOJ_PRODENTIS,
                email: 'a@b.pl',
                locale: 'pl',
                // Telefon z ŁADUNKIEM — tak wygląda konto po ataku sprzed naprawy.
                phone: LADUNEK,
            };
            q.single = async () => ({ data: tabela === 'patients' ? pacjent : null, error: null });
            q.maybeSingle = async () => ({ data: tabela === 'patients' ? pacjent : null, error: null });
            q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
            return q;
        },
        storage: {
            from: () => ({
                download: async () => ({ data: null, error: 'brak' }),
                list: async () => ({ data: [], error: null }),
            }),
        },
    }),
}));

beforeEach(() => {
    zapisaneUpdaty = [];
    wywolaniaOr = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

const patchMe = async (body: unknown) => {
    const { PATCH } = await import('@/app/api/patients/me/route');
    const { NextRequest } = await import('next/server');
    return PATCH(
        new NextRequest('https://example.test/api/patients/me', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
            body: JSON.stringify(body),
        }),
    );
};

describe('P-005 źródło · PATCH /me nie przyjmuje ładunku w polu telefonu', () => {
    it('🔴 SEDNO: `x,reason.gte.` → 400 i ANI JEDEN zapis', async () => {
        const res = await patchMe({ phone: LADUNEK });
        expect(res.status).toBe(400);
        expect(zapisaneUpdaty).toHaveLength(0);
    });

    it('inne kształty ładunku też odrzucone', async () => {
        for (const zly of ['x,id.not.is.null', '48600000000)', "600'000", 'abc', '', '12345', '1'.repeat(16)]) {
            const res = await patchMe({ phone: zly });
            expect(res.status, `powinno odrzucić: ${JSON.stringify(zly)}`).toBe(400);
        }
        expect(zapisaneUpdaty).toHaveLength(0);
    });

    it('KONTROLA POZYTYWNA: realne formaty z produkcji PRZECHODZĄ', async () => {
        // Zmierzone 05.09 na produkcji: 149 ze 149 kont ma numer pasujący do wzorca;
        // rozkład długości 9 (125), 10 (1), 12 (19), 13 (2), 14 (2). Gdyby ta asercja
        // padła, naprawa bezpieczeństwa odcinałaby realnych pacjentów.
        for (const dobry of ['600000000', '+48600000000', '48600000000', '0048600000000', '600 000 000', '600-000-000']) {
            const res = await patchMe({ phone: dobry });
            expect(res.status, `powinno przyjąć: ${dobry}`).not.toBe(400);
        }
        expect(zapisaneUpdaty.length).toBeGreaterThan(0);
        // Format zapisu BEZ zmian (tylko spacje i myślniki znikają) — przepisanie na E.164
        // rozjechałoby `.eq('patient_phone')` w `appointment_actions` i `sms_reminders`.
        expect(zapisaneUpdaty.map((u) => u.phone)).toContain('600000000');
        expect(zapisaneUpdaty.map((u) => u.phone)).toContain('+48600000000');
    });
});

// ── P-005 okablowanie: trasa MUSI iść przez helper ──────────────────────────

describe('P-005 okablowanie · `export-data` nie sklei filtra z telefonu', () => {
    it('🔴 SEDNO: w ŻADNYM `.or()` trasy nie ma `patient_phone`', async () => {
        // Strażnik helpera nie wystarcza: ktoś mógłby cofnąć samą trasę do wersji inline.
        // Tu wykonujemy handler i patrzymy, JAKIE filtry realnie poszły do klienta.
        // ⚪ Sekcja CareFlow nadal używa `.or()` — i słusznie, jej wartości przechodzą
        // przez `SAFE_ID`. Dlatego pytamy o konkretną kolumnę, a nie o samo `.or(`.
        const { GET } = await import('@/app/api/patients/export-data/route');
        const { NextRequest } = await import('next/server');
        await GET(
            new NextRequest('https://example.test/api/patients/export-data', {
                headers: { authorization: 'Bearer t' },
            }),
        ).catch(() => undefined); // sekcje poboczne mogą paść na atrapie — nie o nie pytamy

        expect(wywolaniaOr.filter((f) => f.includes('patient_phone'))).toEqual([]);
    });
});

// ── P-014: trasy pusha szukają pacjenta po telefonie ────────────────────────

describe('P-014 · wyszukiwanie pacjenta po telefonie nie skleja filtra', () => {
    /**
     * Gałąź „unknown format" w obu trasach wkłada do wariantów `phone.replace(/\s+/g,'')`,
     * czyli ciąg z ZACHOWANYMI przecinkami. Sklejone w `.or()` + `.limit(1)` dawało to
     * pierwszego lepszego pacjenta — push leciał do niewłaściwej osoby.
     * Numer niżej ma nietypową długość, żeby wpaść właśnie w tę gałąź.
     */
    const ZLY_NUMER = '1,id.not.is.null';

    it('🔴 SEDNO: `admin/push-send` nie wysyła `phone.eq.` w `.or()`', async () => {
        const { POST } = await import('@/app/api/admin/push-send/route');
        await POST(
            new Request('https://example.test/api/admin/push-send', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ phone: ZLY_NUMER, title: 't', body: 'b' }),
            }),
        ).catch(() => undefined);

        expect(wywolaniaOr.filter((f) => f.includes('phone.eq.'))).toEqual([]);
    });

    it('🔴 SEDNO: `employee/push/to-patient` nie wysyła `phone.eq.` w `.or()`', async () => {
        const { POST } = await import('@/app/api/employee/push/to-patient/route');
        await POST(
            new Request('https://example.test/api/employee/push/to-patient', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ phone: ZLY_NUMER, title: 't', body: 'b' }),
            }),
        ).catch(() => undefined);

        expect(wywolaniaOr.filter((f) => f.includes('phone.eq.'))).toEqual([]);
    });
});
