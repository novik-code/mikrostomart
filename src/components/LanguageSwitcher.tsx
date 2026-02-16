"use client";

import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const FLAGS: Record<string, string> = {
    pl: "🇵🇱",
    en: "🇬🇧",
    de: "🇩🇪",
    ua: "🇺🇦",
};

/**
 * Inner component that uses next-intl hooks.
 * Only rendered when inside NextIntlClientProvider.
 */
function LanguageSwitcherInner() {
    const locale = useLocale();
    const router = useRouter();
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

    function switchLocale(newLocale: string) {
        setIsOpen(false);

        // Set the NEXT_LOCALE cookie (read by next-intl middleware)
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

        // Refresh the page to pick up the new locale
        startTransition(() => {
            router.refresh();
        });
    }

    return (
        <div ref={ref} style={{ position: "relative", zIndex: 300 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Change language"
                style={{
                    background: "transparent",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    borderRadius: "var(--radius-sm, 6px)",
                    padding: "0.35rem 0.6rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.85rem",
                    color: "var(--color-text-main, #fff)",
                    transition: "border-color 0.2s, background 0.2s",
                    opacity: isPending ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.borderColor = "rgba(212, 175, 55, 0.6)";
                    (e.target as HTMLElement).style.background = "rgba(212, 175, 55, 0.08)";
                }}
                onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = "rgba(212, 175, 55, 0.3)";
                    (e.target as HTMLElement).style.background = "transparent";
                }}
            >
                <span style={{ fontSize: "1.1rem" }}>{FLAGS[locale]}</span>
                <span style={{ textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.05em" }}>
                    {locale}
                </span>
                <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>▼</span>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        right: 0,
                        background: "rgba(18, 20, 24, 0.97)",
                        border: "1px solid rgba(212, 175, 55, 0.15)",
                        borderRadius: "var(--radius-md, 10px)",
                        padding: "0.4rem 0",
                        minWidth: "140px",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.5), 0 0 15px rgba(212,175,55,0.05)",
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
                                gap: "0.5rem",
                                width: "100%",
                                padding: "0.5rem 1rem",
                                background: loc === locale ? "rgba(212, 175, 55, 0.1)" : "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: loc === locale ? "var(--color-primary, #d4af37)" : "var(--color-text-main, #fff)",
                                fontSize: "0.85rem",
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
                                (e.currentTarget as HTMLElement).style.background = loc === locale ? "rgba(212, 175, 55, 0.1)" : "transparent";
                            }}
                        >
                            <span style={{ fontSize: "1.1rem" }}>{FLAGS[loc]}</span>
                            <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{loc}</span>
                            {loc === locale && (
                                <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: "0.75rem" }}>✓</span>
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
 * (admin, employee, patient portal).
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
        // Silently swallow — we're just not inside NextIntlClientProvider
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

export default function LanguageSwitcher() {
    return (
        <IntlErrorBoundary>
            <LanguageSwitcherInner />
        </IntlErrorBoundary>
    );
}
