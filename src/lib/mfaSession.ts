import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getMfaEpoch } from '@/lib/mfaEpoch';

const COOKIE_NAME = 'mfa_session';
const TTL_DEFAULT_SECONDS = 8 * 60 * 60; // 8h — typical workday session
const TTL_REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30d — "Zaufaj urządzeniu" opt-in dłuższa sesja

function getSecret(): string {
    const secret = process.env.MFA_SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            '[MFA] MFA_SESSION_SECRET env var must be set (min 32 hex chars). ' +
            'Generate with: openssl rand -hex 32'
        );
    }
    return secret;
}

function sign(payload: string): string {
    return crypto
        .createHmac('sha256', getSecret())
        .update(payload)
        .digest('base64url');
}

/**
 * Create an MFA session token after successful TOTP/backup code verification.
 * Token format: <base64url(payload)>.<base64url(hmac)>
 * Payload: {userId, expiresAt, epoch}
 *
 * Stored in httpOnly cookie. Middleware checks this on each admin/employee request.
 *
 * `remember=true` wydłuża TTL z 8h na 30 dni — używane gdy user zaznaczył
 * "Zaufaj temu urządzeniu" na ekranie 2FA challenge. Trade-off: jeśli ktoś
 * fizycznie przejmie urządzenie, dostęp 30 dni bez ponownego 2FA.
 *
 * 🔒 `epoch` = `employees.mfa_epoch` z chwili wystawienia (migracja 191).
 * Odebranie drugiego składnika (reset admina, wyłączenie 2FA, usunięcie
 * aktywnego urządzenia) inkrementuje licznik w bazie i UNIEWAŻNIA ten token.
 * Do 2026-08-12 tej ochrony NIE BYŁO — reset po kradzieży telefonu nie
 * odbierał złodziejowi dostępu przez pełne 30 dni.
 *
 * 🪤 Funkcja jest CZYSTA i SYNCHRONICZNA (tak ją testujemy). Kto wystawia token
 * dla realnego człowieka, MUSI podać aktualną epokę — służy do tego
 * `mintMfaSessionToken` / `setMfaSessionCookie`, które czytają ją z bazy.
 * Wołanie `createMfaSessionToken` wprost z trasy = token z epoką 0, czyli
 * natychmiastowe odbicie do challenge'u na koncie po jakimkolwiek resecie.
 */
export function createMfaSessionToken(userId: string, remember: boolean = false, epoch: number = 0): string {
    const ttlSeconds = remember ? TTL_REMEMBER_SECONDS : TTL_DEFAULT_SECONDS;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const payload = JSON.stringify({ userId, expiresAt, epoch });
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = sign(encoded);
    return `${encoded}.${signature}`;
}

/**
 * Wystaw token sesji MFA z AKTUALNĄ epoką pracownika (jedno wejście dla tras).
 * Używa jej tor natywny (apka dostaje `mfaToken` w ciele odpowiedzi).
 */
export async function mintMfaSessionToken(userId: string, remember: boolean = false): Promise<string> {
    const epoch = await getMfaEpoch(userId);
    return createMfaSessionToken(userId, remember, epoch);
}

/**
 * Set the MFA session cookie. Call after successful 2FA verification.
 * `remember=true` ustawia cookie z TTL 30 dni zamiast standardowych 8h.
 *
 * Epoka dociągana jest TUTAJ, nie u wołającego — cztery trasy wystawiają dziś
 * sesję (challenge, verify, devices/[id]/verify, passkeys/authenticate/finish)
 * i każda z nich musiałaby o niej pamiętać osobno.
 */
export async function setMfaSessionCookie(userId: string, remember: boolean = false): Promise<void> {
    const token = await mintMfaSessionToken(userId, remember);
    const ttlSeconds = remember ? TTL_REMEMBER_SECONDS : TTL_DEFAULT_SECONDS;
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttlSeconds,
    });
}

/**
 * Clear the MFA session cookie. Call on logout or 2FA disable.
 */
export async function clearMfaSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
}

/**
 * Verify an MFA session token. Used by middleware.
 * Returns the userId if valid, null otherwise.
 *
 * Validates:
 *  1. Format (<encoded>.<signature>)
 *  2. HMAC signature (timing-safe compare)
 *  3. Expiry (must be in the future)
 *  4. Epoch — token starszy niż `expectedEpoch` jest odrzucany (unieważnienie)
 *  5. Token's userId matches the request's userId (caller checks this)
 *
 * 🪤 `expectedEpoch` jest OPCJONALNY i to nie jest niechlujstwo: bez argumentu
 * sprawdzamy tyle, co przed migracją 191. Wołający, który zna epokę z bazy
 * (middleware, `evaluateStaffMfa`, dowód przy dodawaniu urządzenia), MUSI ją
 * podać — inaczej ochrona jest martwa mimo poprawnego kodu w tym pliku.
 * Pilnuje tego `mfaEpochWiring.test.ts`.
 *
 * 🪤 Token WYSTAWIONY PRZED MIGRACJĄ nie ma pola `epoch` → liczymy go jako 0.
 * Inaczej wgranie migracji wylogowałoby cały zespół w jednej chwili.
 */
export function verifyMfaSessionToken(
    token: string | undefined,
    expectedEpoch?: number,
): { userId: string; epoch: number } | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    // Verify signature first (timing-safe)
    const expectedSig = sign(encoded);
    if (signature.length !== expectedSig.length) return null;
    try {
        const a = Buffer.from(signature, 'base64url');
        const b = Buffer.from(expectedSig, 'base64url');
        if (a.length !== b.length) return null;
        if (!crypto.timingSafeEqual(a, b)) return null;
    } catch {
        return null;
    }

    // Parse payload
    let payload: { userId?: string; expiresAt?: number; epoch?: number };
    try {
        const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
        payload = JSON.parse(decoded);
    } catch {
        return null;
    }

    if (!payload.userId || typeof payload.userId !== 'string') return null;
    if (!payload.expiresAt || typeof payload.expiresAt !== 'number') return null;
    if (payload.expiresAt < Date.now()) return null;

    const tokenEpoch = typeof payload.epoch === 'number' ? payload.epoch : 0;
    if (typeof expectedEpoch === 'number' && tokenEpoch < expectedEpoch) return null;

    return { userId: payload.userId, epoch: tokenEpoch };
}

export const MFA_COOKIE_NAME = COOKIE_NAME;
