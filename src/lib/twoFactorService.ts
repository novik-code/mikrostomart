import { createClient } from '@supabase/supabase-js';
import {
    generateSecret,
    generateQrDataUrl,
    buildOtpauthUrl,
    verifyCode,
    generateBackupCodes,
    verifyBackupCode,
    consumeBackupCode,
} from './totp';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TwoFactorStatus = {
    enabled: boolean;
    setupAt: string | null;
    verifiedAt: string | null;
    lastUsedAt: string | null;
    backupCodesRemaining: number;
    deviceCount: number;
    enabledDeviceCount: number;
};

export type TwoFactorDevice = {
    id: string;
    name: string;
    enabled: boolean;
    createdAt: string;
    lastUsedAt: string | null;
};

export type AddDeviceResult = {
    deviceId: string;
    secret: string;
    qrDataUrl: string;
    /**
     * Raw otpauth:// URL — przekazywany do UI jako deep link button.
     * Na Androidzie klik w `<a href="otpauth://...">` może otworzyć zainstalowaną
     * aplikację Authenticator z preconfigurowanym wpisem. Fallback: user wpisuje
     * secret ręcznie lub używa wbudowanego scanner'a w Authenticator app.
     */
    otpauthUrl: string;
    /** Backup codes returned only at first-time setup. null on subsequent devices. */
    backupCodes: string[] | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status & listing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read aggregate 2FA status for a user (any device enabled, total devices, etc).
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus | null> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_enabled, totp_setup_at, totp_verified_at, totp_last_used_at, totp_backup_codes')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return null;

    const { data: devices } = await supabase
        .from('employee_2fa_devices')
        .select('enabled')
        .eq('employee_id', employee.id);

    const devList = devices || [];
    return {
        enabled: Boolean(employee.totp_enabled),
        setupAt: employee.totp_setup_at,
        verifiedAt: employee.totp_verified_at,
        lastUsedAt: employee.totp_last_used_at,
        backupCodesRemaining: Array.isArray(employee.totp_backup_codes) ? employee.totp_backup_codes.length : 0,
        deviceCount: devList.length,
        enabledDeviceCount: devList.filter(d => d.enabled).length,
    };
}

/**
 * List all devices for a user (no secrets exposed).
 */
export async function listDevices(userId: string): Promise<TwoFactorDevice[]> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!employee) return [];

    const { data: devices, error } = await supabase
        .from('employee_2fa_devices')
        .select('id, device_name, enabled, created_at, last_used_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: true });

    if (error || !devices) return [];

    return devices.map(d => ({
        id: d.id,
        name: d.device_name,
        enabled: d.enabled,
        createdAt: d.created_at,
        lastUsedAt: d.last_used_at,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / verify / remove devices
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a new TOTP device for the user. Generates secret + QR. Device is NOT enabled
 * yet — caller must verify with verifyAndEnableDevice first.
 *
 * Backup codes:
 *   - First device for user (no enabled devices yet) → generate 8 backup codes
 *   - Subsequent devices → returns null (backup codes already exist, don't regenerate)
 *
 * Device naming:
 *   - If caller provides deviceName, use it (after collision check)
 *   - If not, default to "Urządzenie N" where N = next available number
 *
 * Errors:
 *   - employee_not_found
 *   - device_name_taken (UNIQUE constraint on employee_id + device_name)
 *   - max_devices_reached (hard limit 10 per account — anti-abuse)
 */
const MAX_DEVICES_PER_ACCOUNT = 10;

export async function addDevice(
    userId: string,
    email: string,
    deviceName?: string
): Promise<{ ok: true; data: AddDeviceResult } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_backup_codes')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) return { ok: false, error: 'database_error' };
    if (!employee) return { ok: false, error: 'employee_not_found' };

    // Check current devices
    const { data: existingDevices } = await supabase
        .from('employee_2fa_devices')
        .select('id, device_name, enabled')
        .eq('employee_id', employee.id);

    const devices = existingDevices || [];
    if (devices.length >= MAX_DEVICES_PER_ACCOUNT) {
        return { ok: false, error: 'max_devices_reached' };
    }

    // Generate default name if not provided
    let finalName: string;
    if (deviceName && deviceName.trim().length > 0) {
        const trimmed = deviceName.trim().slice(0, 60);
        const taken = devices.some(d => d.device_name === trimmed);
        if (taken) return { ok: false, error: 'device_name_taken' };
        finalName = trimmed;
    } else {
        // Find next available "Urządzenie N"
        let n = devices.length + 1;
        // Avoid collision if user previously deleted middle devices
        while (devices.some(d => d.device_name === `Urządzenie ${n}`)) {
            n++;
            if (n > 99) break; // safety
        }
        finalName = `Urządzenie ${n}`;
    }

    // Generate TOTP secret + QR
    const secret = generateSecret();
    // Include device name in OTPAUTH label so user can distinguish in their app:
    // "Mikrostomart (Justyna iPhone)" → email:Mikrostomart-Justyna iPhone
    const labelEmail = `${email} (${finalName})`;
    const otpauthUrl = buildOtpauthUrl(labelEmail, secret);
    const qrDataUrl = await generateQrDataUrl(labelEmail, secret);

    // Backup codes: only generate if this is the first device
    const hasEnabledDevice = devices.some(d => d.enabled);
    const hasBackupCodes = Array.isArray(employee.totp_backup_codes) && employee.totp_backup_codes.length > 0;

    let backupCodesPlain: string[] | null = null;
    let backupCodesHashed: string[] | null = null;

    if (!hasEnabledDevice && !hasBackupCodes) {
        const generated = await generateBackupCodes();
        backupCodesPlain = generated.plain;
        backupCodesHashed = generated.hashed;
    }

    // Insert device row
    const { data: inserted, error: insertError } = await supabase
        .from('employee_2fa_devices')
        .insert({
            employee_id: employee.id,
            device_name: finalName,
            totp_secret: secret,
            enabled: false,
        })
        .select('id')
        .single();

    if (insertError || !inserted) {
        console.error('[2FA] addDevice insert error:', insertError);
        if (insertError?.code === '23505') {
            return { ok: false, error: 'device_name_taken' };
        }
        return { ok: false, error: 'database_error' };
    }

    // If first device, save backup codes + setup timestamp
    if (backupCodesHashed) {
        await supabase
            .from('employees')
            .update({
                totp_backup_codes: backupCodesHashed,
                totp_setup_at: new Date().toISOString(),
            })
            .eq('id', employee.id);
    }

    return {
        ok: true,
        data: {
            deviceId: inserted.id,
            secret,
            qrDataUrl,
            otpauthUrl,
            backupCodes: backupCodesPlain,
        },
    };
}

/**
 * Verify the TOTP code and enable a specific device.
 * If this is the first enabled device on the account, also sets totp_verified_at.
 */
export async function verifyAndEnableDevice(
    userId: string,
    deviceId: string,
    code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_verified_at')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };

    const { data: device, error: devErr } = await supabase
        .from('employee_2fa_devices')
        .select('id, totp_secret, enabled')
        .eq('id', deviceId)
        .eq('employee_id', employee.id)
        .maybeSingle();

    if (devErr || !device) return { ok: false, error: 'device_not_found' };
    if (device.enabled) return { ok: false, error: 'already_enabled' };

    if (!verifyCode(code, device.totp_secret)) {
        return { ok: false, error: 'invalid_code' };
    }

    const now = new Date().toISOString();

    // Enable the device
    const { error: devUpdateErr } = await supabase
        .from('employee_2fa_devices')
        .update({
            enabled: true,
            last_used_at: now,
        })
        .eq('id', device.id);

    if (devUpdateErr) {
        console.error('[2FA] verifyAndEnableDevice update error:', devUpdateErr);
        return { ok: false, error: 'database_error' };
    }

    // Update employees aggregate fields (totp_enabled handled by trigger)
    const empUpdate: Record<string, string | null> = {
        totp_last_used_at: now,
    };
    // Set totp_verified_at only on FIRST enabled device (legacy "moment 2FA went live")
    if (!employee.totp_verified_at) {
        empUpdate.totp_verified_at = now;
    }
    await supabase.from('employees').update(empUpdate).eq('id', employee.id);

    return { ok: true };
}

/**
 * Remove a device. Requires current TOTP code (from any enabled device on the
 * account) or a backup code as proof of possession.
 *
 * If removing the LAST enabled device, also clears backup codes (account reverts
 * to no-2FA state — caller should treat this as full disable).
 */
export async function removeDevice(
    userId: string,
    deviceId: string,
    proofCode: string
): Promise<{ ok: true; allDisabled: boolean } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_backup_codes')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };

    const { data: target, error: targetErr } = await supabase
        .from('employee_2fa_devices')
        .select('id, enabled')
        .eq('id', deviceId)
        .eq('employee_id', employee.id)
        .maybeSingle();

    if (targetErr || !target) return { ok: false, error: 'device_not_found' };

    // Pominięcie verify dla disabled devices (mid-setup, never verified by user).
    //
    // Disabled device = secret został wygenerowany serwer-side ale user nigdy nie
    // potwierdził kodem (np. zamknął kartę w trakcie setup, lub pierwsza próba
    // dodania nigdy nie dotarła do "Krok 3 verify"). Nikt nie ma tego sekretu
    // w aplikacji Authenticator → device nie daje żadnego dostępu → bezpieczne
    // jest usunięcie bez proof code.
    //
    // Bez tego: orphan disabled rows zostają w DB na zawsze gdy:
    //   - first-time setup przerwany przed backup codes display → user nie zna
    //     backup codes (jeszcze niewyświetlone) → nie może zalogować pełnym
    //     code (jeszcze nie ma żadnego enabled device) → DELETE wymaga proof
    //     → DEAD LOCK.
    //   - add-device flow przerwany przed verify → nie tak krytyczne (user może
    //     użyć code z innego enabled device), ale lepsze UX bez extra friction.
    if (!target.enabled) {
        const { error: delErr } = await supabase
            .from('employee_2fa_devices')
            .delete()
            .eq('id', target.id);

        if (delErr) {
            console.error('[2FA] removeDevice (disabled) delete error:', delErr);
            return { ok: false, error: 'database_error' };
        }

        // Check remaining enabled devices for allDisabled flag
        const { data: remaining } = await supabase
            .from('employee_2fa_devices')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('enabled', true);

        const allDisabled = !remaining || remaining.length === 0;
        return { ok: true, allDisabled };
    }

    // Enabled device — wymagaj proof of possession.
    const verified = await verifyAnyCode(employee.id, proofCode, employee.totp_backup_codes || []);
    if (!verified.ok) return { ok: false, error: 'invalid_code' };

    // Delete device
    const { error: delErr } = await supabase
        .from('employee_2fa_devices')
        .delete()
        .eq('id', target.id);

    if (delErr) {
        console.error('[2FA] removeDevice delete error:', delErr);
        return { ok: false, error: 'database_error' };
    }

    // Check if any enabled devices remain
    const { data: remaining } = await supabase
        .from('employee_2fa_devices')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('enabled', true);

    const allDisabled = !remaining || remaining.length === 0;

    // If no enabled devices left, clear backup codes too (account reverts to no-2FA)
    if (allDisabled) {
        await supabase
            .from('employees')
            .update({
                totp_backup_codes: [],
                totp_setup_at: null,
                totp_verified_at: null,
            })
            .eq('id', employee.id);
    }

    // If backup code was consumed, persist the updated array
    if (verified.consumedBackupCodes) {
        await supabase
            .from('employees')
            .update({ totp_backup_codes: verified.consumedBackupCodes })
            .eq('id', employee.id);
    }

    return { ok: true, allDisabled };
}

/**
 * Rename a device. No code proof needed (already authenticated as user).
 */
export async function renameDevice(
    userId: string,
    deviceId: string,
    newName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const trimmed = newName.trim().slice(0, 60);
    if (trimmed.length === 0) return { ok: false, error: 'name_required' };

    const { data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };

    const { error: updateErr } = await supabase
        .from('employee_2fa_devices')
        .update({ device_name: trimmed })
        .eq('id', deviceId)
        .eq('employee_id', employee.id);

    if (updateErr) {
        if (updateErr.code === '23505') return { ok: false, error: 'device_name_taken' };
        console.error('[2FA] renameDevice update error:', updateErr);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login challenge (multi-device)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a TOTP code during login challenge.
 * Iterates over ALL enabled devices, matches the first one whose secret produces
 * the given code. Updates last_used_at on the matched device + aggregate.
 */
export async function verifyChallenge(
    userId: string,
    code: string
): Promise<{ ok: true; deviceId: string } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled) return { ok: false, error: 'not_enabled' };

    const { data: devices } = await supabase
        .from('employee_2fa_devices')
        .select('id, totp_secret')
        .eq('employee_id', employee.id)
        .eq('enabled', true);

    if (!devices || devices.length === 0) {
        return { ok: false, error: 'not_enabled' };
    }

    // Find first device whose secret matches the code
    const matched = devices.find(d => verifyCode(code, d.totp_secret));
    if (!matched) return { ok: false, error: 'invalid_code' };

    const now = new Date().toISOString();

    // Update matched device + employee aggregate
    await supabase
        .from('employee_2fa_devices')
        .update({ last_used_at: now })
        .eq('id', matched.id);

    await supabase
        .from('employees')
        .update({ totp_last_used_at: now })
        .eq('id', employee.id);

    return { ok: true, deviceId: matched.id };
}

/**
 * Verify a backup code (single-use fallback when all devices lost).
 * Consumes the matched code (removes from array).
 */
export async function verifyBackupChallenge(
    userId: string,
    code: string
): Promise<{ ok: true; remaining: number } | { ok: false; error: string }> {
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

// ─────────────────────────────────────────────────────────────────────────────
// Disable / reset (whole account)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Disable ALL 2FA for the calling user. Removes all devices and clears backup
 * codes. Requires current TOTP code (from any device) or backup code.
 */
export async function disableAll(
    userId: string,
    proofCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_enabled, totp_backup_codes')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled) return { ok: false, error: 'not_enabled' };

    const verified = await verifyAnyCode(employee.id, proofCode, employee.totp_backup_codes || []);
    if (!verified.ok) return { ok: false, error: 'invalid_code' };

    // Delete all devices (trigger will set totp_enabled = false on employees)
    const { error: delErr } = await supabase
        .from('employee_2fa_devices')
        .delete()
        .eq('employee_id', employee.id);

    if (delErr) {
        console.error('[2FA] disableAll delete error:', delErr);
        return { ok: false, error: 'database_error' };
    }

    // Clear backup codes + reset timestamps
    await supabase
        .from('employees')
        .update({
            totp_backup_codes: [],
            totp_setup_at: null,
            totp_verified_at: null,
            totp_last_used_at: null,
            totp_secret: null, // legacy column — clear too
        })
        .eq('id', employee.id);

    return { ok: true };
}

/**
 * Admin-initiated reset of another user's 2FA. Removes all devices and clears
 * backup codes. No proof code (caller is admin verified separately).
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

    // Delete all devices (trigger sets totp_enabled = false on employees)
    const { error: delErr } = await supabase
        .from('employee_2fa_devices')
        .delete()
        .eq('employee_id', target.id);

    if (delErr) {
        console.error('[2FA] adminReset delete error:', delErr);
        return { ok: false, error: 'database_error' };
    }

    // Clear backup codes + reset timestamps
    await supabase
        .from('employees')
        .update({
            totp_backup_codes: [],
            totp_setup_at: null,
            totp_verified_at: null,
            totp_last_used_at: null,
            totp_secret: null,
        })
        .eq('id', target.id);

    return { ok: true };
}

/**
 * Regenerate backup codes. Old codes invalidated. Requires current TOTP from
 * any enabled device.
 */
export async function regenerateBackupCodes(
    userId: string,
    currentCode: string
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, totp_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };
    if (!employee.totp_enabled) return { ok: false, error: 'not_enabled' };

    // Verify TOTP from any enabled device (no backup code allowed here — would be circular)
    const { data: devices } = await supabase
        .from('employee_2fa_devices')
        .select('totp_secret')
        .eq('employee_id', employee.id)
        .eq('enabled', true);

    const matched = (devices || []).find(d => verifyCode(currentCode, d.totp_secret));
    if (!matched) return { ok: false, error: 'invalid_code' };

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

// ─────────────────────────────────────────────────────────────────────────────
// Admin listing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all employees with their 2FA status + device count (for admin SecurityTab).
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
    device_count: number;
    enabled_device_count: number;
    is_admin: boolean;
}>> {
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, user_id, name, email, is_active, totp_enabled, totp_setup_at, totp_verified_at, totp_last_used_at, totp_backup_codes')
        .not('user_id', 'is', null)
        .order('name', { ascending: true });

    if (error) {
        console.error('[2FA] listEmployees2FAStatus error:', error);
        return [];
    }

    const employeeIds = (employees || []).map(e => e.id);
    const { data: allDevices } = await supabase
        .from('employee_2fa_devices')
        .select('employee_id, enabled')
        .in('employee_id', employeeIds);

    // Aggregate device counts per employee
    const deviceCounts = new Map<string, { total: number; enabled: number }>();
    (allDevices || []).forEach(d => {
        const cur = deviceCounts.get(d.employee_id) || { total: 0, enabled: 0 };
        cur.total++;
        if (d.enabled) cur.enabled++;
        deviceCounts.set(d.employee_id, cur);
    });

    // Fetch admin role assignments
    const userIds = (employees || []).map(e => e.user_id).filter(Boolean);
    const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .in('user_id', userIds);

    const adminSet = new Set((adminRoles || []).map(r => r.user_id));

    return (employees || []).map(e => {
        const counts = deviceCounts.get(e.id) || { total: 0, enabled: 0 };
        return {
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
            device_count: counts.total,
            enabled_device_count: counts.enabled,
            is_admin: adminSet.has(e.user_id),
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a code against ALL enabled device secrets OR backup codes.
 * Used for "any proof of possession" actions like removing a device or disabling 2FA.
 */
async function verifyAnyCode(
    employeeId: string,
    code: string,
    backupHashedCodes: string[]
): Promise<{ ok: true; consumedBackupCodes?: string[] } | { ok: false }> {
    // Try TOTP first (any enabled device)
    const { data: devices } = await supabase
        .from('employee_2fa_devices')
        .select('totp_secret')
        .eq('employee_id', employeeId)
        .eq('enabled', true);

    const totpMatch = (devices || []).some(d => verifyCode(code, d.totp_secret));
    if (totpMatch) return { ok: true };

    // Fall back to backup code
    if (backupHashedCodes.length > 0) {
        const matchIndex = await verifyBackupCode(code, backupHashedCodes);
        if (matchIndex >= 0) {
            const remaining = consumeBackupCode(backupHashedCodes, matchIndex);
            return { ok: true, consumedBackupCodes: remaining };
        }
    }

    return { ok: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy compat (called from existing endpoints — wraps new functions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Legacy single-device setup. Creates first device "Urządzenie 1".
 * Returns same shape as old startSetup for backward compat with /api/auth/2fa/setup.
 */
export async function startSetup(
    userId: string,
    email: string
): Promise<
    | { ok: true; data: { secret: string; qrDataUrl: string; otpauthUrl: string; backupCodes: string[]; deviceId: string } }
    | { ok: false; error: string }
> {
    // Check if user already has any enabled device
    const status = await getTwoFactorStatus(userId);
    if (!status) return { ok: false, error: 'employee_not_found' };
    if (status.enabled) return { ok: false, error: 'already_enabled' };

    // Clean up any orphan disabled devices from a previous abandoned setup
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (employee) {
        await supabase
            .from('employee_2fa_devices')
            .delete()
            .eq('employee_id', employee.id)
            .eq('enabled', false);
    }

    const result = await addDevice(userId, email);
    if (!result.ok) return result;

    // First device — backup codes guaranteed
    if (!result.data.backupCodes) {
        // Shouldn't happen — fail loud
        return { ok: false, error: 'backup_codes_not_generated' };
    }

    return {
        ok: true,
        data: {
            secret: result.data.secret,
            qrDataUrl: result.data.qrDataUrl,
            otpauthUrl: result.data.otpauthUrl,
            backupCodes: result.data.backupCodes,
            deviceId: result.data.deviceId,
        },
    };
}

/**
 * Legacy verifyAndEnable. Finds the first not-yet-enabled device for the user
 * and enables it with the given code.
 *
 * Used by legacy /api/auth/2fa/verify endpoint (no deviceId in body).
 */
export async function verifyAndEnable(
    userId: string,
    code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !employee) return { ok: false, error: 'employee_not_found' };

    // Find first disabled device (the one user just set up)
    const { data: pendingDevice } = await supabase
        .from('employee_2fa_devices')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('enabled', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!pendingDevice) return { ok: false, error: 'no_secret_setup_first' };

    return verifyAndEnableDevice(userId, pendingDevice.id, code);
}

/**
 * Legacy disable. Wraps disableAll.
 */
export async function disable(
    userId: string,
    currentCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    return disableAll(userId, currentCode);
}
