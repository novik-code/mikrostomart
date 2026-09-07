import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { deriveRpConfig, dozwolonyOriginWebAuthn, verifyRegistration } from '@/lib/passkeyService';
import { getChallengeCookie, clearChallengeCookie } from '@/lib/passkeyChallenge';
import { logAudit } from '@/lib/auditLog';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';


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

    // 🔒 Origin ceremonii z ALLOW-LISTY, nie z nagłówka `Host` od klienta.
    const origin = dozwolonyOriginWebAuthn(request.headers.get('host'));
    if (!origin) {
        return NextResponse.json({ error: 'unsupported_origin' }, { status: 400 });
    }
    const rpConfig = deriveRpConfig(origin);
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

    // Zapis NOWEGO drugiego składnika musi zostawiać ślad — bez tego nie da się
    // odpowiedzieć na pytanie „kto dopisał ten klucz", a to pierwsze pytanie
    // przy podejrzeniu przejęcia konta.
    await logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email ?? '',
        action: 'passkey_registered',
        resourceType: 'passkey',
        metadata: { deviceName: body.deviceName },
        request,
    });

    return NextResponse.json({ ok: true });
}
