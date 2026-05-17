import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { disable } from '@/lib/twoFactorService';
import { clearMfaSessionCookie } from '@/lib/mfaSession';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/auth/2fa/disable
 *
 * Disables 2FA for the calling user. Requires current TOTP code or backup code
 * as proof of possession (zero-trust — even legitimate disable needs verification).
 *
 * Body: { code: string }  // current 6-digit TOTP or backup code
 *
 * IMPORTANT: After this returns ok, the user no longer has 2FA. If they're admin,
 * middleware will redirect them to /pracownik/security to re-setup on next request.
 */
export async function DELETE(request: NextRequest) {
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

    const result = await disable(auth.user.id, body.code);
    if (!result.ok) {
        const status = result.error === 'invalid_code' ? 400
            : result.error === 'not_enabled' ? 400
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    // Clear the mfa_session — user no longer needs it
    await clearMfaSessionCookie();

    return NextResponse.json({ ok: true });
}
