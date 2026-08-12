/**
 * `readMfaGate` — odczyt bramki 2FA razem z epoką unieważnień (migracja 191).
 *
 * 🪤 TEN PLIK ISTNIEJE Z POWODU JEDNEJ PUŁAPKI. Dołożenie kolumny `mfa_epoch`
 * do zapytania middleware'u wygląda niewinnie, ale dopóki migracja nie jest
 * wgrana, PostgREST odrzuca CAŁY select błędem `42703`. Wtedy `totp_enabled`
 * wychodzi `false`, bramka uznaje, że pracownik nie ma 2FA — i przestaje
 * czegokolwiek wymagać. Zmiana mająca ZAMKNĄĆ dziurę OTWIERAŁABY ją na czas
 * między deployem a migracją.
 *
 * Ta sama klasa, co awaria `/api/patients/me` po dodaniu kolumny `avatar`
 * (CONTEXT apki, 2026-06-28): jeden brakujący DDL wywraca cały odczyt.
 *
 * Strażnik tekstowy tego nie łapie — sprawdzone cofką: podmiana warunku
 * fallbacku na `if (false)` zostawia w pliku i kod `42703`, i wzorzec selectu,
 * więc grep dalej świeci na zielono. Dlatego test wywołuje funkcję naprawdę.
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readMfaGate } from '@/lib/mfaEpoch';

type Resp = { data: unknown; error: { code: string; message: string } | null };

/** Klient udający PostgREST: odpowiedź dobierana po LIŚCIE KOLUMN w selekcie. */
function fakeClient(byColumns: Record<string, Resp>, calls: string[]) {
    return {
        from: () => ({
            select: (cols: string) => {
                calls.push(cols);
                const resp: Resp = byColumns[cols] ?? {
                    data: null,
                    error: { code: 'PGRSTX', message: `nieoczekiwany select: ${cols}` },
                };
                const chain = {
                    eq: () => chain,
                    maybeSingle: async () => resp,
                };
                return chain;
            },
        }),
    } as unknown as SupabaseClient;
}

const OK_Z_EPOKA = 'totp_enabled, mfa_epoch';
const OK_LEGACY = 'totp_enabled';
const BRAK_KOLUMNY = { code: '42703', message: 'column employees.mfa_epoch does not exist' };

describe('readMfaGate', () => {
    it('po wgranej migracji czyta 2FA i epokę jednym zapytaniem', async () => {
        const calls: string[] = [];
        const gate = await readMfaGate(
            fakeClient({ [OK_Z_EPOKA]: { data: { totp_enabled: true, mfa_epoch: 3 }, error: null } }, calls),
            'u1',
        );
        expect(gate).toEqual({ totpEnabled: true, epoch: 3, ok: true });
        expect(calls).toEqual([OK_Z_EPOKA]); // jedno zapytanie, nie dwa
    });

    it('🔴 przed migracją NIE GUBI totp_enabled — inaczej bramka 2FA przestaje działać', async () => {
        const calls: string[] = [];
        const gate = await readMfaGate(
            fakeClient(
                {
                    [OK_Z_EPOKA]: { data: null, error: BRAK_KOLUMNY },
                    [OK_LEGACY]: { data: { totp_enabled: true }, error: null },
                },
                calls,
            ),
            'u1',
        );
        expect(gate.totpEnabled, 'pracownik z 2FA wyszedł jako bez 2FA → bramka przepuszcza').toBe(true);
        expect(gate.epoch).toBe(0);
        expect(gate.ok).toBe(true);
        expect(calls).toEqual([OK_Z_EPOKA, OK_LEGACY]); // był fallback
    });

    it('konto bez wiersza pracownika → ok:false, bez 2FA', async () => {
        const calls: string[] = [];
        const gate = await readMfaGate(
            fakeClient({ [OK_Z_EPOKA]: { data: null, error: null } }, calls),
            'u1',
        );
        expect(gate).toEqual({ totpEnabled: false, epoch: 0, ok: false });
    });

    it('awaria bazy jest ODRÓŻNIALNA (ok:false), a nie udaje konta bez 2FA', async () => {
        // enforce2FA zachowuje tu dotychczasowy fail-open (osobna decyzja właściciela),
        // ale wołający MUSI mieć czym odróżnić awarię od stanu faktycznego.
        const calls: string[] = [];
        const gate = await readMfaGate(
            fakeClient({ [OK_Z_EPOKA]: { data: null, error: { code: '08006', message: 'connection failure' } } }, calls),
            'u1',
        );
        expect(gate.ok).toBe(false);
        expect(calls).toEqual([OK_Z_EPOKA]); // fallback TYLKO dla 42703
    });

    it('brak pola mfa_epoch w wierszu liczy się jako epoka 0', async () => {
        const calls: string[] = [];
        const gate = await readMfaGate(
            fakeClient({ [OK_Z_EPOKA]: { data: { totp_enabled: false }, error: null } }, calls),
            'u1',
        );
        expect(gate.epoch).toBe(0);
    });
});
