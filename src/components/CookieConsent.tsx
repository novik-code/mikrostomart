"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const t = useTranslations('cookies');

    useEffect(() => {
        try {
            const consent = typeof window !== 'undefined' && window.localStorage
                ? localStorage.getItem("cookie_consent")
                : 'accepted'; // treat restricted storage as already accepted
            if (!consent) {
                setIsVisible(true);
            }
        } catch {
            // localStorage blocked (private mode / strict settings) — hide banner
        }
    }, []);

    const acceptCookies = () => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem("cookie_consent", "true");
            }
        } catch {
            // ignore write errors in restricted contexts
        }
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "600px",
            background: "rgba(18, 20, 24, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--color-surface-hover)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            zIndex: 99999, // Above everything
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                    <h4 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1rem" }}>
                        {t('title')}
                    </h4>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                        {t('message')}{' '}
                        <Link href="/polityka-cookies" style={{ color: "var(--color-primary)", marginLeft: "4px", textDecoration: "underline" }}>{t('policyLink')}</Link>.{' '}
                        {t('details')}
                    </p>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button
                    onClick={acceptCookies}
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
                    {t('accept')}
                </button>
            </div>
        </div>
    );
}
