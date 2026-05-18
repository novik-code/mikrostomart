import { NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { startSetup } from '@/lib/twoFactorService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/2fa/setup
 *
 * Generates a new TOTP secret + QR code + 8 backup codes.
 * Saves to employees table but does NOT enable 2FA — user must verify with
 * `/api/auth/2fa/verify` first.
 *
 * Returns:
 *   { ok: true, qrDataUrl: "data:image/png;base64,...", secret: "ABCD1234...", backupCodes: ["XXXXX-XXXXX", ...] }
 *
 * Errors:
 *   401 unauthorized — not logged in
 *   403 forbidden — not admin/employee
 *   409 already_enabled — 2FA already active (must disable first to re-setup)
 */
export async function POST() {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const email = auth.user.email;
    if (!email) {
        return NextResponse.json({ error: 'user_has_no_email' }, { status: 400 });
    }

    const result = await startSetup(auth.user.id, email);
    if (!result.ok) {
        const status = result.error === 'already_enabled' ? 409
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
        ok: true,
        qrDataUrl: result.data.qrDataUrl,
        otpauthUrl: result.data.otpauthUrl,
        secret: result.data.secret,
        backupCodes: result.data.backupCodes,
        deviceId: result.data.deviceId,
    });
}
