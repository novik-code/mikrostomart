/**
 * Tests for native staff Bearer auth helpers (lib/bearerAuth.ts).
 *
 * Covers:
 *   - extractBearerToken (pure header parsing)
 *   - getUserFromBearerToken (GoTrue round-trip, error/throw → null)
 *   - evaluateStaffMfa (security-critical native 2FA decision, real HMAC tokens)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();

// mfaSession (real) transitively imports next/headers — stub it so importing the
// module under test doesn't require a Next request context. createMfaSessionToken /
// verifyMfaSessionToken never call cookies(), so the real crypto logic is exercised.
vi.mock("next/headers", () => ({
    cookies: vi.fn(),
    headers: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: () => ({ auth: { getUser: getUserMock } }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    // 64 hex chars — satisfies mfaSession getSecret() (min 32).
    process.env.MFA_SESSION_SECRET = "a".repeat(64);
});

describe("extractBearerToken", () => {
    it("returns the token from a well-formed header", async () => {
        const { extractBearerToken } = await import("@/lib/bearerAuth");
        expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    });

    it("returns null for missing / non-Bearer / empty headers", async () => {
        const { extractBearerToken } = await import("@/lib/bearerAuth");
        expect(extractBearerToken(null)).toBeNull();
        expect(extractBearerToken(undefined)).toBeNull();
        expect(extractBearerToken("Basic xyz")).toBeNull();
        expect(extractBearerToken("Bearer ")).toBeNull();
        expect(extractBearerToken("Bearer    ")).toBeNull();
    });
});

describe("getUserFromBearerToken", () => {
    it("returns the user when GoTrue validates the token", async () => {
        getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
        const { getUserFromBearerToken } = await import("@/lib/bearerAuth");
        const user = await getUserFromBearerToken("good-token");
        expect(user?.id).toBe("u1");
    });

    it("returns null on GoTrue error, no user, or a thrown exception", async () => {
        const { getUserFromBearerToken } = await import("@/lib/bearerAuth");

        getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
        expect(await getUserFromBearerToken("bad-token")).toBeNull();

        getUserMock.mockResolvedValue({ data: { user: null }, error: null });
        expect(await getUserFromBearerToken("no-user")).toBeNull();

        getUserMock.mockRejectedValue(new Error("network"));
        expect(await getUserFromBearerToken("throws")).toBeNull();

        expect(await getUserFromBearerToken("")).toBeNull();
    });
});

describe("evaluateStaffMfa (native 2FA gate)", () => {
    it("blocks an admin without 2FA enabled (must finish setup on web)", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const verdict = evaluateStaffMfa({ isAdmin: true, totpEnabled: false, proof: undefined, userId: "a1", epoch: 0 });
        expect(verdict).toEqual({ ok: false, reason: "mfa_setup_required" });
    });

    it("allows a non-admin employee without 2FA (mirrors web)", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const verdict = evaluateStaffMfa({ isAdmin: false, totpEnabled: false, proof: undefined, userId: "e1", epoch: 0 });
        expect(verdict.ok).toBe(true);
    });

    it("requires an MFA proof when 2FA is enabled and none is provided", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const verdict = evaluateStaffMfa({ isAdmin: true, totpEnabled: true, proof: undefined, userId: "a1", epoch: 0 });
        expect(verdict).toEqual({ ok: false, reason: "mfa_required" });
    });

    it("rejects a validly-signed token that belongs to a DIFFERENT user", async () => {
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const tokenForOther = createMfaSessionToken("someone-else");
        const verdict = evaluateStaffMfa({ isAdmin: true, totpEnabled: true, proof: tokenForOther, userId: "a1", epoch: 0 });
        expect(verdict).toEqual({ ok: false, reason: "mfa_required" });
    });

    it("accepts a valid, matching, unexpired MFA token", async () => {
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const token = createMfaSessionToken("a1");
        const verdict = evaluateStaffMfa({ isAdmin: true, totpEnabled: true, proof: token, userId: "a1", epoch: 0 });
        expect(verdict.ok).toBe(true);
    });

    /**
     * 🔒 Tor NATYWNY (apka) po resecie 2FA — migracja 191. Apka trzyma `mfaToken`
     * w SecureStore i wysyła go w `X-MFA-Session`; bez epoki reset u admina nie
     * odbierał telefonowi dostępu do strefy pracownika.
     */
    it("odrzuca token apki sprzed resetu 2FA (mfa_epoch)", async () => {
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const stary = createMfaSessionToken("a1", true, 0);
        const verdict = evaluateStaffMfa({ isAdmin: true, totpEnabled: true, proof: stary, userId: "a1", epoch: 1 });
        expect(verdict).toEqual({ ok: false, reason: "mfa_required" });
    });

    it("przepuszcza token apki wystawiony po resecie", async () => {
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const swiezy = createMfaSessionToken("a1", true, 1);
        const verdict = evaluateStaffMfa({ isAdmin: true, totpEnabled: true, proof: swiezy, userId: "a1", epoch: 1 });
        expect(verdict.ok).toBe(true);
    });
});
