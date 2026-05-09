"use client";

import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";

const FLAGS: Record<string, string> = {
    pl: "🇵🇱",
    en: "🇬🇧",
    de: "🇩🇪",
    ua: "🇺🇦",
};

/**
 * Compact language switcher — always visible as a small flag button.
 * Hidden when `hidden` prop is true (e.g. mobile menu is open).
 * Dropdown opens on click, closes on outside click.
 */
function LanguageSwitcherInner({ hidden }: { hidden?: boolean }) {
    const locale = useLocale();
    const [isPending, setIsPending] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Close dropdown when hidden changes
    useEffect(() => {
        if (hidden) setIsOpen(false);
    }, [hidden]);

    /**
     * Switch locale by hard-reloading to the new URL.
     *
     * WHY hard reload (window.location) instead of next-intl's router.replace?
     * - NextIntlClientProvider lives in the ROOT layout (src/app/layout.tsx),
     *   which in App Router is persistent and does NOT re-render on navigation.
     * - This means SPA-style navigation leaves the locale unchanged in React tree
     *   even when the URL changes — symptoms reported 2026-05-09:
     *   • clicking 🇬🇧 changes URL to /en but content stays Polish
     *   • clicking 🇩🇪 from /en gives /en/de (next-intl's usePathname didn't strip)
     *   • can't return PL from /en (same stripping bug)
     * - Hard reload bypasses all this: browser issues a fresh request, server
     *   middleware reads the URL prefix, root layout re-runs getLocale() and
     *   passes correct locale to NextIntlClientProvider. Slightly slower (no SPA
     *   transition), but it works 100% reliably and language switching is rare.
     *
     * Manual prefix manipulation: strip any current locale prefix from the path,
     * then prepend the new one (or no prefix for default locale = PL).
     *   /en/oferta + DE  → /de/oferta
     *   /en/oferta + PL  → /oferta
     *   /oferta + EN     → /en/oferta
     */
    function switchLocale(newLocale: string) {
        setIsOpen(false);
        if (newLocale === locale) return;
        setIsPending(true);

        const currentPath = window.location.pathname;
        // Match leading /<locale> only when followed by '/' or end-of-path (avoid /endoscopy etc.)
        const localePrefixPattern = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);
        const pathWithoutLocale = currentPath.replace(localePrefixPattern, '') || '/';
        const newPath = newLocale === routing.defaultLocale
            ? pathWithoutLocale
            : `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;

        // Update NEXT_LOCALE cookie BEFORE the hard reload to override next-intl's
        // cookie-based locale detection. Without this, returning to default locale (PL)
        // fails: navigating to /oferta would 307-redirect back to /<previous-locale>/oferta
        // because the cookie still says e.g. 'de' (next-intl middleware honors the cookie
        // when URL has no locale prefix).
        // - Setting to non-default locale: cookie matches the URL prefix, no redirect.
        // - Setting to default locale (PL): clear the cookie entirely so middleware
        //   doesn't try cookie-based fallback at all.
        if (newLocale === routing.defaultLocale) {
            document.cookie = 'NEXT_LOCALE=; path=/; max-age=0; SameSite=Lax';
        } else {
            document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        }

        // Preserve query string + hash on language switch
        window.location.href = newPath + window.location.search + window.location.hash;
    }

    return (
        <div
            ref={ref}
            style={{
                position: "relative",
                zIndex: 300,
                transition: "opacity 0.2s ease, transform 0.2s ease",
                opacity: hidden ? 0 : 1,
                transform: hidden ? "scale(0.8)" : "scale(1)",
                pointerEvents: hidden ? "none" : "auto",
            }}
        >
            {/* Compact flag-only trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Change language"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(var(--color-primary-dark-rgb), 0.2)",
                    borderRadius: "8px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "0.78rem",
                    color: "var(--color-text-main, #fff)",
                    transition: "border-color 0.2s, background 0.2s",
                    opacity: isPending ? 0.6 : 1,
                    lineHeight: 1,
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--color-primary-dark-rgb), 0.5)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(var(--color-primary-dark-rgb), 0.08)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--color-primary-dark-rgb), 0.2)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
            >
                <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{FLAGS[locale]}</span>
                <span style={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    fontSize: "0.65rem",
                    opacity: 0.8,
                }}>
                    {locale}
                </span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        right: 0,
                        background: "rgba(18, 20, 24, 0.97)",
                        border: "1px solid rgba(var(--color-primary-dark-rgb), 0.15)",
                        borderRadius: "10px",
                        padding: "0.3rem 0",
                        minWidth: "110px",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.5), 0 0 15px rgba(var(--color-primary-dark-rgb),0.05)",
                        backdropFilter: "blur(16px)",
                        animation: "langFadeIn 0.15s ease-out",
                    }}
                >
                    {routing.locales.map((loc) => (
                        <button
                            key={loc}
                            onClick={() => switchLocale(loc)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                width: "100%",
                                padding: "0.4rem 0.75rem",
                                background: loc === locale ? "rgba(var(--color-primary-dark-rgb), 0.1)" : "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: loc === locale ? "var(--color-primary, #d4af37)" : "var(--color-text-main, #fff)",
                                fontSize: "0.78rem",
                                fontWeight: loc === locale ? 600 : 400,
                                textAlign: "left",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                if (loc !== locale) {
                                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = loc === locale ? "rgba(var(--color-primary-dark-rgb), 0.1)" : "transparent";
                            }}
                        >
                            <span style={{ fontSize: "0.95rem" }}>{FLAGS[loc]}</span>
                            <span style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.7rem" }}>{loc}</span>
                            {loc === locale && (
                                <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: "0.65rem" }}>✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes langFadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

/**
 * Wrapper with error boundary — gracefully hides on non-i18n pages
 */
import { Component, type ReactNode, type ErrorInfo } from "react";

class IntlErrorBoundary extends Component<
    { children: ReactNode; fallback?: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode; fallback?: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Silently swallow — not inside NextIntlClientProvider
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

export default function LanguageSwitcher({ hidden }: { hidden?: boolean }) {
    return (
        <IntlErrorBoundary>
            <LanguageSwitcherInner hidden={hidden} />
        </IntlErrorBoundary>
    );
}
