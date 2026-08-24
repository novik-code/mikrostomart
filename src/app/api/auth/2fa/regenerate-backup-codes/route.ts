import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { regenerateBackupCodes, MFA_RATE_LIMITED } from '@/lib/twoFactorService';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/2fa/regenerate-backup-codes
 *
 * Generates a fresh set of 8 backup codes. Old codes are invalidated.
 * Requires current TOTP code for verification.
 *
 * Body: { code: string }  // current 6-digit TOTP
 */
export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { code?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.code || typeof body.code !== 'string') {
        return NextResponse.json({ error: 'code_required' }, { status: 400 });
    }

    const result = await regenerateBackupCodes(auth.user.id, body.code);
    if (!result.ok) {
        const status = result.error === MFA_RATE_LIMITED ? 429
            : result.error === 'invalid_code' ? 400
            : result.error === 'not_enabled' ? 400
            : 500;
        return NextResponse.json(
            { error: result.error },
            // Bez `Retry-After` klient nie wie, ile czekać, i wraca po sekundzie —
            // czyli dławik hamuje serwer, a człowieka zostawia w pętli.
            { status, ...(status === 429 ? { headers: { 'Retry-After': '900' } } : {}) },
        );
    }

    // Ślad w audycie: stare kody przestają działać, nowe zna wyłącznie ten, kto je zobaczył.
    await logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email || '',
        action: 'mfa_backup_codes_regenerated',
        resourceType: 'two_factor',
        request,
    });

    return NextResponse.json({ ok: true, backupCodes: result.backupCodes });
}
