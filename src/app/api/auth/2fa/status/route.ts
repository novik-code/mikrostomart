import { NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { getTwoFactorStatus } from '@/lib/twoFactorService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/2fa/status
 *
 * Returns 2FA status for the calling user. Used by /pracownik/security page
 * to decide whether to show setup wizard or manage screen.
 */
export async function GET() {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const status = await getTwoFactorStatus(auth.user.id);
    if (!status) {
        return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });
    }

    return NextResponse.json({
        ok: true,
        ...status,
        isAdmin: auth.roles.includes('admin'),
    });
}
