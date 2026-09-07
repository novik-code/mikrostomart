/**
 * Parametry ceremonii WebAuthn pochodzą z ALLOW-LISTY, nie z nagłówka `Host`.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * Cztery trasy passkeys miały własną kopię `getOriginFromRequest`, która
 * sklejała origin z nagłówka `Host` PRZYSŁANEGO PRZEZ KLIENTA. Dla hosta spoza
 * dwóch zaszytych domen `deriveRpConfig` promowała tę wartość na `rpID`
 * i `expectedOrigin` — czyli na parametry, które decydują, DLA JAKIEJ DOMENY
 * klucz jest ważny. Ta sama klasa co `getClientIP` czytający `x-forwarded-for`:
 * parametr bezpieczeństwa brany od tego, przed kim ma chronić.
 *
 * ⚠️ Waga po naprawie P-002 jest niższa, niż była: rejestracja passkeya wymaga
 * dziś dowodu drugiego składnika, więc konto z włączonym 2FA jest zamknięte
 * także tą drogą. To jest warstwa druga, nie jedyna.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// passkeyService tworzy klienta Supabase przy ładowaniu modułu — tu go nie używamy.
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => ({}) }) }));
vi.mock('@/lib/mfaEpoch', () => ({ bumpMfaEpoch: async () => true, getMfaEpoch: async () => 0 }));
import { dozwolonyOriginWebAuthn } from '../passkeyService';

beforeEach(() => {
    delete process.env.PASSKEY_EXTRA_ORIGINS;
});

describe('allow-lista origin dla WebAuthn', () => {
    it.each([
        ['www.mikrostomart.pl', 'https://www.mikrostomart.pl'],
        ['mikrostomart.pl', 'https://mikrostomart.pl'],
        ['demo.densflow.ai', 'https://demo.densflow.ai'],
        ['WWW.MIKROSTOMART.PL', 'https://www.mikrostomart.pl'],
    ])('%s → %s', (host, oczekiwany) => {
        expect(dozwolonyOriginWebAuthn(host)).toBe(oczekiwany);
    });

    it('localhost działa dla developmentu', () => {
        expect(dozwolonyOriginWebAuthn('localhost:3000')).toBe('http://localhost:3000');
    });
});

describe('host spoza allow-listy jest ODRZUCANY, nie promowany na RP', () => {
    it.each([
        'zlosliwy.example',
        'mikrostomart.pl.zlosliwy.example',   // 🪤 sufiks, nie nasza domena
        'podglad-abc123.vercel.app',
        'notmikrostomart.pl',
        '',
    ])('%s → null', (host) => {
        expect(dozwolonyOriginWebAuthn(host)).toBeNull();
    });

    it('brak nagłówka → null', () => {
        expect(dozwolonyOriginWebAuthn(null)).toBeNull();
    });
});

describe('furtka na podglądy jest JAWNA i wymaga konfiguracji', () => {
    it('domena z PASSKEY_EXTRA_ORIGINS przechodzi', () => {
        process.env.PASSKEY_EXTRA_ORIGINS = 'podglad-abc123.vercel.app';
        expect(dozwolonyOriginWebAuthn('podglad-abc123.vercel.app'))
            .toBe('https://podglad-abc123.vercel.app');
    });

    it('pusta zmienna niczego nie otwiera', () => {
        // 🪤 Pusty split daje [''] — bez odsiania pustych ciągów host '' przechodziłby.
        process.env.PASSKEY_EXTRA_ORIGINS = '';
        expect(dozwolonyOriginWebAuthn('cokolwiek.example')).toBeNull();
    });
});
