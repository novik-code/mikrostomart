/**
 * Usunięcie passkeya UNIEWAŻNIA sesje MFA, które ten passkey wystawił.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * `passkeys/authenticate/finish` wystawia z passkeya pełne `mfa_session` — 8 h,
 * a przy „Zaufaj temu urządzeniu" 30 dni. Usunięcie klucza kasowało wiersz
 * w `employee_passkeys` i NIC WIĘCEJ: żywe sesje wystawione tym kluczem
 * działały dalej. Czyli reakcja na kradzież telefonu („wchodzę i usuwam klucz")
 * była kosmetyką — złodziej pracował dalej na sesji sprzed usunięcia.
 *
 * Reguła jest spisana wprost przy `removeDevice` w `twoFactorService.ts`:
 * odebranie czynnika ⇒ epoka rośnie ⇒ stare sesje padają (migracja 191).
 * Objęła urządzenia TOTP i ominęła passkeye — ta sama klasa błędu, co
 * „naprawiliśmy jedną trasę z pary", w tym projekcie policzona już siedem razy.
 *
 * ══ DLACZEGO OSOBNY PLIK ════════════════════════════════════════════════════
 * `passkeyRegisterProof.test.ts` mockuje CAŁY `@/lib/passkeyService`, więc nie
 * potrafi zobaczyć, co ten serwis realnie robi. Tutaj serwis jest PRAWDZIWY,
 * a zamockowane są tylko jego zależności (klient Supabase i moduł epoki).
 * Test wykonuje `removePasskey` i sprawdza SKUTEK, nie obecność napisu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const bumpMfaEpochMock = vi.fn().mockResolvedValue(true);
const deleteEqMock = vi.fn();

/** Minimalna atrapa łańcucha PostgREST używanego przez `removePasskey`. */
function makeSupabase(opts: { employee: { id: string } | null; delError: unknown }) {
    return {
        from: (tabela: string) => {
            if (tabela === 'employees') {
                return {
                    select: () => ({
                        eq: () => ({ maybeSingle: async () => ({ data: opts.employee }) }),
                    }),
                };
            }
            // employee_passkeys — delete().eq().eq()
            return {
                delete: () => ({
                    eq: () => ({
                        eq: async (...a: unknown[]) => {
                            deleteEqMock(...a);
                            return { error: opts.delError };
                        },
                    }),
                }),
            };
        },
    };
}

let supabaseStub = makeSupabase({ employee: { id: 'emp-1' }, delError: null });

// 🪤 `passkeyService` tworzy klienta RAZ, przy ładowaniu modułu. Gdyby atrapa
// zwracała `supabaseStub` wprost, moduł zapamiętałby obiekt z PIERWSZEGO testu
// i podmiana w kolejnych nie miałaby żadnego skutku — kontrole negatywne
// przechodziłyby przez przypadek, mierząc ciągle ten sam, udany scenariusz.
// Dlatego zwracamy stały obiekt, który deleguje LENIWIE.
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (tabela: string) => supabaseStub.from(tabela) }),
}));
vi.mock('@/lib/mfaEpoch', () => ({
    bumpMfaEpoch: (...a: unknown[]) => bumpMfaEpochMock(...a),
    getMfaEpoch: vi.fn().mockResolvedValue(0),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
    vi.clearAllMocks();
    bumpMfaEpochMock.mockResolvedValue(true);
    supabaseStub = makeSupabase({ employee: { id: 'emp-1' }, delError: null });
});

describe('removePasskey unieważnia sesje MFA', () => {
    it('po udanym usunięciu inkrementuje epokę', async () => {
        const { removePasskey } = await import('@/lib/passkeyService');
        const res = await removePasskey(USER_ID, 'pk-1');
        expect(res.ok).toBe(true);
        expect(bumpMfaEpochMock).toHaveBeenCalledTimes(1);
        expect(bumpMfaEpochMock.mock.calls[0][0]).toBe(USER_ID);
    });

    it('KONTROLA NEGATYWNA: gdy usunięcie PADŁO, epoki NIE ruszamy', async () => {
        // Podbicie epoki przy nieudanym DELETE wylogowałoby człowieka z sesji MFA,
        // choć jego klucz dalej istnieje — kara bez powodu.
        supabaseStub = makeSupabase({ employee: { id: 'emp-1' }, delError: { message: 'boom' } });
        const { removePasskey } = await import('@/lib/passkeyService');
        const res = await removePasskey(USER_ID, 'pk-1');
        expect(res.ok).toBe(false);
        expect(bumpMfaEpochMock).not.toHaveBeenCalled();
    });

    it('KONTROLA NEGATYWNA: gdy nie ma pracownika, epoki NIE ruszamy', async () => {
        supabaseStub = makeSupabase({ employee: null, delError: null });
        const { removePasskey } = await import('@/lib/passkeyService');
        const res = await removePasskey(USER_ID, 'pk-1');
        expect(res.ok).toBe(false);
        expect(bumpMfaEpochMock).not.toHaveBeenCalled();
    });
});
