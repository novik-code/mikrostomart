/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK: grafik niesie flagi „e-Karta bez zgód" (2026-09-11).
 *
 * 🔴 CO BYŁO ZEPSUTE. U nowych pacjentów w Prodentisie brakowało biometrii podpisu:
 * rejestracja nie wystawiała linku do zgód, a status e-Karty był widoczny wyłącznie
 * WEWNĄTRZ okna zgód. Od lipca 42% e-Kart nowych pacjentów nie miało tego samego
 * dnia linku do zgód. Kod działał — brakowało sygnału tam, gdzie rejestracja pracuje.
 *
 * Strażnik WYKONUJE `GET /api/employee/schedule` na atrapach PMS i bazy i sprawdza,
 * że flagi dojeżdżają do wizyty — także wtedy, gdy padnie filtr dezaktywowanych
 * operatorów, czyli drugą ścieżką zwrotną tej trasy.
 *
 * 🔑 KONTRAKT Z APKĄ: apka 1.3.x czyta tę trasę. Pola są wyłącznie DODANE — test
 * przypina pełny zestaw kluczy wizyty, więc zmiana znaczenia albo usunięcie pola
 * też go wywróci.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń `await dolozFlagiZgod(days)` z trasy → padają 🔴.
 *
 * Uruchomienie: `npx vitest run grafikFlagiZgod`
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const EKARTA_BEZ_ZGOD = '0100000001';
const EKARTA_ZE_ZGODAMI = '0100000002';
const STALY_PACJENT = '0100000003';

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/brandConfig', () => ({ demoSanitize: (x: unknown) => x }));

/**
 * Daty, o które trasa pytała PMS, w kolejności dni. Dane testowe budujemy z NICH,
 * a nie z daty wpisanej na sztywno: trasa liczy dni w strefie maszyny, więc na
 * Macu w Warszawie i na serwerze w UTC ten sam `weekStart` daje inne napisy dat.
 */
const pytaneDaty: string[] = [];
const zapytania: Array<Record<string, unknown>> = [];

let awariaZgod = false;
let awariaFiltra = false;
let zgodyNaLimicie = false;

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (sciezka: string) => {
        const data = new URL(`https://pms.example.test${sciezka}`).searchParams.get('date')!;
        pytaneDaty.push(data);
        const wizyta = (id: string, patientId: string, godzina: string) => ({
            id,
            date: `${data}T${godzina}:00`,
            endDate: null,
            duration: 30,
            patientName: 'Pacjent Testowy',
            patientPhone: '',
            patientId,
            doctor: { id: 'd1', name: 'Lekarz Testowy' },
            appointmentType: { id: 't1', name: 'Konsultacja' },
            isWorkingHour: true,
            notes: null,
            badges: [],
        });
        // Wizyty tylko pierwszego dnia tygodnia — reszta dni pusta.
        const appointments = pytaneDaty.length === 1
            ? [
                wizyta('w1', EKARTA_BEZ_ZGOD, '09:00'),
                wizyta('w2', EKARTA_ZE_ZGODAMI, '10:00'),
                wizyta('w3', STALY_PACJENT, '11:00'),
            ]
            : [];
        return { ok: true, status: 200, json: async () => ({ appointments }) };
    },
}));

function wiersze(tabela: string): { data: any; error: any } {
    const dzien = pytaneDaty[0];
    if (tabela === 'patient_intake_submissions') {
        return {
            data: [
                { prodentis_patient_id: EKARTA_BEZ_ZGOD, submitted_at: `${dzien}T07:14:00.000Z` },
                { prodentis_patient_id: EKARTA_ZE_ZGODAMI, submitted_at: `${dzien}T07:30:00.000Z` },
            ],
            error: null,
        };
    }
    if (tabela === 'patient_consents') {
        if (awariaZgod) return { data: null, error: { message: 'awaria testowa' } };
        const podpisana = { prodentis_patient_id: EKARTA_ZE_ZGODAMI, signed_at: `${dzien}T08:05:00.000Z` };
        return { data: zgodyNaLimicie ? Array.from({ length: 1000 }, () => podpisana) : [podpisana], error: null };
    }
    return { data: [], error: null }; // employees: brak dezaktywowanych
}

function zapytanie(tabela: string): any {
    const zapis: Record<string, unknown> = { tabela };
    const q: any = {};
    q.select = (kolumny: string) => { zapis.select = kolumny; return q; };
    q.eq = () => q;
    q.gte = (kolumna: string, wartosc: string) => { zapis.gteKolumna = kolumna; zapis.gte = wartosc; return q; };
    q.lt = (kolumna: string, wartosc: string) => { zapis.ltKolumna = kolumna; zapis.lt = wartosc; return q; };
    q.limit = (n: number) => { zapis.limit = n; return q; };
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
        zapytania.push(zapis);
        if (tabela === 'employees' && awariaFiltra) return Promise.reject(new Error('awaria filtra')).then(res, rej);
        return Promise.resolve(wiersze(tabela)).then(res, rej);
    };
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

beforeEach(() => {
    pytaneDaty.length = 0;
    zapytania.length = 0;
    awariaZgod = false;
    awariaFiltra = false;
    zgodyNaLimicie = false;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

async function grafik(): Promise<any> {
    const { GET } = await import('@/app/api/employee/schedule/route');
    const res = await GET(new Request('https://example.test/api/employee/schedule?weekStart=2026-09-07'));
    expect(res.status).toBe(200);
    return res.json();
}

const wizytaPacjenta = (body: any, patientId: string) =>
    body.days[0].appointments.find((a: any) => a.patientId === patientId);

describe('grafik · flagi „e-Karta bez zgód"', () => {
    it('KONTROLA ATRAPY: trasa zwraca tydzień z trzema wizytami pierwszego dnia', async () => {
        // Gdyby atrapa nic nie oddawała, asercje niżej przechodziłyby na pustce.
        const body = await grafik();
        expect(body.days).toHaveLength(7);
        expect(body.days[0].appointments).toHaveLength(3);
    });

    it('🔴 e-Karta dziś, zgód brak → ekartaDzis: true, zgodyDzis: false', async () => {
        const body = await grafik();
        const apt = wizytaPacjenta(body, EKARTA_BEZ_ZGOD);
        expect(apt.ekartaDzis).toBe(true);
        expect(apt.zgodyDzis).toBe(false);
    });

    it('🔴 e-Karta i zgody tego samego dnia → oba true', async () => {
        const body = await grafik();
        const apt = wizytaPacjenta(body, EKARTA_ZE_ZGODAMI);
        expect(apt.ekartaDzis).toBe(true);
        expect(apt.zgodyDzis).toBe(true);
    });

    it('🔴 stały pacjent bez e-Karty → oba false (wiemy, że nic nie było)', async () => {
        const body = await grafik();
        const apt = wizytaPacjenta(body, STALY_PACJENT);
        expect(apt.ekartaDzis).toBe(false);
        expect(apt.zgodyDzis).toBe(false);
    });

    it('🔴 KONTRAKT: wizyta ma dotychczasowe pola bez zmian + dwa nowe', async () => {
        const body = await grafik();
        const apt = wizytaPacjenta(body, EKARTA_BEZ_ZGOD);
        expect(Object.keys(apt).sort()).toEqual([
            'appointmentType', 'appointmentTypeId', 'badges', 'doctorId', 'doctorName',
            'duration', 'ekartaDzis', 'endTime', 'id', 'isWorkingHour', 'notes',
            'patientId', 'patientName', 'patientPhone', 'startTime', 'zgodyDzis',
        ]);
        expect(apt).toMatchObject({
            id: 'w1', patientId: EKARTA_BEZ_ZGOD, doctorName: 'Lekarz Testowy', doctorId: 'd1',
            startTime: '09:00', appointmentType: 'Konsultacja', appointmentTypeId: 't1',
        });
    });

    it('🔴 filtr dezaktywowanych padł → flagi DALEJ są (druga ścieżka zwrotna)', async () => {
        // Flagi wpięte za filtrem znikałyby akurat wtedy, gdy filtr padnie.
        awariaFiltra = true;
        const body = await grafik();
        expect(wizytaPacjenta(body, EKARTA_BEZ_ZGOD).ekartaDzis).toBe(true);
    });

    it('🔴 zapytania pytają po właściwych kolumnach i obejmują dzień wizyty', async () => {
        await grafik();
        const ekarty = zapytania.find(z => z.tabela === 'patient_intake_submissions')!;
        const zgody = zapytania.find(z => z.tabela === 'patient_consents')!;
        expect(ekarty).toMatchObject({ gteKolumna: 'submitted_at', ltKolumna: 'submitted_at', limit: 1000 });
        // `signed_at`, nie `created_at` — patrz `lib/zgodyPoEkarcie.ts`.
        expect(zgody).toMatchObject({ gteKolumna: 'signed_at', ltKolumna: 'signed_at', limit: 1000 });
        const dzien = pytaneDaty[0];
        for (const z of [ekarty, zgody]) {
            expect(String(z.gte) <= `${dzien}T00:00:00.000Z`).toBe(true);
            expect(String(z.lt) > `${pytaneDaty[6]}T23:59:59.999Z`).toBe(true);
        }
    });
});

describe('grafik · awaria flag NIE psuje grafiku i NIE daje fałszywych ostrzeżeń', () => {
    it('zapytanie o zgody padło → grafik jest, flag nie ma u NIKOGO', async () => {
        // Gdyby zostały same flagi e-Karty, panel pokazałby „brak zgód" u każdego
        // pacjenta z e-Kartą — także u tego, który zgody podpisał.
        awariaZgod = true;
        const body = await grafik();
        expect(body.days[0].appointments).toHaveLength(3);
        for (const apt of body.days[0].appointments) {
            expect(apt).not.toHaveProperty('ekartaDzis');
            expect(apt).not.toHaveProperty('zgodyDzis');
        }
    });

    it('lista zgód na limicie (mogła zostać ucięta) → flag nie ma', async () => {
        zgodyNaLimicie = true;
        const body = await grafik();
        expect(wizytaPacjenta(body, EKARTA_BEZ_ZGOD)).not.toHaveProperty('ekartaDzis');
    });
});
