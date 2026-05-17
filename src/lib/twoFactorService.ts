import { createClient } from '@supabase/supabase-js';
import {
    generateSecret,
    generateQrDataUrl,
    verifyCode,
    generateBackupCodes,
    verifyBackupCode,
    consumeBackupCode,
} from './totp';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type TwoFactorStatus = {
    enabled: boolean;
    setupAt: string | null;
    verifiedAt: string | null;
    lastUsedAt: string | null;
    backupCodesRemaining: number;
};

export type TwoFactorSetupResult = {
    secret: string;
    qrDataUrl: string;
    backupCodes: string[];
};

/**
 * Read 2FA status for a user.
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus | null> {
    const { data, error } = await supabase
        .from('employees')
        .select('totp_enabled, totp_setup_at, totp_verified_at, totp_last_used_at, totp_backup_codes')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return null;

    return {
        enabled: Boolean(data.totp_enabled),
        setupAt: data.totp_setup_at,
        verifiedAt: data.totp_verified_at,
        lastUsedAt: data.totp_last_used_at,
        backupCodesRemaining: Array.isArray(data.totp_backup_codes) ? data.totp_backup_codes.length : 0,
    };
}

/**
 * Generate a new TOTP secret + backup codes for a user.
 * Saves secret + hashed backup codes to DB but does NOT enable 2FA yet
 * — user must verify with a TOTP code first (calls verifyAndEnable).
 *
 * Returns secret + QR data URL + plain backup codes (show once to user).
 *
 * SAFETY: if user already has totp_enabled=true, this will reset their setup
 * (return error). To re-setup, must first disable.
 */
export async function startSetup(userId: string, email: string): Promise<
    { ok: true; data: TwoFactorSetupResult } | { ok: false; error: string }
> {
    // Look up employee
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, user_id, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) return { ok: false, error: 'database_error' };
    if (!employee) return { ok: false, error: 'employee_not_found' };
    if (employee.totp_enabled) {
        return { ok: false, error: 'already_enabled' };
    }

    const secret = generateSecret();
    const qrDataUrl = await generateQrDataUrl(email, secret);
    const { plain, hashed } = await generateBackupCodes();

    const { error: updateError } = await supabase
        .from('employees')
        .update({
            totp_secret: secret,
            totp_backup_codes: hashed,
            totp_setup_at: new Date().toISOString(),
            totp_enabled: false, // still false — enabled only after verifyAndEnable
        })
        .eq('id', employee.id);

    if (updateError) {
        console.error('[2FA] startSetup update error:', updateError);
        return { ok: false, error: 'database_error' };
    }

    return {
        ok: true,
        data: { secret, qrDataUrl, backupCodes: plain },
    };
}

/**
 * Verify the TOTP code submitted at setup time and enable 2FA.
 */
export async function verifyAndEnable(userId: string, code: string): Promise<
    { ok: true } | { ok: false; error: string }
> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_secret, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (employee.totp_enabled) return { ok: false, error: 'already_enabled' };
    if (!employee.totp_secret) return { ok: false, error: 'no_secret_setup_first' };

    if (!verifyCode(code, employee.totp_secret)) {
        return { ok: false, error: 'invalid_code' };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
        .from('employees')
        .update({
            totp_enabled: true,
            totp_verified_at: now,
            totp_last_used_at: now,
        })
        .eq('id', employee.id);

    if (updateError) {
        console.error('[2FA] verifyAndEnable update error:', updateError);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}

/**
 * Verify a TOTP code during login challenge.
 * Updates last_used_at on success.
 */
export async function verifyChallenge(userId: string, code: string): Promise<
    { ok: true } | { ok: false; error: string }
> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_secret, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled || !employee.totp_secret) {
        return { ok: false, error: 'not_enabled' };
    }

    if (!verifyCode(code, employee.totp_secret)) {
        return { ok: false, error: 'invalid_code' };
    }

    await supabase
        .from('employees')
        .update({ totp_last_used_at: new Date().toISOString() })
        .eq('id', employee.id);

    return { ok: true };
}

/**
 * Verify a backup code (single-use fallback when phone lost).
 * Consumes the code on success.
 */
export async function verifyBackupChallenge(userId: string, code: string): Promise<
    { ok: true; remaining: number } | { ok: false; error: string }
> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_backup_codes, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled) return { ok: false, error: 'not_enabled' };

    const hashedCodes: string[] = Array.isArray(employee.totp_backup_codes)
        ? employee.totp_backup_codes
        : [];

    if (hashedCodes.length === 0) {
        return { ok: false, error: 'no_backup_codes_left' };
    }

    const matchIndex = await verifyBackupCode(code, hashedCodes);
    if (matchIndex < 0) {
        return { ok: false, error: 'invalid_code' };
    }

    const remaining = consumeBackupCode(hashedCodes, matchIndex);
    const { error: updateError } = await supabase
        .from('employees')
        .update({
            totp_backup_codes: remaining,
            totp_last_used_at: new Date().toISOString(),
        })
        .eq('id', employee.id);

    if (updateError) {
        console.error('[2FA] verifyBackupChallenge update error:', updateError);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true, remaining: remaining.length };
}

/**
 * Disable 2FA for the calling user.
 * REQUIRES current TOTP code (zero-trust — even legitimate disable needs proof of possession).
 */
export async function disable(userId: string, currentCode: string): Promise<
    { ok: true } | { ok: false; error: string }
> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_secret, totp_enabled, totp_backup_codes')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled || !employee.totp_secret) {
        return { ok: false, error: 'not_enabled' };
    }

    // Accept either current TOTP or backup code
    let verified = verifyCode(currentCode, employee.totp_secret);
    if (!verified && Array.isArray(employee.totp_backup_codes)) {
        const matchIndex = await verifyBackupCode(currentCode, employee.totp_backup_codes);
        verified = matchIndex >= 0;
    }

    if (!verified) {
        return { ok: false, error: 'invalid_code' };
    }

    const { error: updateError } = await supabase
        .from('employees')
        .update({
            totp_secret: null,
            totp_enabled: false,
            totp_backup_codes: [],
            totp_setup_at: null,
            totp_verified_at: null,
            totp_last_used_at: null,
        })
        .eq('id', employee.id);

    if (updateError) {
        console.error('[2FA] disable update error:', updateError);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}

/**
 * Admin-initiated reset of another user's 2FA (e.g. when they lost phone + backup codes).
 *
 * HYBRID RECOVERY (D3 = Wariant C): requires the calling admin to verify their own
 * TOTP code first (proof of possession) + reason (audit log).
 *
 * Caller MUST log this action via auditLog.ts before/after calling this function.
 */
export async function adminReset(targetUserId: string): Promise<
    { ok: true } | { ok: false; error: string }
> {
    const { data: target, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();

    if (error || !target) return { ok: false, error: 'target_not_found' };

    const { error: updateError } = await supabase
        .from('employees')
        .update({
            totp_secret: null,
            totp_enabled: false,
            totp_backup_codes: [],
            totp_setup_at: null,
            totp_verified_at: null,
            totp_last_used_at: null,
        })
        .eq('id', target.id);

    if (updateError) {
        console.error('[2FA] adminReset update error:', updateError);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}

/**
 * Regenerate backup codes (e.g. after using several, user wants fresh set).
 * Requires current TOTP code.
 */
export async function regenerateBackupCodes(userId: string, currentCode: string): Promise<
    { ok: true; backupCodes: string[] } | { ok: false; error: string }
> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_secret, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled || !employee.totp_secret) {
        return { ok: false, error: 'not_enabled' };
    }

    if (!verifyCode(currentCode, employee.totp_secret)) {
        return { ok: false, error: 'invalid_code' };
    }

    const { plain, hashed } = await generateBackupCodes();
    const { error: updateError } = await supabase
        .from('employees')
        .update({ totp_backup_codes: hashed })
        .eq('id', employee.id);

    if (updateError) {
        console.error('[2FA] regenerateBackupCodes update error:', updateError);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true, backupCodes: plain };
}

/**
 * List all employees with their 2FA status (for admin SecurityTab).
 */
export async function listEmployees2FAStatus(): Promise<Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    is_active: boolean;
    totp_enabled: boolean;
    totp_setup_at: string | null;
    totp_verified_at: string | null;
    totp_last_used_at: string | null;
    backup_codes_remaining: number;
    is_admin: boolean;
}>> {
    // Fetch employees
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, user_id, name, email, is_active, totp_enabled, totp_setup_at, totp_verified_at, totp_last_used_at, totp_backup_codes')
        .not('user_id', 'is', null)
        .order('name', { ascending: true });

    if (error) {
        console.error('[2FA] listEmployees2FAStatus error:', error);
        return [];
    }

    // Fetch admin role assignments
    const userIds = (employees || []).map(e => e.user_id).filter(Boolean);
    const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .in('user_id', userIds);

    const adminSet = new Set((adminRoles || []).map(r => r.user_id));

    return (employees || []).map(e => ({
        id: e.id,
        user_id: e.user_id,
        name: e.name,
        email: e.email || '',
        is_active: e.is_active !== false,
        totp_enabled: Boolean(e.totp_enabled),
        totp_setup_at: e.totp_setup_at,
        totp_verified_at: e.totp_verified_at,
        totp_last_used_at: e.totp_last_used_at,
        backup_codes_remaining: Array.isArray(e.totp_backup_codes) ? e.totp_backup_codes.length : 0,
        is_admin: adminSet.has(e.user_id),
    }));
}
