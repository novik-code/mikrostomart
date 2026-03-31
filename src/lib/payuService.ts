/**
 * PayU REST API v2.1 configuration service — DB-first, env fallback.
 *
 * Authentication: OAuth2 client_credentials → Bearer token
 * Sandbox:    https://secure.snd.payu.com
 * Production: https://secure.payu.com
 *
 * Priority:
 *  1. clinic_settings.payu_settings (Supabase) — per-tenant keys
 *  2. PAYU_POS_ID / PAYU_CLIENT_ID / PAYU_CLIENT_SECRET / PAYU_SECOND_KEY env vars
 *  3. null (PayU disabled)
 *
 * Default SANDBOX credentials (PayU's public test account):
 *  posId: 300746, clientId: 300746
 *  clientSecret: 2ee86a66e5d97e3fadc400c9f19b065d
 *  secondKey: b6ca15b0d1020e8094d9b5f8d163db54
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export interface PayUConfig {
    posId: string | null;
    clientId: string | null;
    clientSecret: string | null;
    secondKey: string | null;
    sandbox: boolean;
    source: 'db' | 'env' | 'defaults' | 'none';
    enabled: boolean;
}

interface PayUSettings {
    pos_id?: string | null;
    client_id?: string | null;
    client_secret?: string | null;
    second_key?: string | null;
    sandbox?: boolean;
    enabled?: boolean;
}

// PayU public sandbox test credentials
const SANDBOX_DEFAULTS = {
    posId: '300746',
    clientId: '300746',
    clientSecret: '2ee86a66e5d97e3fadc400c9f19b065d',
    secondKey: 'b6ca15b0d1020e8094d9b5f8d163db54',
};

export function getPayUBaseUrl(sandbox: boolean): string {
    return sandbox ? 'https://secure.snd.payu.com' : 'https://secure.payu.com';
}

/**
 * Verify PayU webhook signature.
 * PayU sends OpenPayU-Signature header: sender=checkout;signature=HASH;algorithm=MD5
 */
export function verifyPayUSignature(body: string, header: string, secondKey: string): boolean {
    const signatureMatch = header.match(/signature=([^;]+)/);
    if (!signatureMatch) return false;
    const receivedSig = signatureMatch[1];
    const expectedSig = createHash('md5').update(body + secondKey).digest('hex');
    return receivedSig === expectedSig;
}

/**
 * Get OAuth2 Bearer token from PayU.
 */
export async function getPayUToken(config: PayUConfig): Promise<string> {
    const baseUrl = getPayUBaseUrl(config.sandbox);
    const res = await fetch(`${baseUrl}/pl/standard/user/oauth/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.clientId!,
            client_secret: config.clientSecret!,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`PayU OAuth failed: ${err}`);
    }
    const data = await res.json();
    return data.access_token;
}

/**
 * Load PayU config: DB-first, env fallback, then sandbox defaults.
 * Safe to call from any API route — never throws.
 */
export async function getPayUConfig(): Promise<PayUConfig> {
    // Env fallback
    const envPosId = process.env.PAYU_POS_ID || null;
    const envClientId = process.env.PAYU_CLIENT_ID || null;
    const envClientSecret = process.env.PAYU_CLIENT_SECRET || null;
    const envSecondKey = process.env.PAYU_SECOND_KEY || null;
    const envSandbox = process.env.PAYU_SANDBOX !== 'false'; // default: sandbox=true

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from('clinic_settings')
            .select('value')
            .eq('key', 'payu_settings')
            .single();

        if (!error && data?.value) {
            const s = data.value as PayUSettings;
            const hasAll = !!(s.pos_id && s.client_id && s.client_secret && s.second_key);
            const enabled = s.enabled ?? false;

            if (hasAll && enabled) {
                return {
                    posId: s.pos_id!,
                    clientId: s.client_id!,
                    clientSecret: s.client_secret!,
                    secondKey: s.second_key!,
                    sandbox: s.sandbox ?? true,
                    source: 'db',
                    enabled: true,
                };
            }
        }
    } catch (err) {
        console.error('[payuService] DB read failed, using env fallback:', err);
    }

    // Env fallback
    if (envPosId && envClientId && envClientSecret && envSecondKey) {
        return {
            posId: envPosId,
            clientId: envClientId,
            clientSecret: envClientSecret,
            secondKey: envSecondKey,
            sandbox: envSandbox,
            source: 'env',
            enabled: true,
        };
    }

    // PayU public sandbox defaults — always available for testing
    if (process.env.NODE_ENV !== 'production') {
        return { ...SANDBOX_DEFAULTS, sandbox: true, source: 'defaults', enabled: true };
    }

    return {
        posId: null, clientId: null, clientSecret: null, secondKey: null,
        sandbox: true, source: 'none', enabled: false,
    };
}
