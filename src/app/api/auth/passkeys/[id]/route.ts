import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { removePasskey, renamePasskey } from '@/lib/passkeyService';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/auth/passkeys/[id]
 *
 * Usuń passkey.
 *
 * 🪤 SPROSTOWANIE 2026-09-07. Stał tu wywód, że usuwanie nie potrzebuje ani
 * dowodu, ani śladu, bo „credential żyje w Secure Enclave i nie da się go
 * skopiować". Argument odpowiadał na niewłaściwe pytanie: zagrożeniem nie jest
 * SKOPIOWANIE klucza, tylko to, co robi z kontem ktoś, kto zna samo HASŁO.
 * Dwie rzeczy z tego wywodu były nieprawdziwe w skutkach:
 *
 *  1. Usunięcie NIE unieważniało sesji MFA wystawionych przez ten klucz —
 *     żyły dalej do 8 h, a przy „zaufaj urządzeniu" do 30 dni. Reguła spisana
 *     przy `removeDevice` mówi wprost, że odebranie czynnika ma zrywać jego
 *     sesje; passkeye z niej wypadły. Dziś epokę podbija `removePasskey`.
 *  2. Nie było ŻADNEGO wpisu w audycie — a „kto i kiedy ruszył moje klucze"
 *     to pierwsze pytanie przy podejrzeniu przejęcia konta.
 *
 * ⚠️ Świadomie NIEZMIENIONE: usuwanie nadal nie wymaga dowodu drugiego
 * składnika (inaczej niż rejestracja). Zmiana wymagałaby przebudowy modala
 * usuwania i jest osobną decyzją właściciela; skutek jest ograniczony, bo
 * napastnik nie może już DODAĆ czynnika (P-002), a usunięcie zrywa mu sesje.
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
        const status = result.error === 'employee_not_found' ? 404
            : result.error === 'passkey_not_found' ? 404
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    await logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email ?? '',
        action: 'passkey_removed',
        resourceType: 'passkey',
        resourceId: passkeyId,
        request,
    });

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
