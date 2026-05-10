"use client";

/**
 * Client-side button for the (otherwise server-rendered) CookieConsent banner.
 *
 * Faza G4 (2026-05-10): banner sam jest server component czytający HTTP cookie
 * `cookie_consent` przez `next/headers`. Po kliknięciu accept ten button:
 *   1. Ustawia HTTP cookie (1 rok) — server-side widzi przy następnym żądaniu
 *   2. Mirror do localStorage (backward compat z poprzednią wersją)
 *   3. Ukrywa banner przez `display: none` na rodzicu (instant feedback bez full reload)
 */
export function CookieConsentButton({ acceptText }: { acceptText: string }) {
    const handleClick = () => {
        const oneYearSeconds = 365 * 24 * 60 * 60;
        document.cookie = `cookie_consent=true; path=/; max-age=${oneYearSeconds}; SameSite=Lax`;

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem("cookie_consent", "true");
            }
        } catch {
            // localStorage blocked (private mode etc.) — HTTP cookie wystarczy
        }

        // Hide banner immediately without page reload
        const banner = document.querySelector<HTMLElement>('[data-cookie-banner]');
        if (banner) banner.style.display = 'none';
    };

    return (
        <button
            onClick={handleClick}
            style={{
                padding: "0.6rem 1.5rem",
                background: "var(--color-primary)",
                color: "black",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "0.9rem"
            }}
        >
            {acceptText}
        </button>
    );
}
