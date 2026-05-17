import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { adminReset, verifyChallenge } from '@/lib/twoFactorService';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/2fa/reset
 *
 * Admin resets another user's 2FA (e.g. when they lost their phone and have no
 * backup codes left). Hybrid recovery model (D3 = Wariant C):
 *
 *   1. Caller must be admin (requireAdmin)
 *   2. Caller must verify their own TOTP code first (proof of possession)
 *   3. `reason` field is mandatory (audit log RODO Art. 30)
 *   4. Action is logged to employee_audit_log table
 *
 * Body: { targetUserId: string, ownCode: string, reason: string }
 *
 * Returns:
 *   { ok: true } — 2FA cleared on target user
 *   400 invalid_own_code — admin's own TOTP didn't match
 *   404 target_not_found
 *   400 reason_required
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    let body: { targetUserId?: string; ownCode?: string; reason?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!body.targetUserId || typeof body.targetUserId !== 'string') {
        return NextResponse.json({ error: 'target_user_id_required' }, { status: 400 });
    }
    if (!body.ownCode || typeof body.ownCode !== 'string') {
        return NextResponse.json({ error: 'own_code_required' }, { status: 400 });
    }
    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
        return NextResponse.json({ error: 'reason_required_min_5_chars' }, { status: 400 });
    }

    // Safety guard: admin cannot reset their own 2FA via this endpoint
    // (they should use /api/auth/2fa/disable with their own code, or be reset
    // by another admin)
    if (body.targetUserId === auth.user.id) {
        return NextResponse.json(
            { error: 'cannot_reset_self_use_disable_endpoint' },
            { status: 400 }
        );
    }

    // Verify own TOTP code (proof admin actually has their phone)
    const ownCheck = await verifyChallenge(auth.user.id, body.ownCode);
    if (!ownCheck.ok) {
        return NextResponse.json({ error: 'invalid_own_code' }, { status: 400 });
    }

    // Look up target's email for audit log
    const { data: targetEmployee } = await supabase
        .from('employees')
        .select('email, name')
        .eq('user_id', body.targetUserId)
        .maybeSingle();

    // Perform reset
    const result = await adminReset(body.targetUserId);
    if (!result.ok) {
        return NextResponse.json(
            { error: result.error },
            { status: result.error === 'target_not_found' ? 404 : 500 }
        );
    }

    // Audit log (Art. 30 RODO — rejestr czynności)
    try {
        const headers = request.headers;
        await supabase.from('employee_audit_log').insert({
            user_id: auth.user.id,
            user_email: auth.user.email || 'unknown',
            action: '2fa_reset_admin',
            resource_type: 'employee',
            resource_id: body.targetUserId,
            patient_name: targetEmployee?.name || null,
            metadata: {
                target_email: targetEmployee?.email || null,
                reason: body.reason.trim(),
            },
            ip_address: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            user_agent: headers.get('user-agent') || null,
        });
    } catch (err) {
        // Audit log failure should NOT block the reset — log and continue
        console.error('[2FA admin reset] audit log failed:', err);
    }

    return NextResponse.json({ ok: true });
}
