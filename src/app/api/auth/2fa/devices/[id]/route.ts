import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { removeDevice, renameDevice } from '@/lib/twoFactorService';
import { clearMfaSessionCookie } from '@/lib/mfaSession';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/auth/2fa/devices/[id]
 *
 * Remove a device. Requires current TOTP code (from any enabled device on the
 * account) OR a backup code as proof of possession.
 *
 * Body: { code: string }
 *
 * If removing the last enabled device → backup codes cleared, account reverts
 * to no-2FA state, mfa_session cookie cleared.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id: deviceId } = await params;

    // Code może być pusty dla disabled device (mid-setup cleanup) — twoFactorService
    // sprawdza target.enabled i pomija verify gdy device był jeszcze nieaktywowany.
    // Endpoint NIE waliduje że code jest non-empty, bo niedokończony setup nie ma
    // żadnego working secret w aplikacji user'a.
    let body: { code?: string };
    try {
        body = await request.json();
    } catch {
        body = {};
    }
    const code = typeof body.code === 'string' ? body.code : '';

    const result = await removeDevice(auth.user.id, deviceId, code);
    if (!result.ok) {
        const status = result.error === 'invalid_code' ? 400
            : result.error === 'device_not_found' ? 404
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    if (result.allDisabled) {
        await clearMfaSessionCookie();
    }

    return NextResponse.json({ ok: true, allDisabled: result.allDisabled });
}

/**
 * PATCH /api/auth/2fa/devices/[id]
 *
 * Rename a device. No code proof needed — user is already authenticated via
 * Supabase session, and rename has no security implication (it's just a label).
 *
 * Body: { deviceName: string }  // 1-60 chars, must be unique per employee
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id: deviceId } = await params;

    let body: { deviceName?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.deviceName || typeof body.deviceName !== 'string') {
        return NextResponse.json({ error: 'device_name_required' }, { status: 400 });
    }

    const result = await renameDevice(auth.user.id, deviceId, body.deviceName);
    if (!result.ok) {
        const status = result.error === 'name_required' ? 400
            : result.error === 'device_name_taken' ? 409
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
}
