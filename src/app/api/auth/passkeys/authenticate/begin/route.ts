import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { deriveRpConfig, dozwolonyOriginWebAuthn, generateAuthentication } from '@/lib/passkeyService';
import { setChallengeCookie } from '@/lib/passkeyChallenge';

export const dynamic = 'force-dynamic';


/**
 * POST /api/auth/passkeys/authenticate/begin
 *
 * Inicjuje authentication flow z passkey jako alternatywa dla TOTP code.
 * Wymaga Supabase auth (user już zalogowany hasłem, czeka na 2FA).
 *
 * Returns: { ok: true, options: WebAuthn authentication options }
 *   Lub:  { error: 'no_passkeys' } gdy user nie ma żadnego passkey zarejestrowanego
 *         (UI wraca do TOTP input).
 *
 * Side effect: sets passkey_challenge httpOnly cookie.
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    // 🔒 Origin ceremonii z ALLOW-LISTY, nie z nagłówka `Host` od klienta.
    const origin = dozwolonyOriginWebAuthn(request.headers.get('host'));
    if (!origin) {
        return NextResponse.json({ error: 'unsupported_origin' }, { status: 400 });
    }
    const rpConfig = deriveRpConfig(origin);
    const result = await generateAuthentication(auth.user.id, rpConfig);

    if (!result.ok) {
        const status = result.error === 'employee_not_found' ? 404
            : result.error === 'no_passkeys' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    await setChallengeCookie({
        userId: auth.user.id,
        challenge: result.challenge,
        type: 'authenticate',
    });

    return NextResponse.json({ ok: true, options: result.options });
}
