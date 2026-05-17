import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { verifyAndEnable } from '@/lib/twoFactorService';
import { setMfaSessionCookie } from '@/lib/mfaSession';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/2fa/verify
 *
 * Verifies the TOTP code submitted during initial setup and ENABLES 2FA for the user.
 * Also sets an mfa_session cookie so the user doesn't get redirected to challenge
 * immediately after completing setup.
 *
 * Body: { code: string }  // 6-digit TOTP code
 *
 * Errors:
 *   401 unauthorized
 *   400 invalid_code
 *   409 already_enabled
 *   400 no_secret_setup_first — must call /setup before /verify
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { code?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.code || typeof body.code !== 'string') {
        return NextResponse.json({ error: 'code_required' }, { status: 400 });
    }

    const result = await verifyAndEnable(auth.user.id, body.code);
    if (!result.ok) {
        const status = result.error === 'invalid_code' ? 400
            : result.error === 'already_enabled' ? 409
            : result.error === 'no_secret_setup_first' ? 400
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    // User just enabled 2FA — give them an mfa_session so they don't get
    // immediately bounced to /auth/2fa-challenge after setup.
    await setMfaSessionCookie(auth.user.id);

    return NextResponse.json({ ok: true });
}
