/**
 * PODPISANY `state` DLA OAUTH (P-038).
 *
 * 🔴 PO CO. `GET /api/employee/calendar/auth/callback` dostawał w `state` GOŁY `user.id`
 * i sprawdzał go wyłącznie na NIEPUSTOŚĆ — a tokeny z `code` zapisywał pod tożsamością
 * z cookie. `state` nie był więc z niczym wiązany. Ponieważ callback bez sesji nie zużywa
 * kodu, a cookie Supabase ma `SameSite=Lax`, napastnik mógł wygenerować własny `code`
 * i podsunąć zalogowanemu pracownikowi link: JEGO konto Google podpinało się do konta
 * OFIARY (login-CSRF / account binding). Asystent tworzył potem w cudzym kalendarzu
 * wydarzenia z nazwiskiem pacjenta, a interfejs pokazywał tylko „połączono".
 *
 * 🔑 CO DAJE PODPIS: `state` niesie tożsamość, chwilę powstania i losowy element, a HMAC
 * dowodzi, że wyszedł OD NAS. Callback odrzuca podpis nieswój, przeterminowany
 * i — najważniejsze — taki, którego tożsamość nie zgadza się z sesją.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const WAZNOSC_MS = 10 * 60_000;

function sekret(): string {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('Brak JWT_SECRET — nie da się podpisać state OAuth');
    return s;
}

const podpisz = (ladunek: string) =>
    createHmac('sha256', sekret()).update(ladunek).digest('base64url');

/** `state` = `<userId>.<znacznik>.<losowe>.<podpis>`; kropka nie występuje w base64url. */
export function utworzStateOauth(userId: string): string {
    const ladunek = `${Buffer.from(userId).toString('base64url')}.${Date.now()}.${randomBytes(9).toString('base64url')}`;
    return `${ladunek}.${podpisz(ladunek)}`;
}

/**
 * Zwraca `userId` ze `state`, gdy podpis jest nasz i nie wygasł — albo `null`.
 * 🪤 Porównanie podpisu w stałym czasie: `===` na napisach wycieka pozycję pierwszej
 * różnicy, a to jedyne miejsce, w którym porównujemy sekret z wartością od klienta.
 */
export function odczytajStateOauth(state: string | null): string | null {
    if (!state) return null;
    const czesci = state.split('.');
    if (czesci.length !== 4) return null;

    const [idB64, znacznik, losowe, podpis] = czesci;
    const oczekiwany = podpisz(`${idB64}.${znacznik}.${losowe}`);

    const a = Buffer.from(podpis);
    const b = Buffer.from(oczekiwany);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const ts = Number(znacznik);
    if (!Number.isFinite(ts) || Date.now() - ts > WAZNOSC_MS || ts > Date.now() + 60_000) return null;

    try {
        return Buffer.from(idB64, 'base64url').toString('utf8') || null;
    } catch {
        return null;
    }
}
