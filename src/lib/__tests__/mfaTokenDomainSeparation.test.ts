/**
 * P-008 — STRAŻNIK ROZDZIAŁU DOMEN TOKENÓW PODPISANYCH `MFA_SESSION_SECRET`.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * Przed naprawą `verifyMfaSessionToken` uznawał za sesję MFA KAŻDY blob
 * podpisany tym sekretem, który miał `userId: string` i `expiresAt: number`
 * w przyszłości. Ciasteczko `passkey_challenge` ({userId, challenge, type,
 * expiresAt}) spełnia oba warunki, ma ten sam format i ten sam sekret.
 *
 * Ścieżka, którą to zamyka: napastnik ze znanym HASŁEM pracownika (bez 2FA)
 * woła `POST /api/auth/passkeys/register/begin` — trasa stoi poza bramką 2FA
 * i sprawdza samą rolę — odczytuje z własnej przeglądarki wartość ciasteczka
 * `passkey_challenge` i przedstawia ją jako `mfa_session` / `x-mfa-session`.
 * Przechodzi wtedy przez middleware, `evaluateStaffMfa` i `hasCurrentFactorProof`
 * w `/api/auth/2fa/devices`, gdzie dopina sobie WŁASNE urządzenie TOTP.
 * Zmierzone wykonaniem 2026-09-07: przy `mfa_epoch = 0` (produkcja: 0 z 18
 * pracowników ma epokę > 0) podrobiony blob zwracał `{userId, epoch: 0}`.
 *
 * ══ DLACZEGO TAK, A NIE GREPEM ══════════════════════════════════════════════
 * Ten strażnik NIE mockuje `passkeyChallenge` ani `mfaSession`. Woła PRAWDZIWY
 * `setChallengeCookie`, wyjmuje PRAWDZIWĄ wartość ciasteczka i podaje ją
 * PRAWDZIWEMU `verifyMfaSessionToken`. Gdyby którykolwiek z tych modułów był
 * zamockowany, test przechodziłby przy zdjętej ochronie — w tym projekcie
 * strażnik asertujący nazwę świecił zielono przy wyłączonej ochronie trzy razy.
 *
 * ══ BIAŁA, NIE CZARNA LISTA ═════════════════════════════════════════════════
 * Karta audytu proponowała odrzucanie payloadu z polem `challenge` albo `type`.
 * To czarna lista dwóch znanych nazw — nie chroni przed NASTĘPNĄ domeną, która
 * zacznie podpisywać tym sekretem. Przypadek „nieznane pole" niżej wymusza
 * białą listę kluczy i pada, jeśli ktoś wróci do czarnej.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

// Jedyna atrapa: magazyn ciasteczek Next. Oba moduły kryptograficzne są PRAWDZIWE.
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
        set: (name: string, value: string) => { jar.set(name, value); },
    }),
}));

import { setChallengeCookie } from '../passkeyChallenge';
import { createMfaSessionToken, verifyMfaSessionToken } from '../mfaSession';
import { signRegistrationToken } from '../registrationToken';

beforeAll(() => {
    process.env.MFA_SESSION_SECRET = 'a'.repeat(64);
});
beforeEach(() => {
    jar.clear();
});

/** Wyjmuje surową wartość ciasteczka wystawioną przez prawdziwy kod passkeya. */
async function mintChallengeCookie(userId: string, type: 'register' | 'authenticate') {
    await setChallengeCookie({ userId, challenge: 'losowy-challenge-webauthn', type });
    const token = jar.get('passkey_challenge');
    expect(token, 'setChallengeCookie miało wystawić ciasteczko').toBeTruthy();
    return token as string;
}

describe('P-008: ciasteczko passkey_challenge NIE jest dowodem sesji MFA', () => {
    it('kontrola pozytywna: podrobiony blob jest POPRAWNIE PODPISANY tym samym sekretem', async () => {
        // Gdyby ten przypadek padł, cały strażnik byłby bezwartościowy — mierzyłby
        // odrzucenie złego podpisu, a nie rozdział domen.
        const token = await mintChallengeCookie('EMP-42', 'register');
        const [encoded, signature] = token.split('.');
        expect(signature, 'format ma być <payload>.<hmac>').toBeTruthy();
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        expect(payload.userId).toBe('EMP-42');
        expect(typeof payload.expiresAt).toBe('number');
        expect(payload.expiresAt).toBeGreaterThan(Date.now());
        // …czyli spełnia DOKŁADNIE te warunki, które przed naprawą wystarczały.
    });

    it('token z /register/begin jest odrzucany jako sesja MFA (epoka 0)', async () => {
        const token = await mintChallengeCookie('EMP-42', 'register');
        expect(verifyMfaSessionToken(token, 0)).toBeNull();
    });

    it('token z /register/begin jest odrzucany także bez podanej epoki', async () => {
        // Tor bez epoki to ścieżka sprzed migracji 191 — musi odrzucać tak samo.
        const token = await mintChallengeCookie('EMP-42', 'register');
        expect(verifyMfaSessionToken(token)).toBeNull();
    });

    it('token z /authenticate/begin też jest odrzucany (DRUGI minter, spoza karty)', async () => {
        // Karta wymieniała tylko register/begin. Mintery są dwa — naprawa
        // w weryfikatorze zamyka oba, ale bez tego przypadku nikt by tego nie wiedział.
        const token = await mintChallengeCookie('EMP-42', 'authenticate');
        expect(verifyMfaSessionToken(token, 0)).toBeNull();
        expect(verifyMfaSessionToken(token)).toBeNull();
    });
});

describe('P-008: biała lista kluczy, nie czarna lista dwóch nazw', () => {
    /** Podpisuje dowolny payload tym samym sekretem, co produkcyjny minter. */
    function podpisz(payload: object): string {
        const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const sig = crypto.createHmac('sha256', process.env.MFA_SESSION_SECRET as string)
            .update(encoded).digest('base64url');
        return `${encoded}.${sig}`;
    }

    it('odrzuca payload z NIEZNANYM polem, choć ma userId i expiresAt', () => {
        // Ten przypadek pada, jeśli ktoś zaimplementuje czarną listę
        // ('challenge' in payload || 'type' in payload) zamiast białej listy kluczy.
        const token = podpisz({ userId: 'EMP-9', expiresAt: Date.now() + 60_000, cosNowego: 'x' });
        expect(verifyMfaSessionToken(token, 0)).toBeNull();
    });

    it('odrzuca token rejestracji pacjenta (ta sama rodzina, ten sam sekret)', () => {
        // Dziś niewykorzystywalny (brak userId), ale weryfikator też nie ma znacznika
        // celu — gdyby ładunek kiedykolwiek zyskał userId, otworzyłby się natychmiast.
        const token = signRegistrationToken({
            prodentisId: '123456', phone: '+48570810800',
            firstName: 'Jan', lastName: 'Kowalski',
        });
        expect(verifyMfaSessionToken(token, 0)).toBeNull();
    });
});

describe('P-008: kontrola negatywna — legalna sesja MFA działa dalej', () => {
    it('token wystawiony przez createMfaSessionToken nadal przechodzi', () => {
        // Gdyby naprawa była zbyt szeroka, TEN przypadek wylogowałby cały zespół.
        const token = createMfaSessionToken('EMP-1');
        expect(verifyMfaSessionToken(token)?.userId).toBe('EMP-1');
        expect(verifyMfaSessionToken(token, 0)?.userId).toBe('EMP-1');
    });

    it('legalny token z epoką przechodzi i niesie swoją epokę', () => {
        const token = createMfaSessionToken('EMP-1', false, 3);
        expect(verifyMfaSessionToken(token, 3)).toEqual({ userId: 'EMP-1', epoch: 3 });
    });

    it('legalny token z „zaufaj urządzeniu" (30 dni) przechodzi', () => {
        const token = createMfaSessionToken('EMP-1', true, 0);
        expect(verifyMfaSessionToken(token, 0)?.userId).toBe('EMP-1');
    });

    it('unieważnienie epoką działa jak dotąd', () => {
        const token = createMfaSessionToken('EMP-1', false, 1);
        expect(verifyMfaSessionToken(token, 2)).toBeNull();
    });
});
