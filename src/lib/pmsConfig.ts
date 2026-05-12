import { createClient } from "@supabase/supabase-js";

/**
 * Runtime configuration for the PMS proxy (our own server living behind the
 * Cloudflare tunnel at https://pms.mikrostomartapi.com). The proxy validates
 * an `X-API-Key` header per request; this module resolves which key to send.
 *
 * Resolution order (first hit wins):
 *   1. clinic_settings.value.apiKey   — admin-managed via /admin → PMS tab
 *   2. process.env.PRODENTIS_API_KEY  — Vercel env, fallback during cold start / DB outage
 *   3. null                            — caller is expected to return 500
 *
 * The key on the proxy supports a 30-day grace period during rotation (see
 * ~/Desktop/bałagan/Dla dewelopera mikrostomart/DLA_DEWELOPERA_ROTACJA_KLUCZA.md):
 * the admin generates a new key in PowerShell on the clinic server, pastes
 * it into the admin panel here, and within 30 days revokes the old one.
 * Our side just needs the current key — the proxy handles both-keys-active.
 *
 * Cache: 60s in-memory to avoid hitting Supabase on every PMS call. PATCH on
 * the admin endpoint calls invalidatePMSCache() so a rotation is visible
 * immediately, not after up to 60s.
 */

export type PMSSource = "db" | "env" | "none";

export interface PMSConfig {
    provider: string;
    apiUrl: string;
    apiKey: string | null;
    source: PMSSource;
    updatedAt: string | null;
    updatedBy: string | null;
}

const CACHE_TTL_MS = 60_000;
let cached: { config: PMSConfig; expires: number } | null = null;

function envFallback(): PMSConfig {
    const envKey = process.env.PRODENTIS_API_KEY || null;
    return {
        provider: process.env.NEXT_PUBLIC_PMS_PROVIDER || "prodentis",
        apiUrl: process.env.PRODENTIS_TUNNEL_URL || "https://pms.mikrostomartapi.com",
        apiKey: envKey,
        source: envKey ? "env" : "none",
        updatedAt: null,
        updatedBy: null,
    };
}

export async function getPMSConfig(): Promise<PMSConfig> {
    const now = Date.now();
    if (cached && cached.expires > now) return cached.config;

    let config: PMSConfig = envFallback();

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await supabase
            .from("clinic_settings")
            .select("value")
            .eq("key", "pms_settings")
            .maybeSingle();

        if (!error && data?.value) {
            const saved = data.value as Partial<PMSConfig> & { apiKey?: string };
            const dbKey = typeof saved.apiKey === "string" && saved.apiKey.length > 0 ? saved.apiKey : null;
            config = {
                provider: saved.provider || config.provider,
                apiUrl: saved.apiUrl || config.apiUrl,
                apiKey: dbKey || config.apiKey,
                source: dbKey ? "db" : config.source,
                updatedAt: saved.updatedAt || null,
                updatedBy: saved.updatedBy || null,
            };
        }
    } catch (err) {
        console.error("[pmsConfig] DB read failed, falling back to env:", err);
    }

    cached = { config, expires: now + CACHE_TTL_MS };
    return config;
}

export async function getProdentisKey(): Promise<string | null> {
    return (await getPMSConfig()).apiKey;
}

export async function getProdentisUrl(): Promise<string> {
    return (await getPMSConfig()).apiUrl;
}

export function invalidatePMSCache(): void {
    cached = null;
}

export function maskApiKey(key: string | null | undefined): string | null {
    if (!key) return null;
    if (key.length <= 8) return "****";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
