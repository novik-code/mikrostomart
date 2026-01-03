"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("cookie_consent", "true");
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
                        🍪 Ciasteczka i Prywatność
                    </h4>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                        Strona korzysta z plików cookies w celu realizacji usług i zgodnie z
                        <Link href="/polityka-cookies" style={{ color: "var(--color-primary)", marginLeft: "4px", textDecoration: "underline" }}>Polityką Plików Cookies</Link>.
                        Możesz określić warunki przechowywania lub dostępu do mechanizmu cookie w Twojej przeglądarce.
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
                    Akceptuję
                </button>
            </div>
        </div>
    );
}
