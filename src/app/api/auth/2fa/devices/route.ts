import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { MFA_COOKIE_NAME, verifyMfaSessionToken } from '@/lib/mfaSession';
import {
    listDevices,
    addDevice,
    getTwoFactorStatus,
    verifyChallenge,
    verifyBackupChallenge,
} from '@/lib/twoFactorService';

export const dynamic = 'force-dynamic';

/**
 * Dowód posiadania AKTUALNEGO drugiego czynnika.
 *
 * 🔒 Powód istnienia: `/api/auth/2fa/` jest w `SKIP_2FA_PATHS` (middleware), więc middleware
 * NIE egzekwuje tu 2FA. Bez tej kontroli sesja zdobyta SAMYM HASŁEM mogła dodać nowe
 * urządzenie TOTP, odczytać z odpowiedzi `secret`, policzyć z niego kod i przejść challenge —
 * czyli obejść drugi czynnik w całości.
 *
 * Akceptujemy trzy dowody, w tej kolejności:
 *   1. ważną sesję MFA — nagłówek `X-MFA-Session` (apka) albo cookie (web),
 *   2. kod TOTP z któregokolwiek AKTYWNEGO urządzenia,
 *   3. kod zapasowy (jednorazowy — zużywa się).
 *
 * Web nie wymaga zmian: pracownik, który przeszedł 2FA przy logowaniu, ma cookie.
 */
async function hasCurrentFactorProof(
    request: NextRequest,
    userId: string,
    code?: string
): Promise<boolean> {
    const header = request.headers.get('x-mfa-session') ?? undefined;
    if (verifyMfaSessionToken(header)?.userId === userId) return true;

    const cookie = (await cookies()).get(MFA_COOKIE_NAME)?.value;
    if (verifyMfaSessionToken(cookie)?.userId === userId) return true;

    const trimmed = typeof code === 'string' ? code.trim() : '';
    if (!trimmed) return false;

    if ((await verifyChallenge(userId, trimmed)).ok) return true;
    // Dopiero na końcu — kod zapasowy jest jednorazowy i zużywa się przy weryfikacji.
    return (await verifyBackupChallenge(userId, trimmed)).ok;
}

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

    let body: { deviceName?: string; code?: string } = {};
    try {
        body = await request.json();
    } catch {
        // Empty body is valid — defaults will apply
    }

    // Konto, które MA już aktywne 2FA, nie może dorzucić kolejnego urządzenia
    // na podstawie samego hasła — patrz `hasCurrentFactorProof`.
    // FAIL-CLOSED: `getTwoFactorStatus` zwraca null zarowno gdy pracownika nie ma, jak i gdy
    // zapytanie do bazy padnie (supabase-js nie rzuca wyjatku). `status?.enabled` byloby wtedy
    // undefined i kontrola zostalaby POMINIETA — czyli blad bazy otwieralby dziure z powrotem.
    // Nie potrafimy ustalic stanu => wymagamy dowodu.
    const status = await getTwoFactorStatus(auth.user.id);
    if (status === null || status.enabled) {
        if (!(await hasCurrentFactorProof(request, auth.user.id, body.code))) {
            return NextResponse.json({ error: 'proof_required' }, { status: 403 });
        }
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
        otpauthUrl: result.data.otpauthUrl,
        secret: result.data.secret,
        backupCodes: result.data.backupCodes,
    });
}
