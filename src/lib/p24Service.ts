/**
 * Przelewy24 (P24) configuration service — DB-first, env fallback.
 *
 * Priority:
 *  1. clinic_settings.p24_settings (Supabase) — per-tenant keys
 *  2. P24_MERCHANT_ID / P24_POS_ID / P24_CRC_KEY / P24_API_KEY env vars
 *  3. null (P24 disabled)
 *
 * SAFETY: try/catch — if DB unreachable, env fallback is always used.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export interface P24Config {
    merchantId: number | null;
    posId: number | null;
    crcKey: string | null;
    apiKey: string | null;
    sandbox: boolean;
    source: 'db' | 'env' | 'none';
    enabled: boolean;
}

interface P24Settings {
    merchant_id?: number | null;
    pos_id?: number | null;
    crc_key?: string | null;
    api_key?: string | null;
    sandbox?: boolean;
    enabled?: boolean;
}

export function getP24BaseUrl(sandbox: boolean): string {
    return sandbox
        ? 'https://sandbox.przelewy24.pl'
        : 'https://secure.przelewy24.pl';
}

/**
 * Calculate SHA-384 sign for P24 transaction registration.
 * Params object is JSON-stringified then hashed.
 */
export function calcP24Sign(params: Record<string, unknown>, crcKey: string): string {
    const data = JSON.stringify(params);
    return createHash('sha384').update(data + crcKey).digest('hex');
}

/**
 * Calculate SHA-384 sign for P24 webhook verification.
 */
export function calcP24WebhookSign(
    sessionId: string,
    orderId: number,
    amount: number,
    currency: string,
    crcKey: string
): string {
    const params = { sessionId, orderId, amount, currency, crc: crcKey };
    const data = JSON.stringify(params);
    return createHash('sha384').update(data).digest('hex');
}

/**
 * Load P24 config: DB-first with env fallback.
 * Safe to call from any API route — never throws.
 */
export async function getP24Config(): Promise<P24Config> {
    // Env fallback values
    const envMerchantId = process.env.P24_MERCHANT_ID ? Number(process.env.P24_MERCHANT_ID) : null;
    const envPosId = process.env.P24_POS_ID ? Number(process.env.P24_POS_ID) : null;
    const envCrcKey = process.env.P24_CRC_KEY || null;
    const envApiKey = process.env.P24_API_KEY || null;
    const envSandbox = process.env.P24_SANDBOX !== 'false'; // default: sandbox=true

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from('clinic_settings')
            .select('value')
            .eq('key', 'p24_settings')
            .single();

        if (!error && data?.value) {
            const s = data.value as P24Settings;
            const hasDb = !!(s.merchant_id && s.pos_id && s.crc_key && s.api_key);
            const enabled = s.enabled ?? false;

            if (hasDb && enabled) {
                return {
                    merchantId: s.merchant_id!,
                    posId: s.pos_id!,
                    crcKey: s.crc_key!,
                    apiKey: s.api_key!,
                    sandbox: s.sandbox ?? true,
                    source: 'db',
                    enabled: true,
                };
            }
        }
    } catch (err) {
        console.error('[p24Service] DB read failed, using env fallback:', err);
    }

    // Env fallback
    if (envMerchantId && envPosId && envCrcKey && envApiKey) {
        return {
            merchantId: envMerchantId,
            posId: envPosId,
            crcKey: envCrcKey,
            apiKey: envApiKey,
            sandbox: envSandbox,
            source: 'env',
            enabled: true,
        };
    }

    return {
        merchantId: null,
        posId: null,
        crcKey: null,
        apiKey: null,
        sandbox: true,
        source: 'none',
        enabled: false,
    };
}
