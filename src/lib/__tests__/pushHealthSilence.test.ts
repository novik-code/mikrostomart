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

function makeQuery() {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'not', 'in', 'update', 'maybeSingle']) q[m] = () => q;
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: () => makeQuery() }),
}));

const MIN = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MIN).toISOString();

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    rows = [];
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
