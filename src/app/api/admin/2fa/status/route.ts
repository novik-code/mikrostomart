import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { listEmployees2FAStatus } from '@/lib/twoFactorService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/2fa/status
 *
 * Returns list of all employees with their 2FA status — used by admin SecurityTab.
 * Includes admin flag so UI can highlight admins (mandatory) vs employees (opt-in).
 */
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const list = await listEmployees2FAStatus();
    return NextResponse.json({ ok: true, employees: list });
}
