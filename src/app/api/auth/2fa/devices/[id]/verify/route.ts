import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { verifyAndEnableDevice } from '@/lib/twoFactorService';
import { setMfaSessionCookie } from '@/lib/mfaSession';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/2fa/devices/[id]/verify
 *
 * Verify the TOTP code for a specific pending device and enable it. After this
 * the device generates valid codes during login challenge.
 *
 * Also sets the mfa_session cookie if this is the first enabled device (caller
 * just turned 2FA on for the account).
 *
 * Body: { code: string }  // 6-digit TOTP from the device being enabled
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id: deviceId } = await params;

    let body: { code?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.code || typeof body.code !== 'string') {
        return NextResponse.json({ error: 'code_required' }, { status: 400 });
    }

    const result = await verifyAndEnableDevice(auth.user.id, deviceId, body.code);
    if (!result.ok) {
        const status = result.error === 'invalid_code' ? 400
            : result.error === 'device_not_found' ? 404
            : result.error === 'already_enabled' ? 409
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    // Refresh mfa_session so user doesn't get bounced to challenge right after.
    // (Idempotent — also covers add-additional-device path.)
    await setMfaSessionCookie(auth.user.id);

    return NextResponse.json({ ok: true });
}
