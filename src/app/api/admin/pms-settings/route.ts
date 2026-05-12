import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuards";
import { createClient } from "@supabase/supabase-js";
import { getPMSConfig, invalidatePMSCache, maskApiKey } from "@/lib/pmsConfig";

export const dynamic = "force-dynamic";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SETTINGS_ROW = "pms_settings";

/**
 * GET /api/admin/pms-settings
 * Returns the resolved PMS configuration with the API key masked. The raw key
 * is never returned to the client even for admins — once saved it can only be
 * overwritten, not read back.
 */
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const config = await getPMSConfig();
    let notes = "";
    try {
        const { data } = await supabase
            .from("clinic_settings")
            .select("value")
            .eq("key", SETTINGS_ROW)
            .maybeSingle();
        notes = (data?.value as { notes?: string } | null)?.notes || "";
    } catch {
        // ignore — notes are cosmetic
    }

    return NextResponse.json({
        provider: config.provider,
        apiUrl: config.apiUrl,
        hasApiKey: !!config.apiKey,
        api_key_masked: maskApiKey(config.apiKey),
        source: config.source,
        notes,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
    });
}

/**
 * PATCH /api/admin/pms-settings
 * Body: { provider?, apiKey?, apiUrl?, notes? }
 * - apiKey: when supplied (non-empty), saved to clinic_settings and used by
 *   getProdentisKey() going forward. Send empty string to clear DB key and
 *   fall back to env var.
 * - apiUrl: optional override of the proxy URL (defaults to env).
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const { provider, notes, apiKey, apiUrl } = body as {
        provider?: string;
        notes?: string;
        apiKey?: string;
        apiUrl?: string;
    };

    const allowedProviders = ["prodentis", "standalone"];
    if (provider && !allowedProviders.includes(provider)) {
        return NextResponse.json(
            { error: `Unknown provider: ${provider}. Allowed: ${allowedProviders.join(", ")}` },
            { status: 400 }
        );
    }

    // Load existing row so we preserve fields the caller didn't touch.
    const { data: existing } = await supabase
        .from("clinic_settings")
        .select("value")
        .eq("key", SETTINGS_ROW)
        .maybeSingle();
    const current = (existing?.value as Record<string, unknown> | null) || {};

    const value: Record<string, unknown> = {
        ...current,
        provider: provider ?? current.provider ?? "prodentis",
        notes: notes ?? current.notes ?? "",
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
    };

    if (apiKey !== undefined) {
        // Empty string explicitly clears the DB key (so we fall back to env).
        value.apiKey = apiKey.length > 0 ? apiKey : undefined;
        if (value.apiKey === undefined) delete value.apiKey;
    }
    if (apiUrl !== undefined) {
        value.apiUrl = apiUrl.length > 0 ? apiUrl : undefined;
        if (value.apiUrl === undefined) delete value.apiUrl;
    }

    const { error } = await supabase
        .from("clinic_settings")
        .upsert({ key: SETTINGS_ROW, value }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidatePMSCache();

    return NextResponse.json({
        success: true,
        api_key_masked: maskApiKey(typeof value.apiKey === "string" ? value.apiKey : null),
        source: typeof value.apiKey === "string" ? "db" : (process.env.PRODENTIS_API_KEY ? "env" : "none"),
    });
}

/**
 * POST /api/admin/pms-settings?action=health
 * Pings the proxy `/api/health` with the currently resolved key. Accepts an
 * optional `apiKey` in the body to test a key before saving it.
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") !== "health") {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const overrideKey = typeof (body as { apiKey?: string }).apiKey === "string" ? (body as { apiKey: string }).apiKey : null;

    const config = await getPMSConfig();
    const provider = config.provider;

    if (provider === "standalone") {
        try {
            const { error } = await supabase.from("employees").select("id").limit(1);
            if (error) throw error;
            return NextResponse.json({ healthy: true, provider, message: "Supabase połączony ✅" });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "unknown";
            return NextResponse.json({ healthy: false, provider, message: `Supabase error: ${msg}` });
        }
    }

    // Prodentis health endpoint is open (no X-API-Key needed per v10.1 docs),
    // but we send the key anyway so we can spot 401 if the proxy starts
    // requiring it on reads in the future.
    const keyToTest = overrideKey || config.apiKey;
    const apiUrl = config.apiUrl;
    try {
        const headers: Record<string, string> = {};
        if (keyToTest) headers["X-API-Key"] = keyToTest;
        const res = await fetch(`${apiUrl}/api/health`, { headers, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const detail = await res.json().catch(() => ({}));
            return NextResponse.json({
                healthy: true,
                provider,
                message: `Prodentis API dostępne ✅ (${apiUrl})`,
                detail,
                keyTested: keyToTest ? "yes" : "no",
            });
        }
        return NextResponse.json({
            healthy: false,
            provider,
            message: `Prodentis API status ${res.status} ❌ (${apiUrl})`,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        return NextResponse.json({ healthy: false, provider, message: `Prodentis niedostępny: ${msg} (${apiUrl})` });
    }
}
