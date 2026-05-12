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
const getUserRolesMock = vi.fn();

vi.mock("next/headers", () => ({
    cookies: cookiesMock,
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: () => ({
        auth: { getUser: getUserMock },
    }),
}));

vi.mock("@/lib/roles", () => ({
    getUserRoles: getUserRolesMock,
}));

beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
        getAll: () => [],
        set: () => {},
    });
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
