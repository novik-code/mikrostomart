import { NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { listPasskeys } from '@/lib/passkeyService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/passkeys
 *
 * Returns user's registered passkeys (no credential data exposed, just metadata
 * dla UI). Używane przez /pracownik/security żeby wyrenderować listę.
 */
export async function GET() {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const passkeys = await listPasskeys(auth.user.id);
    return NextResponse.json({ ok: true, passkeys });
}
