import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { deriveRpConfig, verifyRegistration } from '@/lib/passkeyService';
import { getChallengeCookie, clearChallengeCookie } from '@/lib/passkeyChallenge';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

function getOriginFromRequest(request: NextRequest): string {
    const host = request.headers.get('host') || 'localhost';
    const proto = request.headers.get('x-forwarded-proto') ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
}

/**
 * POST /api/auth/passkeys/register/finish
 *
 * Finalizuje rejestrację po `navigator.credentials.create()` po stronie klienta.
 *
 * Body: { deviceName: string, response: RegistrationResponseJSON }
 *
 * Process:
 *  1. Czyta challenge cookie (set w /begin) — verify HMAC + type='register' + not expired
 *  2. Verify że attestation response klienta matches challenge + origin + rpID
 *  3. Zapisuje credential w employee_passkeys
 *  4. Clear challenge cookie (jednorazowe)
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { deviceName?: string; response?: RegistrationResponseJSON };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.deviceName || typeof body.deviceName !== 'string') {
        return NextResponse.json({ error: 'device_name_required' }, { status: 400 });
    }
    if (!body.response || typeof body.response !== 'object') {
        return NextResponse.json({ error: 'response_required' }, { status: 400 });
    }

    // Read + verify challenge cookie
    const challengeData = await getChallengeCookie('register');
    if (!challengeData) {
        return NextResponse.json({ error: 'challenge_expired_or_invalid' }, { status: 400 });
    }

    // Defense: challenge cookie userId musi matchować zalogowanego usera
    if (challengeData.userId !== auth.user.id) {
        await clearChallengeCookie();
        return NextResponse.json({ error: 'challenge_user_mismatch' }, { status: 400 });
    }

    const rpConfig = deriveRpConfig(getOriginFromRequest(request));
    const result = await verifyRegistration(
        auth.user.id,
        body.deviceName,
        body.response,
        challengeData.challenge,
        rpConfig
    );

    // Always clear challenge after attempt (one-shot)
    await clearChallengeCookie();

    if (!result.ok) {
        const status = result.error === 'verification_failed' ? 400
            : result.error === 'device_name_taken' ? 409
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
}
