/**
 * Regresja: `findSilentPushPaths` NIE MOŻE alarmować o ścieżce, której nigdy
 * nie podjęto.
 *
 * Zmierzone na produkcji 2026-07-29: `appointment_reminder` miało `attempts_24h = 0`,
 * `last_attempt_at = null` i zero błędów — ze 169 przypomnień ani jedno nie trafiło
 * do posiadacza aplikacji, bo takiego kandydata po prostu nie było. Poprzednia wersja
 * warunku traktowała „nigdy nie zadziałała" jak awarię i wysyłała alert CODZIENNIE
 * od dnia wgrania migracji 186 — czyli dokładnie ten skutek, przed którym ostrzega
 * komentarz w cronie: alarm o ciszy tam, gdzie cisza jest normalna, uczy zespół
 * ignorować alerty i cały mechanizm przestaje działać.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let rows: unknown[];
/** Zaległe zadania Opieki widziane przez sondę zdarzeniową (`care_tasks`). */
let zaniedbane: unknown[];
/** Gdy ustawione — sonda dostaje BŁĄD zamiast danych (kontrola fail-safe). */
let bladSondy: { message: string } | null;

function makeQuery(tabela: string) {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'not', 'in', 'update', 'maybeSingle', 'is', 'lt', 'gt', 'limit'])
        q[m] = () => q;
    q.then = (resolve: (v: unknown) => unknown) => {
        if (tabela === 'care_tasks') {
            return Promise.resolve(
                bladSondy ? { data: null, error: bladSondy } : { data: zaniedbane, error: null },
            ).then(resolve);
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve);
    };
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => makeQuery(t) }),
}));

const MIN = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MIN).toISOString();

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    rows = [];
    zaniedbane = [];
    bladSondy = null;
});

describe('findSilentPushPaths', () => {
    it('MILCZY o ścieżce, której nigdy nie podjęto (last_attempt_at = null)', async () => {
        rows = [
            {
                path_key: 'appointment_reminder',
                label: 'Przypomnienia',
                max_silence_minutes: 1560,
                last_attempt_at: null,
                last_success_at: null,
                last_error: null,
            },
        ];
        const { findSilentPushPaths } = await import('../pushHealth');
        expect(await findSilentPushPaths()).toEqual([]);
    });

    it('ALARMUJE, gdy ścieżkę podjęto, ale nigdy się nie udało', async () => {
        rows = [
            {
                path_key: 'appointment_confirmed',
                label: 'Potwierdzenia',
                max_silence_minutes: 2880,
                last_attempt_at: ago(30),
                last_success_at: null,
                last_error: 'sent=0 failed=3',
            },
        ];
        const { findSilentPushPaths } = await import('../pushHealth');
        const out = await findSilentPushPaths();
        expect(out).toHaveLength(1);
        expect(out[0].path_key).toBe('appointment_confirmed');
        expect(out[0].silentMinutes).toBeNull();
    });

    it('ALARMUJE, gdy ostatni sukces jest starszy niż próg', async () => {
        rows = [
            {
                path_key: 'appointment_confirmed',
                label: 'Potwierdzenia',
                max_silence_minutes: 2880, // 48 h
                last_attempt_at: ago(60),
                last_success_at: ago(3000), // 50 h
                last_error: null,
            },
        ];
        const { findSilentPushPaths } = await import('../pushHealth');
        const out = await findSilentPushPaths();
        expect(out).toHaveLength(1);
        expect(out[0].silentMinutes).toBeGreaterThan(2880);
    });

    it('MILCZY, gdy sukces mieści się w progu', async () => {
        rows = [
            {
                path_key: 'appointment_confirmed',
                label: 'Potwierdzenia',
                max_silence_minutes: 2880,
                last_attempt_at: ago(10),
                last_success_at: ago(120), // 2 h
                last_error: null,
            },
        ];
        const { findSilentPushPaths } = await import('../pushHealth');
        expect(await findSilentPushPaths()).toEqual([]);
    });

    it('MILCZY o ścieżkach zdarzeniowych (max_silence_minutes = null)', async () => {
        // Zapytanie i tak je odfiltrowuje, ale warunek w pętli jest drugą bramką —
        // gdyby ktoś zmienił zapytanie, awarie nie mogą zacząć alarmować o ciszy.
        rows = [
            {
                path_key: 'incident_blocking',
                label: 'Awarie blokujące',
                max_silence_minutes: null,
                last_attempt_at: ago(5000),
                last_success_at: null,
                last_error: null,
            },
        ];
        const { findSilentPushPaths } = await import('../pushHealth');
        expect(await findSilentPushPaths()).toEqual([]);
    });
});

describe('careflow_task — ścieżka ZDARZENIOWA: pytamy „czy kanał zawiódł", nie „czy było cicho"', () => {
    /** Wiersz odwzorowany z produkcji 24.08: cisza 801 minut przy progu 180. */
    const wiersz = () => [{
        path_key: 'careflow_task',
        label: 'Opieka — dawki',
        max_silence_minutes: 180,
        last_attempt_at: ago(801),
        last_success_at: ago(801),
        last_error: null,
    }];

    it('🔴 SEDNO: cisza 801 min PRZY PROGU 180, ale zero zaległych zadań → BEZ alarmu', async () => {
        rows = wiersz();
        zaniedbane = [];
        const { findSilentPushPaths } = await import('../pushHealth');

        /**
         * Bez tej poprawki alarm szedł KAŻDEGO RANKA i to nie był pech, tylko
         * arytmetyka: sama cisza nocna (00:00–07:00 = 420 min) jest 2,3× większa
         * niż próg 180, a cron zdrowia chodzi o 09:00. Zdrowa ścieżka nie miała
         * żadnej możliwości zmieścić się w progu.
         */
        expect(await findSilentPushPaths()).toEqual([]);
    });

    it('ale gdy JEST zaległe zadanie bez ani jednej próby pusha → alarmuje', async () => {
        rows = wiersz();
        zaniedbane = [{ id: 'a' }, { id: 'b' }];
        const { findSilentPushPaths } = await import('../pushHealth');

        const out = await findSilentPushPaths();
        expect(out).toHaveLength(1);
        expect(out[0].path_key).toBe('careflow_task');
        // Komunikat ma mówić, CO jest nie tak — „cicho od 801 minut" nie mówi nic.
        expect(out[0].lastError).toContain('2');
    });

    it('błąd sondy NIE gasi alarmu po cichu — spada na stary warunek zegarowy', async () => {
        rows = wiersz();
        bladSondy = { message: 'PostgREST padł' };
        const { findSilentPushPaths } = await import('../pushHealth');

        /**
         * 🔑 „Nie wiem" ≠ „wszystko gra". Gdyby błąd odczytu zwracał zero zaległych,
         * awaria samej sondy wyciszałaby alarm o awarii kanału — czyli dokładnie
         * rodzina „jeden kod błędu na dwie przyczyny".
         */
        expect(await findSilentPushPaths()).toHaveLength(1);
    });
});
