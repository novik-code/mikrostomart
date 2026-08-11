import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { verifyMfaSessionToken } from "@/lib/mfaSession";

/**
 * Native staff auth — Authorization: Bearer <supabase access_token>.
 *
 * The mobile app (React Native / Expo) logs staff in with supabase-js
 * `signInWithPassword` and sends the resulting access token as a Bearer header
 * (it has no Supabase httpOnly cookies, unlike the web browser). These helpers
 * let the shared server guards (authGuards.ts `getSupabaseUser`, auth.ts
 * `verifyAdmin`) and the middleware resolve that token to a Supabase user.
 *
 * Strictly ADDITIVE: web requests never send an Authorization header on
 * admin/employee routes (they rely on cookies), so the cookie path is
 * unchanged byte-for-byte. Callers try Bearer first and fall back to cookies.
 *
 * Mirror of the patient pattern (lib/jwt.ts `verifyTokenFromRequest`), but staff
 * use a real Supabase session (not the custom patient JWT).
 */

/** Extract a bearer token from an Authorization header value (null if absent/malformed). */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    return token || null;
}

/**
 * Resolve a Supabase user from a raw access token via GoTrue (same round-trip
 * the cookie path does). Returns null on any failure so callers fall back to the
 * cookie session. Uses the public anon key — no secrets.
 */
export async function getUserFromBearerToken(token: string): Promise<User | null> {
    if (!token) return null;
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        return user;
    } catch {
        return null;
    }
}

export type StaffMfaVerdict =
    | { ok: true }
    | { ok: false; reason: "mfa_setup_required" | "mfa_required" };

/**
 * Decide whether a native staff request satisfies 2FA. Pure mirror of the web
 * middleware `enforce2FA` rules, but for the Bearer path (proof comes from the
 * X-MFA-Session header instead of the cookie, and the caller answers with JSON):
 *
 *   - admin (or ANYONE after the deadline) without 2FA → mfa_setup_required
 *   - 2FA enabled, missing/invalid proof   → mfa_required (run the challenge)
 *   - 2FA enabled, valid proof for this user, OR non-admin without 2FA → ok
 *
 * Kept pure (no request/response objects) so the security-critical branch is
 * unit-testable in isolation.
 *
 * 🔑 `mandatoryForAll` przychodzi Z ZEWNĄTRZ, a nie z `Date.now()` w środku — inaczej
 * funkcja przestałaby być czysta i nie dałoby się przetestować obu stron terminu
 * bez przestawiania zegara procesu. Wartość liczy `isMfaMandatoryForAll()`
 * z `lib/mfaPolicy.ts` (decyzja właściciela: od 1 września 2026 dotyczy całego zespołu).
 */
export function evaluateStaffMfa(opts: {
    isAdmin: boolean;
    totpEnabled: boolean;
    proof: string | undefined;
    userId: string;
    /** Domyślnie `false` = zachowanie sprzed decyzji (2FA wymagane tylko od adminów). */
    mandatoryForAll?: boolean;
}): StaffMfaVerdict {
    if ((opts.isAdmin || opts.mandatoryForAll === true) && !opts.totpEnabled) {
        return { ok: false, reason: "mfa_setup_required" };
    }
    if (opts.totpEnabled) {
        const session = verifyMfaSessionToken(opts.proof);
        if (!session || session.userId !== opts.userId) {
            return { ok: false, reason: "mfa_required" };
        }
    }
    return { ok: true };
}
