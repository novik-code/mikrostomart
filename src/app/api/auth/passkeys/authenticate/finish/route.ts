import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { deriveRpConfig, verifyAuthentication } from '@/lib/passkeyService';
import { getChallengeCookie, clearChallengeCookie } from '@/lib/passkeyChallenge';
import { setMfaSessionCookie } from '@/lib/mfaSession';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

function getOriginFromRequest(request: NextRequest): string {
    const host = request.headers.get('host') || 'localhost';
    const proto = request.headers.get('x-forwarded-proto') ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
}

/**
 * POST /api/auth/passkeys/authenticate/finish
 *
 * Finalizuje login po `navigator.credentials.get()` na kliencie. Po pomyślnej
 * weryfikacji passkey wystawia ten sam `mfa_session` cookie co TOTP challenge —
 * middleware nie odróżnia źródła 2FA, traktuje jako pełną autoryzację.
 *
 * Body: { response: AuthenticationResponseJSON, remember?: boolean }
 *   remember=true → mfa_session TTL 30 dni (jak w TOTP challenge)
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { response?: AuthenticationResponseJSON; remember?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.response || typeof body.response !== 'object') {
        return NextResponse.json({ error: 'response_required' }, { status: 400 });
    }

    const challengeData = await getChallengeCookie('authenticate');
    if (!challengeData) {
        return NextResponse.json({ error: 'challenge_expired_or_invalid' }, { status: 400 });
    }

    if (challengeData.userId !== auth.user.id) {
        await clearChallengeCookie();
        return NextResponse.json({ error: 'challenge_user_mismatch' }, { status: 400 });
    }

    const rpConfig = deriveRpConfig(getOriginFromRequest(request));
    const result = await verifyAuthentication(
        auth.user.id,
        body.response,
        challengeData.challenge,
        rpConfig
    );

    await clearChallengeCookie();

    if (!result.ok) {
        const status = result.error === 'verification_failed' ? 400
            : result.error === 'passkey_not_found' ? 404
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    // Wystaw mfa_session — middleware już sprawdza ten cookie, nie ważne czy source
    // jest TOTP czy passkey.
    const remember = body.remember === true;
    await setMfaSessionCookie(auth.user.id, remember);

    return NextResponse.json({ ok: true });
}
