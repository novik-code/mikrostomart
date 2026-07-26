/**
 * Regresja bezpieczeństwa: POST /api/auth/2fa/devices wymaga DOWODU POSIADANIA
 * aktualnego drugiego czynnika, gdy konto ma już włączone 2FA.
 *
 * Dlaczego ten test istnieje:
 * `/api/auth/2fa/` jest w `SKIP_2FA_PATHS` (middleware nie egzekwuje tam 2FA), a endpoint
 * zwraca `secret` nowego urządzenia. Bez tej kontroli sesja zdobyta SAMYM HASŁEM mogła:
 *   POST /devices → odczytać `secret` → policzyć z niego kod → /verify → /challenge
 * czyli obejść drugi czynnik w całości. Test pilnuje, żeby ta bramka nie zniknęła.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireEmployeeOrAdminMock = vi.fn();
const getTwoFactorStatusMock = vi.fn();
const addDeviceMock = vi.fn();
const verifyChallengeMock = vi.fn();
const verifyBackupChallengeMock = vi.fn();
const cookiesMock = vi.fn();

vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));
vi.mock("@/lib/authGuards", () => ({
    requireEmployeeOrAdmin: () => requireEmployeeOrAdminMock(),
}));
vi.mock("@/lib/twoFactorService", () => ({
    listDevices: vi.fn(),
    addDevice: (...a: unknown[]) => addDeviceMock(...a),
    getTwoFactorStatus: (...a: unknown[]) => getTwoFactorStatusMock(...a),
    verifyChallenge: (...a: unknown[]) => verifyChallengeMock(...a),
    verifyBackupChallenge: (...a: unknown[]) => verifyBackupChallengeMock(...a),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
    vi.clearAllMocks();
    process.env.MFA_SESSION_SECRET = "a".repeat(64);
    requireEmployeeOrAdminMock.mockResolvedValue({
        ok: true,
        user: { id: USER_ID, email: "pracownik@example.com" },
    });
    addDeviceMock.mockResolvedValue({
        ok: true,
        data: { deviceId: "d1", qrDataUrl: "data:", otpauthUrl: "otpauth://", secret: "S3CRET", backupCodes: null },
    });
    verifyChallengeMock.mockResolvedValue({ ok: false, error: "invalid_code" });
    verifyBackupChallengeMock.mockResolvedValue({ ok: false, error: "invalid_code" });
    cookiesMock.mockResolvedValue({ get: () => undefined });
});

async function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/auth/2fa/devices/route");
    const req = new Request("https://x/api/auth/2fa/devices", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
    // Route używa NextRequest tylko do .headers i .json() — Request wystarcza.
    return POST(req as never);
}

describe("POST /api/auth/2fa/devices — dowód posiadania", () => {
    it("ODMAWIA, gdy konto ma 2FA a żądanie nie niesie żadnego dowodu (sesja z samym hasłem)", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        const res = await post({ deviceName: "Nowe" });
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({ error: "proof_required" });
        expect(addDeviceMock).not.toHaveBeenCalled();
    });

    it("NIE ujawnia sekretu przy odmowie", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        const res = await post({});
        expect(JSON.stringify(await res.json())).not.toContain("S3CRET");
    });

    it("FAIL-CLOSED: odmawia, gdy nie da się ustalić stanu 2FA (null z bazy)", async () => {
        getTwoFactorStatusMock.mockResolvedValue(null);
        const res = await post({ deviceName: "Nowe" });
        expect(res.status).toBe(403);
        expect(addDeviceMock).not.toHaveBeenCalled();
    });

    it("PRZEPUSZCZA pierwsze urządzenie, gdy 2FA nie jest jeszcze włączone", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: false });
        const res = await post({ deviceName: "Pierwsze" });
        expect(res.status).toBe(200);
        expect(addDeviceMock).toHaveBeenCalled();
    });

    it("PRZEPUSZCZA przy poprawnym kodzie TOTP z aktywnego urządzenia", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        verifyChallengeMock.mockResolvedValue({ ok: true, deviceId: "d0" });
        const res = await post({ deviceName: "Drugie", code: "123456" });
        expect(res.status).toBe(200);
        expect(addDeviceMock).toHaveBeenCalled();
    });

    it("PRZEPUSZCZA przy kodzie zapasowym, ale dopiero po nieudanym TOTP (kod jest jednorazowy)", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        verifyBackupChallengeMock.mockResolvedValue({ ok: true, remaining: 7 });
        const res = await post({ code: "backup-code" });
        expect(res.status).toBe(200);
        expect(verifyChallengeMock).toHaveBeenCalled();
        expect(verifyBackupChallengeMock).toHaveBeenCalled();
    });

    it("PRZEPUSZCZA przy ważnej sesji MFA z nagłówka X-MFA-Session (tor apki)", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const res = await post({}, { "x-mfa-session": createMfaSessionToken(USER_ID) });
        expect(res.status).toBe(200);
        // Dowód z sesji wystarcza — kodów nie sprawdzamy.
        expect(verifyChallengeMock).not.toHaveBeenCalled();
    });

    it("ODRZUCA sesję MFA wystawioną dla INNEGO użytkownika", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const other = createMfaSessionToken("22222222-2222-4222-8222-222222222222");
        const res = await post({}, { "x-mfa-session": other });
        expect(res.status).toBe(403);
    });

    it("PRZEPUSZCZA przy ważnym cookie sesji MFA (tor weba — brak regresji)", async () => {
        getTwoFactorStatusMock.mockResolvedValue({ enabled: true });
        const { createMfaSessionToken, MFA_COOKIE_NAME } = await import("@/lib/mfaSession");
        const token = createMfaSessionToken(USER_ID);
        cookiesMock.mockResolvedValue({
            get: (n: string) => (n === MFA_COOKIE_NAME ? { value: token } : undefined),
        });
        const res = await post({});
        expect(res.status).toBe(200);
    });
});
