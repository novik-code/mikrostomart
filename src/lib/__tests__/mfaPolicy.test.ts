/**
 * Polityka 2FA: termin 1 września 2026 i jego wpływ na decyzję o dostępie.
 *
 * Dlaczego te testy istnieją: decyzja właściciela (2026-08-11) zamienia 2FA
 * z obowiązku ADMINÓW w obowiązek CAŁEGO zespołu — ale dopiero od 1 września.
 * To znaczy, że wdrożenie ma być **niewidoczne aż do terminu**, a potem zadziałać
 * samo. Jednego i drugiego nie da się sprawdzić na produkcji przed 1 września,
 * więc jedynym dowodem jest test po OBU stronach daty.
 *
 * 🪤 Drugi powód: `evaluateStaffMfa` to bramka bezpieczeństwa. Pomyłka w kierunku
 * warunku (`&&` zamiast `||`, albo domyślne `true`) albo odcięłaby cały zespół
 * przed czasem, albo nie odcięłaby nikogo po terminie — i w obu przypadkach
 * `tsc` byłby zielony.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
    createClient: () => ({ auth: { getUser: vi.fn() } }),
}));

beforeEach(() => {
    process.env.MFA_SESSION_SECRET = "a".repeat(64);
});

const PRZED = Date.parse("2026-08-31T23:59:00+02:00"); // minuta przed terminem
const PO = Date.parse("2026-09-01T00:01:00+02:00"); // minuta po terminie
const USER = "11111111-1111-4111-8111-111111111111";

describe("mfaPolicy — termin", () => {
    it("granica wypada 1 września 2026 o północy CZASU GABINETU, nie UTC", async () => {
        const { isMfaMandatoryForAll, MFA_MANDATORY_FROM_MS } = await import("@/lib/mfaPolicy");
        // 🪤 Vercel chodzi w UTC. Gdyby offset zgubiono, wymuszenie ruszyłoby o 02:00
        // czasu gabinetu 31 sierpnia — czyli dzień wcześniej, niż mówi mail do zespołu.
        expect(new Date(MFA_MANDATORY_FROM_MS).toISOString()).toBe("2026-08-31T22:00:00.000Z");
        expect(isMfaMandatoryForAll(PRZED)).toBe(false);
        expect(isMfaMandatoryForAll(PO)).toBe(true);
    });

    it("odlicza dni do terminu", async () => {
        const { daysUntilMfaDeadline } = await import("@/lib/mfaPolicy");
        expect(daysUntilMfaDeadline(Date.parse("2026-08-11T12:00:00+02:00"))).toBe(20);
        expect(daysUntilMfaDeadline(PO)).toBeLessThan(0);
    });
});

describe("evaluateStaffMfa — przed terminem zachowanie BEZ ZMIAN", () => {
    it("pracownik bez 2FA wchodzi (jak dotąd)", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        expect(
            evaluateStaffMfa({
                isAdmin: false,
                totpEnabled: false,
                proof: undefined,
                userId: USER,
                epoch: 0,
                mandatoryForAll: false,
            }),
        ).toEqual({ ok: true });
    });

    it("BEZ podania flagi też wpuszcza — domyślna wartość nie może odciąć zespołu", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        // Gdyby domyślka była `true`, każdy wołający, który zapomni przekazać flagę,
        // zamknąłby panel całemu zespołowi natychmiast po wdrożeniu.
        expect(
            evaluateStaffMfa({ isAdmin: false, totpEnabled: false, proof: undefined, userId: USER, epoch: 0 }),
        ).toEqual({ ok: true });
    });

    it("admin bez 2FA nadal odbity (reguła sprzed decyzji zostaje)", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        expect(
            evaluateStaffMfa({
                isAdmin: true,
                totpEnabled: false,
                proof: undefined,
                userId: USER,
                epoch: 0,
                mandatoryForAll: false,
            }),
        ).toEqual({ ok: false, reason: "mfa_setup_required" });
    });
});

describe("evaluateStaffMfa — po terminie obowiązuje KAŻDEGO", () => {
    it("pracownik bez 2FA dostaje mfa_setup_required", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        expect(
            evaluateStaffMfa({
                isAdmin: false,
                totpEnabled: false,
                proof: undefined,
                userId: USER,
                epoch: 0,
                mandatoryForAll: true,
            }),
        ).toEqual({ ok: false, reason: "mfa_setup_required" });
    });

    it("pracownik Z 2FA i ważnym dowodem wchodzi — termin nie blokuje skonfigurowanych", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const proof = createMfaSessionToken(USER);
        expect(
            evaluateStaffMfa({
                isAdmin: false,
                totpEnabled: true,
                proof,
                userId: USER,
                epoch: 0,
                mandatoryForAll: true,
            }),
        ).toEqual({ ok: true });
    });

    it("cudzy dowód nie przechodzi także po terminie", async () => {
        const { evaluateStaffMfa } = await import("@/lib/bearerAuth");
        const { createMfaSessionToken } = await import("@/lib/mfaSession");
        const proof = createMfaSessionToken("22222222-2222-4222-8222-222222222222");
        expect(
            evaluateStaffMfa({
                isAdmin: false,
                totpEnabled: true,
                proof,
                userId: USER,
                epoch: 0,
                mandatoryForAll: true,
            }),
        ).toEqual({ ok: false, reason: "mfa_required" });
    });
});

describe("Mail wzywający — treść i bezpieczeństwo linku", () => {
    it("temat i treść niosą termin, a odliczanie zmienia ton przed i po", async () => {
        const { mfaEnrollmentSubject, mfaEnrollmentHtml } = await import("@/lib/mfaEnrollmentEmail");
        const przed = Date.parse("2026-08-12T10:00:00+02:00");
        expect(mfaEnrollmentSubject(przed)).toContain("1 września 2026");
        expect(mfaEnrollmentHtml("Anna", przed)).toContain("1 września 2026");
        // Po terminie mail nie może dalej mówić „zdąż do…", bo termin już minął.
        expect(mfaEnrollmentSubject(PO)).not.toContain("Do 1 września");
        expect(mfaEnrollmentHtml(undefined, PO)).toContain("Termin minął");
    });

    it("🔴 link NIE NIESIE tokenu — inaczej przechwycony mail = przejęcie konta", async () => {
        const { mfaEnrollmentHtml, MFA_SETUP_URL } = await import("@/lib/mfaEnrollmentEmail");
        const html = mfaEnrollmentHtml("Anna");
        expect(MFA_SETUP_URL).toMatch(/\/pracownik\/security$/);
        // Żaden parametr, który mógłby uwierzytelniać sam z siebie.
        expect(html).not.toMatch(/[?&](token|t|code|key|otp)=/i);
    });

    it("imię jest escapowane — pole `name` pochodzi z bazy, nie z literału", async () => {
        const { mfaEnrollmentHtml } = await import("@/lib/mfaEnrollmentEmail");
        const html = mfaEnrollmentHtml('<script>alert(1)</script>');
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("instrukcja opisuje kreator TAKI, JAKI JEST (3 kroki, 8 kodów ratunkowych)", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const { mfaEnrollmentHtml } = await import("@/lib/mfaEnrollmentEmail");
        const html = mfaEnrollmentHtml("Anna");
        const page = fs.readFileSync(
            path.join(process.cwd(), "src/app/pracownik/security/page.tsx"),
            "utf8",
        );
        // Instrukcja rozjeżdżająca się z ekranem jest gorsza niż jej brak — czytelnik
        // uznaje, że trafił w złe miejsce, i przestaje ufać całej wiadomości.
        expect(page).toContain("Krok 1 z 3");
        expect(html).toContain("trzy kroki");
        expect(page).toMatch(/8 kod/i);
        expect(html).toMatch(/8 kod/i);
    });
});

describe("Przycisk w panelu admina — okablowanie", () => {
    it("celuje w ISTNIEJĄCĄ trasę i ma osobny podgląd przed wysyłką", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const tab = fs.readFileSync(
            path.join(process.cwd(), "src/app/admin/components/SecurityTab.tsx"),
            "utf8",
        );
        // Literówka w adresie dałaby MARTWY przycisk przy zielonym `tsc` — komponent
        // woła trasę stringiem, więc nikt tego nie sprawdza poza tym testem.
        const route = "/api/admin/2fa/enrollment-reminder";
        expect(tab).toContain(`fetch("${route}"`);
        expect(
            fs.existsSync(path.join(process.cwd(), `src/app${route}/route.ts`)),
            "trasa wołana przez panel nie istnieje na dysku",
        ).toBe(true);
        // Podgląd musi być osobną ścieżką, a realna wysyłka potwierdzana —
        // to jedyna wysyłka lecąca do całego zespołu naraz.
        expect(tab).toContain('dryRun: mode === "preview"');
        expect(tab).toContain("confirm(");
    });
});

describe("Zakleszczenie: po terminie MUSI dać się dojść do kreatora", () => {
    it("SKIP_2FA_PATHS w middleware obejmuje stronę konfiguracji i trasy 2FA", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const src = fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
        // Bez tych dwóch wyjątków pracownik bez 2FA po 1 września nie miałby JAK
        // włączyć 2FA — bramka odbijałaby go z ekranu, na którym się je konfiguruje.
        expect(src).toContain("'/pracownik/security'");
        expect(src).toContain("'/api/auth/2fa/'");
    });

    it("strona konfiguracji nie woła tras spoza wyjątków", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const page = fs.readFileSync(
            path.join(process.cwd(), "src/app/pracownik/security/page.tsx"),
            "utf8",
        );
        const routes = [...page.matchAll(/['"`](\/api\/[a-z0-9/_[\]-]+)/gi)].map((m) => m[1]);
        // Dozwolone: pominięte w bramce (`/api/auth/2fa/`) albo w ogóle poza jej
        // zasięgiem (`/api/auth/passkeys`, `/api/auth/signout` — nie zaczynają się
        // od żadnego PROTECTED_PREFIXES).
        const zle = routes.filter(
            (r) => !r.startsWith("/api/auth/2fa/") && !r.startsWith("/api/auth/"),
        );
        expect(zle, `kreator woła trasy, które bramka zablokuje po terminie: ${zle.join(", ")}`)
            .toEqual([]);
    });
});
