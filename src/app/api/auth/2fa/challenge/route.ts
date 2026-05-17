import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { verifyChallenge, verifyBackupChallenge } from '@/lib/twoFactorService';
import { setMfaSessionCookie } from '@/lib/mfaSession';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/2fa/challenge
 *
 * Login flow second step: user passed Supabase password check, now must verify
 * TOTP code (or backup code) to get the mfa_session cookie that the middleware
 * will accept.
 *
 * Body: { code: string, type?: 'totp' | 'backup' }
 *
 * Returns:
 *   { ok: true } — cookie set, redirect client-side to original path
 *   { ok: false, error: 'invalid_code' | 'not_enabled' | ... }
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { code?: string; type?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.code || typeof body.code !== 'string') {
        return NextResponse.json({ error: 'code_required' }, { status: 400 });
    }

    const isBackup = body.type === 'backup';
    const result = isBackup
        ? await verifyBackupChallenge(auth.user.id, body.code)
        : await verifyChallenge(auth.user.id, body.code);

    if (!result.ok) {
        const status = result.error === 'invalid_code' ? 400
            : result.error === 'not_enabled' ? 400
            : result.error === 'no_backup_codes_left' ? 400
            : 500;
        return NextResponse.json({ error: result.error }, { status });
    }

    await setMfaSessionCookie(auth.user.id);

    return NextResponse.json({
        ok: true,
        ...(isBackup && 'remaining' in result ? { backupRemaining: result.remaining } : {}),
    });
}
