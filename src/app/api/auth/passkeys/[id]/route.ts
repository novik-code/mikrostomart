import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { removePasskey, renamePasskey } from '@/lib/passkeyService';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/auth/passkeys/[id]
 *
 * Usuń passkey. Inaczej niż TOTP devices — passkey może być usunięty bez proof
 * code, bo:
 *  1. User jest authenticated przez Supabase session (logged in jako sam siebie)
 *  2. Passkey samo w sobie wymaga biometric verification przy każdym użyciu
 *  3. Nie ma "stolen passkey" attack — credential żyje w Secure Enclave, nie
 *     da się go skopiować
 *  4. Jeśli user chce się pozbyć passkey to znaczy że już nie chce go używać —
 *     żadnej ścieżki nadużycia (max user się sam zablokuje, ale wtedy zaloguje
 *     się TOTP-em)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id: passkeyId } = await params;

    const result = await removePasskey(auth.user.id, passkeyId);
    if (!result.ok) {
        const status = result.error === 'employee_not_found' ? 404 : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/auth/passkeys/[id]
 *
 * Zmień nazwę passkey. Body: { deviceName: string }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id: passkeyId } = await params;

    let body: { deviceName?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.deviceName || typeof body.deviceName !== 'string') {
        return NextResponse.json({ error: 'device_name_required' }, { status: 400 });
    }

    const result = await renamePasskey(auth.user.id, passkeyId, body.deviceName);
    if (!result.ok) {
        const status = result.error === 'name_required' ? 400
            : result.error === 'device_name_taken' ? 409
            : result.error === 'employee_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
}
