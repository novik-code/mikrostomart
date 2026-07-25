/**
 * Integration tests for authGuards.
 *
 * Covers the three documented states from PLAN_HOTFIX_SPRINT S1-1:
 *   - 401 (no Supabase user)
 *   - 403 (user authenticated but missing required role)
 *   - 200 (user authenticated with required role)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
const cookiesMock = vi.fn();
const headersMock = vi.fn();
const getUserRolesMock = vi.fn();
const extractBearerTokenMock = vi.fn();
const getUserFromBearerTokenMock = vi.fn();

vi.mock("next/headers", () => ({
    cookies: cookiesMock,
    headers: headersMock,
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: () => ({
        auth: { getUser: getUserMock },
    }),
}));

vi.mock("@/lib/roles", () => ({
    getUserRoles: getUserRolesMock,
}));

vi.mock("@/lib/bearerAuth", () => ({
    extractBearerToken: extractBearerTokenMock,
    getUserFromBearerToken: getUserFromBearerTokenMock,
}));

beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
        getAll: () => [],
        set: () => {},
    });
    // Default: no Authorization header → Bearer branch is skipped, cookie path used.
    headersMock.mockResolvedValue({ get: () => null });
    extractBearerTokenMock.mockReturnValue(null);
    getUserFromBearerTokenMock.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

describe("authGuards — requireSupabaseUser", () => {
    it("returns 401 when no Supabase user", async () => {
        getUserMock.mockResolvedValue({ data: { user: null }, error: null });
        const { requireSupabaseUser } = await import("@/lib/authGuards");

        const result = await requireSupabaseUser();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(401);
        }
    });
});

describe("authGuards — requireAdmin", () => {
    it("returns 403 when user lacks admin role", async () => {
        getUserMock.mockResolvedValue({
            data: { user: { id: "user-1", email: "employee@example.com" } },
            error: null,
        });
        getUserRolesMock.mockResolvedValue(["employee"]);

        const { requireAdmin } = await import("@/lib/authGuards");
        const result = await requireAdmin();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(403);
        }
    });

    it("returns ok:true with user when user has admin role", async () => {
        const adminUser = { id: "user-2", email: "admin@example.com" };
        getUserMock.mockResolvedValue({ data: { user: adminUser }, error: null });
        getUserRolesMock.mockResolvedValue(["admin", "employee"]);

        const { requireAdmin } = await import("@/lib/authGuards");
        const result = await requireAdmin();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.user.id).toBe("user-2");
            expect(result.roles).toContain("admin");
        }
    });
});

describe("authGuards — requireEmployeeOrAdmin", () => {
    it("returns ok:true for employee role", async () => {
        getUserMock.mockResolvedValue({
            data: { user: { id: "user-3", email: "employee@example.com" } },
            error: null,
        });
        getUserRolesMock.mockResolvedValue(["employee"]);

        const { requireEmployeeOrAdmin } = await import("@/lib/authGuards");
        const result = await requireEmployeeOrAdmin();

        expect(result.ok).toBe(true);
    });

    it("returns 403 for patient-only user", async () => {
        getUserMock.mockResolvedValue({
            data: { user: { id: "user-4", email: "patient@example.com" } },
            error: null,
        });
        getUserRolesMock.mockResolvedValue(["patient"]);

        const { requireEmployeeOrAdmin } = await import("@/lib/authGuards");
        const result = await requireEmployeeOrAdmin();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(403);
        }
    });
});

describe("authGuards — native Bearer path", () => {
    it("resolves the user from a valid Bearer token without touching the cookie session", async () => {
        const bearerUser = { id: "bearer-1", email: "staff@example.com" };
        extractBearerTokenMock.mockReturnValue("valid-access-token");
        getUserFromBearerTokenMock.mockResolvedValue(bearerUser);
        getUserRolesMock.mockResolvedValue(["employee"]);

        const { requireEmployeeOrAdmin } = await import("@/lib/authGuards");
        const result = await requireEmployeeOrAdmin();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.user.id).toBe("bearer-1");
        }
        // Cookie session must NOT be consulted when a valid Bearer token is present.
        expect(getUserMock).not.toHaveBeenCalled();
    });

    it("enforces roles on the Bearer path (403 for a patient-only Bearer user)", async () => {
        extractBearerTokenMock.mockReturnValue("valid-access-token");
        getUserFromBearerTokenMock.mockResolvedValue({ id: "bearer-2", email: "p@example.com" });
        getUserRolesMock.mockResolvedValue(["patient"]);

        const { requireAdmin } = await import("@/lib/authGuards");
        const result = await requireAdmin();

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.response.status).toBe(403);
    });

    it("falls back to the cookie session when the Bearer token is invalid → 401 when neither present", async () => {
        extractBearerTokenMock.mockReturnValue("garbage-token");
        getUserFromBearerTokenMock.mockResolvedValue(null); // invalid Bearer
        getUserMock.mockResolvedValue({ data: { user: null }, error: null }); // no cookie either

        const { requireEmployeeOrAdmin } = await import("@/lib/authGuards");
        const result = await requireEmployeeOrAdmin();

        expect(getUserMock).toHaveBeenCalled(); // fell through to cookie
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.response.status).toBe(401);
    });
});
