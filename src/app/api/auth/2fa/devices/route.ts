import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { listDevices, addDevice } from '@/lib/twoFactorService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/2fa/devices
 *
 * Returns list of 2FA devices for the calling user (no secrets exposed).
 * Used by /pracownik/security to render the device list.
 */
export async function GET() {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const devices = await listDevices(auth.user.id);
    return NextResponse.json({ ok: true, devices });
}

/**
 * POST /api/auth/2fa/devices
 *
 * Add a new TOTP device to the calling user's account. Device is created with
 * enabled=false — user must scan QR and verify with POST /devices/[id]/verify
 * to activate it.
 *
 * Body: { deviceName?: string }  // default "Urządzenie N"
 *
 * Returns:
 *   { ok: true, deviceId, qrDataUrl, secret, backupCodes }
 *   backupCodes is array ONLY if this is the first device for the user (also
 *   covered by /api/auth/2fa/setup which is the canonical first-time path).
 *   For subsequent devices, backupCodes is null.
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const email = auth.user.email;
    if (!email) {
        return NextResponse.json({ error: 'user_has_no_email' }, { status: 400 });
    }

    let body: { deviceName?: string } = {};
    try {
        body = await request.json();
    } catch {
        // Empty body is valid — defaults will apply
    }

    const result = await addDevice(auth.user.id, email, body.deviceName);
    if (!result.ok) {
        const status = result.error === 'employee_not_found' ? 404
            : result.error === 'device_name_taken' ? 409
            : result.error === 'max_devices_reached' ? 409
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
        ok: true,
        deviceId: result.data.deviceId,
        qrDataUrl: result.data.qrDataUrl,
        secret: result.data.secret,
        backupCodes: result.data.backupCodes,
    });
}
