import { createClient } from '@supabase/supabase-js';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
    AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RP_NAME = 'Mikrostomart';
const MAX_PASSKEYS_PER_ACCOUNT = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PasskeyDevice = {
    id: string;
    name: string;
    createdAt: string;
    lastUsedAt: string | null;
    deviceType: string | null;
    backedUp: boolean;
};

export type RpConfig = {
    rpID: string;
    rpName: string;
    origin: string | string[];
};

/**
 * Derive RP config z origin URL (passed z endpoint który ma access do request headers).
 *
 * rpID musi być rejestrowalną domeną lub subdomeną aktualnej strony. Browser
 * odrzuca rejestrację/autenticację gdy mismatch. Dla `https://www.mikrostomart.pl`:
 *   - rpID `mikrostomart.pl` ✓ (parent domain)
 *   - rpID `www.mikrostomart.pl` ✓ (exact match)
 *   - rpID `vercel.app` ✗ (eTLD, public suffix)
 *
 * Dla preview deployments (*.vercel.app) używamy hostname jako rpID — passkey
 * będzie działać tylko na tej konkretnej preview, ale to OK bo preview to nie
 * production use case.
 */
export function deriveRpConfig(originUrl: string): RpConfig {
    const url = new URL(originUrl);
    const hostname = url.hostname;

    // localhost / .local — dev mode
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
        return {
            rpID: hostname,
            rpName: RP_NAME,
            origin: originUrl,
        };
    }

    // Production: mikrostomart.pl + www variant
    if (hostname === 'www.mikrostomart.pl' || hostname === 'mikrostomart.pl') {
        return {
            rpID: 'mikrostomart.pl',
            rpName: RP_NAME,
            origin: ['https://www.mikrostomart.pl', 'https://mikrostomart.pl'],
        };
    }

    // Demo: demo.densflow.ai
    if (hostname === 'demo.densflow.ai') {
        return {
            rpID: 'demo.densflow.ai',
            rpName: 'DensFlow Demo',
            origin: 'https://demo.densflow.ai',
        };
    }

    // Vercel preview lub inna domena — użyj hostname bezpośrednio
    return {
        rpID: hostname,
        rpName: RP_NAME,
        origin: originUrl,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing
// ─────────────────────────────────────────────────────────────────────────────

export async function listPasskeys(userId: string): Promise<PasskeyDevice[]> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return [];

    const { data: passkeys, error } = await supabase
        .from('employee_passkeys')
        .select('id, device_name, created_at, last_used_at, device_type, backed_up')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: true });

    if (error || !passkeys) return [];

    return passkeys.map(p => ({
        id: p.id,
        name: p.device_name,
        createdAt: p.created_at,
        lastUsedAt: p.last_used_at,
        deviceType: p.device_type,
        backedUp: Boolean(p.backed_up),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Registration flow (add new passkey)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate registration options. Returns options dla `navigator.credentials.create()`
 * + challenge który caller MUSI zapisać w cookie (passkeyChallenge.setChallengeCookie).
 */
export async function generateRegistration(
    userId: string,
    userEmail: string,
    deviceName: string,
    rpConfig: RpConfig
): Promise<
    | { ok: true; options: Awaited<ReturnType<typeof generateRegistrationOptions>>; challenge: string }
    | { ok: false; error: string }
> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return { ok: false, error: 'employee_not_found' };

    // Check device count limit
    const { data: existing } = await supabase
        .from('employee_passkeys')
        .select('id, credential_id, device_name')
        .eq('employee_id', employee.id);
    const passkeys = existing || [];

    if (passkeys.length >= MAX_PASSKEYS_PER_ACCOUNT) {
        return { ok: false, error: 'max_passkeys_reached' };
    }

    const trimmedName = deviceName.trim().slice(0, 60);
    if (trimmedName.length === 0) {
        return { ok: false, error: 'device_name_required' };
    }
    if (passkeys.some(p => p.device_name === trimmedName)) {
        return { ok: false, error: 'device_name_taken' };
    }

    // Exclude already-registered credentials (browser anti-duplicate)
    const excludeCredentials = passkeys.map(p => ({
        id: p.credential_id,
        transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
        rpName: rpConfig.rpName,
        rpID: rpConfig.rpID,
        userID: Buffer.from(userId),
        userName: userEmail,
        userDisplayName: trimmedName,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
            // Platform = FaceID/TouchID/Hello (built into device)
            // Cross-platform = USB security keys (YubiKey itp)
            // null = both allowed — najbardziej kompatybilne
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
    });

    return { ok: true, options, challenge: options.challenge };
}

/**
 * Verify registration response. Po pomyślnej verify zapisuje passkey w DB.
 *
 * `expectedChallenge` musi pochodzić z cookie (set podczas begin flow).
 * `response` to to co browser zwrócił z `navigator.credentials.create()`.
 */
export async function verifyRegistration(
    userId: string,
    deviceName: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    rpConfig: RpConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return { ok: false, error: 'employee_not_found' };

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: rpConfig.origin,
            expectedRPID: rpConfig.rpID,
            requireUserVerification: false, // user może użyć PIN zamiast FaceID
        });
    } catch (err) {
        console.error('[Passkey] verifyRegistration error:', err);
        return { ok: false, error: 'verification_failed' };
    }

    if (!verification.verified || !verification.registrationInfo) {
        return { ok: false, error: 'verification_failed' };
    }

    const info = verification.registrationInfo;
    const trimmedName = deviceName.trim().slice(0, 60);

    // SimpleWebAuthn v13: registrationInfo.credential.id (base64url string)
    const credentialId = info.credential.id;
    // publicKey: Uint8Array → base64url
    const publicKey = Buffer.from(info.credential.publicKey).toString('base64url');
    const counter = info.credential.counter;
    const transports = (info.credential.transports || []) as string[];
    const deviceType = info.credentialDeviceType; // 'singleDevice' | 'multiDevice'
    const backedUp = info.credentialBackedUp;

    const { error: insertErr } = await supabase
        .from('employee_passkeys')
        .insert({
            employee_id: employee.id,
            device_name: trimmedName,
            credential_id: credentialId,
            public_key: publicKey,
            counter,
            transports,
            device_type: deviceType,
            backed_up: backedUp,
        });

    if (insertErr) {
        console.error('[Passkey] verifyRegistration insert error:', insertErr);
        if (insertErr.code === '23505') {
            return { ok: false, error: 'device_name_taken' };
        }
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication flow (login z passkey)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate authentication options. Returns options dla `navigator.credentials.get()`.
 * Wszystkie zarejestrowane credentials dla danego usera są dodane jako allowed.
 *
 * Caller MUSI zapisać `options.challenge` w cookie żeby zweryfikować w finish.
 */
export async function generateAuthentication(
    userId: string,
    rpConfig: RpConfig
): Promise<
    | { ok: true; options: Awaited<ReturnType<typeof generateAuthenticationOptions>>; challenge: string }
    | { ok: false; error: string }
> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return { ok: false, error: 'employee_not_found' };

    const { data: passkeys } = await supabase
        .from('employee_passkeys')
        .select('credential_id, transports')
        .eq('employee_id', employee.id);

    if (!passkeys || passkeys.length === 0) {
        return { ok: false, error: 'no_passkeys' };
    }

    const allowCredentials = passkeys.map(p => ({
        id: p.credential_id,
        transports: (p.transports || ['internal', 'hybrid']) as AuthenticatorTransportFuture[],
    }));

    const options = await generateAuthenticationOptions({
        rpID: rpConfig.rpID,
        allowCredentials,
        userVerification: 'preferred',
    });

    return { ok: true, options, challenge: options.challenge };
}

/**
 * Verify authentication response. Sprawdza signature, weryfikuje counter,
 * aktualizuje last_used_at i counter w DB.
 *
 * Zwraca passkeyId dla audit logging gdyby kiedyś było potrzebne.
 */
export async function verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    rpConfig: RpConfig
): Promise<{ ok: true; passkeyId: string } | { ok: false; error: string }> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return { ok: false, error: 'employee_not_found' };

    // Znajdź passkey po credential ID z response
    const credentialId = response.id; // base64url string
    const { data: passkey } = await supabase
        .from('employee_passkeys')
        .select('id, credential_id, public_key, counter, transports')
        .eq('employee_id', employee.id)
        .eq('credential_id', credentialId)
        .maybeSingle();

    if (!passkey) return { ok: false, error: 'passkey_not_found' };

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: rpConfig.origin,
            expectedRPID: rpConfig.rpID,
            credential: {
                id: passkey.credential_id,
                publicKey: Buffer.from(passkey.public_key, 'base64url'),
                counter: Number(passkey.counter),
                transports: (passkey.transports || []) as AuthenticatorTransportFuture[],
            },
            requireUserVerification: false,
        });
    } catch (err) {
        console.error('[Passkey] verifyAuthentication error:', err);
        return { ok: false, error: 'verification_failed' };
    }

    if (!verification.verified) {
        return { ok: false, error: 'verification_failed' };
    }

    // Update counter + last_used_at
    const newCounter = verification.authenticationInfo.newCounter;
    await supabase
        .from('employee_passkeys')
        .update({
            counter: newCounter,
            last_used_at: new Date().toISOString(),
        })
        .eq('id', passkey.id);

    return { ok: true, passkeyId: passkey.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD: remove, rename
// ─────────────────────────────────────────────────────────────────────────────

export async function removePasskey(
    userId: string,
    passkeyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return { ok: false, error: 'employee_not_found' };

    const { error: delErr } = await supabase
        .from('employee_passkeys')
        .delete()
        .eq('id', passkeyId)
        .eq('employee_id', employee.id);

    if (delErr) {
        console.error('[Passkey] removePasskey error:', delErr);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}

export async function renamePasskey(
    userId: string,
    passkeyId: string,
    newName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const trimmed = newName.trim().slice(0, 60);
    if (trimmed.length === 0) return { ok: false, error: 'name_required' };

    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (!employee) return { ok: false, error: 'employee_not_found' };

    const { error: updateErr } = await supabase
        .from('employee_passkeys')
        .update({ device_name: trimmed })
        .eq('id', passkeyId)
        .eq('employee_id', employee.id);

    if (updateErr) {
        if (updateErr.code === '23505') return { ok: false, error: 'device_name_taken' };
        console.error('[Passkey] renamePasskey update error:', updateErr);
        return { ok: false, error: 'database_error' };
    }

    return { ok: true };
}
