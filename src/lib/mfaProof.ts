import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { MFA_COOKIE_NAME, verifyMfaSessionToken } from '@/lib/mfaSession';
import { readMfaEpochForVerification } from '@/lib/mfaEpoch';
import {
    getTwoFactorStatus,
    verifyChallenge,
    verifyBackupChallenge,
    MFA_RATE_LIMITED,
    MFA_ATTEMPT_WINDOW_MS,
    MFA_DATABASE_ERROR,
} from '@/lib/twoFactorService';

/**
 * DOWÓD POSIADANIA AKTUALNEGO DRUGIEGO SKŁADNIKA — jedno miejsce dla wszystkich
 * tras, które ZMIENIAJĄ zestaw czynników uwierzytelniających.
 *
 * 🔒 Powód istnienia: `/api/auth/2fa/` i `/api/auth/passkeys/` stoją poza bramką
 * 2FA (pierwsze w `SKIP_2FA_PATHS`, drugie poza `PROTECTED_PREFIXES`) — inaczej
 * powstałoby zakleszczenie: bez drugiego składnika nie dałoby się go
 * skonfigurować. Skoro middleware tam nie wchodzi, dowód musi egzekwować
 * sama trasa. Ten moduł jest tym egzekwowaniem.
 *
 * 🪤 Funkcja mieszkała wcześniej lokalnie w `api/auth/2fa/devices/route.ts`
 * i dlatego objęła TYLKO urządzenia TOTP. Rejestracja passkeya — czyli zapis
 * równorzędnego czynnika, z którego `passkeys/authenticate/finish` wystawia
 * pełne `mfa_session` — została poza nią (P-002). Wydzielenie tutaj jest po to,
 * żeby następna trasa dotykająca czynników nie musiała tego wymyślać od nowa.
 *
 * Akceptujemy trzy dowody, w tej kolejności:
 *   1. ważną sesję MFA — nagłówek `X-MFA-Session` (apka) albo cookie (web),
 *   2. kod TOTP z któregokolwiek AKTYWNEGO urządzenia,
 *   3. kod zapasowy (jednorazowy — zużywa się przy weryfikacji).
 */
export type FactorProof =
    | { ok: true }
    | { ok: false; reason: 'proof_required' }
    | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number }
    | { ok: false; reason: 'unavailable' };

/** Kod TOTP to dokładnie sześć cyfr; kod zapasowy ma kształt `XXXXX-XXXXX`. */
const WZOR_TOTP = /^\d{6}$/;

export async function hasCurrentFactorProof(
    request: Request,
    userId: string,
    code?: string,
): Promise<FactorProof> {
    // Epoka unieważnień (migracja 191) — sesja MFA sprzed resetu 2FA NIE jest
    // dowodem posiadania czynnika. Bez tego argumentu złodziej ze starym
    // tokenem dodałby sobie nowy czynnik i odzyskał konto po resecie.
    //
    // 🔴 FAIL-CLOSED przy padniętym odczycie (decyzja właściciela 2026-09-07).
    // Wcześniej epoka wracała jako 0, a porównanie brzmi `tokenEpoch < expectedEpoch`
    // — więc epoka 0 przyjmowała token o KAŻDEJ epoce. Awaria bazy OŻYWIAŁA
    // token unieważniony resetem 2FA, i to akurat na trasach, które dopisują
    // albo zdejmują drugi składnik.
    const { epoch, readFailed } = await readMfaEpochForVerification(userId);
    if (readFailed) return { ok: false, reason: 'unavailable' };

    const header = request.headers.get('x-mfa-session') ?? undefined;
    if (verifyMfaSessionToken(header, epoch)?.userId === userId) return { ok: true };

    const cookie = (await cookies()).get(MFA_COOKIE_NAME)?.value;
    if (verifyMfaSessionToken(cookie, epoch)?.userId === userId) return { ok: true };

    // 🪤 NORMALIZUJEMY TAK SAMO, JAK ROBI TO WERYFIKATOR. Wcześniej stało tu `.trim()`,
    // czyli router kształtu był STRICTSZY niż `verifyCodeStep`, który usuwa WSZYSTKIE
    // białe znaki. Kod „123 456" — a tak wyświetla go część aplikacji authenticator
    // i tak wklejają go ludzie — nie przechodził przez `/^\d{6}$/`, więc trafiał do
    // weryfikatora kodów ZAPASOWYCH i palił kubełek `mfa:backup` (5/15 min), WSPÓLNY
    // z logowaniem kodem zapasowym. Pięć takich pomyłek zabierało drogę ratunku.
    const trimmed = typeof code === 'string' ? code.replace(/\s+/g, '') : '';
    if (!trimmed) return { ok: false, reason: 'proof_required' };

    // 🪤 P-076 — KIERUJEMY KOD DO JEDNEGO WERYFIKATORA, NIE DO OBU.
    // Wcześniej błędny kod szedł najpierw do TOTP, a potem i tak do weryfikacji
    // kodu zapasowego, więc JEDNA pomyłka paliła DWA kubełki. Kubełek
    // `mfa:backup` (5/15 min) jest WSPÓLNY z logowaniem kodem zapasowym, więc
    // pięć pomyłek przy dodawaniu urządzenia zabierało drogę ratunku przy
    // logowaniu. Kształty są rozłączne, więc kierowanie po kształcie niczego
    // nie traci: sześć cyfr nigdy nie jest kodem zapasowym i odwrotnie.
    const wynik = WZOR_TOTP.test(trimmed)
        ? await verifyChallenge(userId, trimmed)
        : await verifyBackupChallenge(userId, trimmed);

    if (wynik.ok) return { ok: true };

    // 🔒 Awaria bazy NIE może wracać jako „nie podałeś dowodu". Odczyt epoki wyżej
    // łapie awarię CAŁKOWITĄ, ale awaria CZĄSTKOWA (odczyty żyją, zapis pada — baza
    // w trybie read-only, statement timeout, wyczerpana pula) przechodzi tamtędy
    // i dociera dopiero tutaj. Bez tej gałęzi człowiek widziałby „popraw dowód"
    // i wpisywał kolejne POPRAWNE kody aż do zadławienia.
    if (wynik.error === MFA_DATABASE_ERROR) {
        return { ok: false, reason: 'unavailable' };
    }

    // Zadławienie MUSI być odróżnialne od złego kodu — inaczej człowiek wpisuje
    // kolejne poprawne kody, dostaje „brak dowodu" i nie wie, że ma poczekać.
    if (wynik.error === MFA_RATE_LIMITED) {
        return {
            ok: false,
            reason: 'rate_limited',
            retryAfterSeconds: Math.ceil(MFA_ATTEMPT_WINDOW_MS / 1000),
        };
    }
    return { ok: false, reason: 'proof_required' };
}

/**
 * Bramka dla tras zmieniających zestaw czynników.
 * Zwraca `null`, gdy wolno przejść, albo gotową odpowiedź odmowną.
 *
 * FAIL-CLOSED: `getTwoFactorStatus` zwraca `null` zarówno gdy pracownika nie ma,
 * jak i gdy zapytanie do bazy padnie (supabase-js nie rzuca wyjątku).
 * `status?.enabled` byłoby wtedy `undefined` i kontrola zostałaby POMINIĘTA —
 * czyli błąd bazy otwierałby dziurę z powrotem. Nie potrafimy ustalić stanu
 * ⇒ wymagamy dowodu.
 *
 * Konto BEZ włączonego 2FA przechodzi bez dowodu — to bootstrap pierwszego
 * czynnika i musi działać, inaczej powstaje zakleszczenie.
 */
export async function requireFactorProofIfEnabled(
    request: Request,
    userId: string,
    code?: string,
): Promise<NextResponse | null> {
    const status = await getTwoFactorStatus(userId);
    if (!(status === null || status.enabled)) return null;

    const proof = await hasCurrentFactorProof(request, userId, code);
    if (proof.ok) return null;

    if (proof.reason === 'unavailable') {
        return NextResponse.json(
            { error: 'mfa_check_unavailable' },
            { status: 503, headers: { 'Retry-After': '30' } },
        );
    }
    if (proof.reason === 'rate_limited') {
        return NextResponse.json(
            { error: MFA_RATE_LIMITED },
            { status: 429, headers: { 'Retry-After': String(proof.retryAfterSeconds) } },
        );
    }
    return NextResponse.json({ error: 'proof_required' }, { status: 403 });
}
