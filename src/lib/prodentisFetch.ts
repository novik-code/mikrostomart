/**
 * Prodentis API Fetch — Resilient fetch with Cloudflare Tunnel + direct IP fallback
 * ──────────────────────────────────────────────────────────────────────────────────
 * Primary:  Cloudflare Tunnel (https://pms.mikrostomartapi.com)
 * Fallback: Direct IP with port forwarding (http://83.230.40.14:3000)
 *
 * Usage:
 *   import { prodentisFetch, getProdentisUrl } from '@/lib/prodentisFetch';
 *
 *   // Simple fetch with auto-fallback:
 *   const res = await prodentisFetch('/api/doctors');
 *
 *   // Get resolved base URL (tries tunnel first):
 *   const baseUrl = await getProdentisUrl();
 */

const PRODENTIS_TUNNEL_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
const PRODENTIS_FALLBACK_URL = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * Fetch from Prodentis with automatic Cloudflare Tunnel → direct IP fallback.
 * Drop-in replacement for fetch(`${PRODENTIS_API_URL}${path}`, options).
 */
export async function prodentisFetch(path: string, options?: RequestInit): Promise<Response> {
    // Try primary (Cloudflare Tunnel)
    try {
        const res = await fetch(`${PRODENTIS_TUNNEL_URL}${path}`, {
            ...options,
            signal: options?.signal ?? AbortSignal.timeout(8000),
        });
        if (res.ok || res.status < 500) return res;
        throw new Error(`Tunnel ${res.status}`);
    } catch (tunnelErr) {
        // Tunnel failed — try fallback
    }

    // Fallback to direct IP
    const res = await fetch(`${PRODENTIS_FALLBACK_URL}${path}`, {
        ...options,
        signal: options?.signal ?? AbortSignal.timeout(8000),
    });
    return res;
}

/**
 * Returns the first reachable Prodentis base URL.
 * Useful for code that builds URLs manually.
 */
export async function getProdentisUrl(): Promise<string> {
    try {
        const res = await fetch(`${PRODENTIS_TUNNEL_URL}/api/doctors`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
        });
        if (res.ok) return PRODENTIS_TUNNEL_URL;
    } catch {
        // tunnel unavailable
    }
    return PRODENTIS_FALLBACK_URL;
}

/** Direct access to the configured URLs (no connectivity check) */
export const PRODENTIS_URLS = {
    tunnel: PRODENTIS_TUNNEL_URL,
    fallback: PRODENTIS_FALLBACK_URL,
} as const;
