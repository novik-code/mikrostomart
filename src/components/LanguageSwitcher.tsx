"use client";

import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
// IMPORTANT: use next-intl's locale-aware navigation, not next/navigation.
// next-intl's useRouter().replace(pathname, {locale}) auto-strips the existing
// locale prefix and adds the new one — and it forces a server re-render so the
// root layout reloads messages for the new locale (which next/navigation's
// router.push does NOT do, leaving the page in the old locale).
import { useRouter, usePathname } from "@/i18n/navigation";
import { useState, useRef, useEffect, useTransition } from "react";

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
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
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
     * Switch locale via next-intl's locale-aware router (Faza 2.x SEO 2026-05-09).
     * `pathname` from @/i18n/navigation is already stripped of the locale prefix,
     * and router.replace({locale}) handles re-prefixing + a hard server navigation
     * that re-renders the root layout with new messages.
     */
    function switchLocale(newLocale: string) {
        setIsOpen(false);
        if (newLocale === locale) return;
        startTransition(() => {
            router.replace(pathname, { locale: newLocale as any });
        });
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
