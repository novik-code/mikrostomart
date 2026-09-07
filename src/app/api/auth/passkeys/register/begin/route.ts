import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { deriveRpConfig, generateRegistration } from '@/lib/passkeyService';
import { setChallengeCookie } from '@/lib/passkeyChallenge';
import { requireFactorProofIfEnabled } from '@/lib/mfaProof';

export const dynamic = 'force-dynamic';

function getOriginFromRequest(request: NextRequest): string {
    const host = request.headers.get('host') || 'localhost';
    const proto = request.headers.get('x-forwarded-proto') ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
}

/**
 * POST /api/auth/passkeys/register/begin
 *
 * Inicjuje rejestrację nowego passkey (FaceID/TouchID/Windows Hello/security key).
 * Wymaga Supabase auth (user zalogowany — robi passkey add z poziomu security page).
 *
 * Body: { deviceName: string }
 *
 * Returns: { ok: true, options: WebAuthn registration options } — klient przekazuje
 * to do `navigator.credentials.create()` na poprzedzającym await dla browser API.
 *
 * Side effect: sets passkey_challenge httpOnly cookie z challenge + userId + type.
 * Cookie jest weryfikowane w /finish.
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const email = auth.user.email;
    if (!email) {
        return NextResponse.json({ error: 'user_has_no_email' }, { status: 400 });
    }

    let body: { deviceName?: string; code?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.deviceName || typeof body.deviceName !== 'string') {
        return NextResponse.json({ error: 'device_name_required' }, { status: 400 });
    }

    // 🔒 P-002 — passkey jest PEŁNOPRAWNYM drugim składnikiem: z zarejestrowanego
    // klucza `passkeys/authenticate/finish` wystawia `mfa_session`. Konto, które MA
    // już 2FA, nie może dopisać kolejnego czynnika na podstawie samego hasła —
    // dokładnie ta sama reguła, którą urządzenia TOTP dostały w `6f804f6`.
    //
    // 🪤 Dowód stoi PRZED `generateRegistration` i PRZED `setChallengeCookie`:
    // odmowa nie może wystawić podpisanego ciasteczka challenge ani ruszać bazy.
    // Ciasteczko `passkey_challenge` było wektorem P-008 — im mniej sposobów na
    // jego wymintowanie, tym lepiej.
    //
    // 🪤 Dowodu żąda WYŁĄCZNIE `begin`, nigdy `finish`. `finish` wymaga ważnego,
    // podpisanego HMAC-em i związanego z użytkownikiem ciasteczka challenge
    // (`challenge_user_mismatch`), które potrafi wystawić tylko `begin` — czyli
    // ceremonia jest już zabezpieczona u wejścia. Żądanie kodu w obu krokach
    // ZUŻYŁOBY kod zapasowy dwa razy i druga weryfikacja zawsze by padała.
    const odmowa = await requireFactorProofIfEnabled(request, auth.user.id, body.code);
    if (odmowa) return odmowa;

    const rpConfig = deriveRpConfig(getOriginFromRequest(request));
    const result = await generateRegistration(auth.user.id, email, body.deviceName, rpConfig);

    if (!result.ok) {
        const status = result.error === 'employee_not_found' ? 404
            : result.error === 'device_name_taken' ? 409
            : result.error === 'device_name_required' ? 400
            : result.error === 'max_passkeys_reached' ? 409
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    await setChallengeCookie({
        userId: auth.user.id,
        challenge: result.challenge,
        type: 'register',
    });

    return NextResponse.json({ ok: true, options: result.options });
}
