"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ChallengeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/pracownik";

    const [mode, setMode] = useState<"totp" | "backup">("totp");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [backupRemaining, setBackupRemaining] = useState<number | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const res = await fetch("/api/auth/2fa/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, type: mode }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(
                    data.error === "invalid_code" ? "Nieprawidłowy kod. Sprawdź czas na phone."
                    : data.error === "no_backup_codes_left" ? "Wszystkie backup codes zostały wykorzystane. Skontaktuj się z innym adminem o reset."
                    : `Błąd: ${data.error}`
                );
                return;
            }
            const data = await res.json();
            if (typeof data.backupRemaining === "number") {
                setBackupRemaining(data.backupRemaining);
                // Show backup warning for 2s then redirect
                setTimeout(() => router.replace(redirectTo), 2500);
                return;
            }
            // TOTP success — redirect immediately
            router.replace(redirectTo);
        } catch (err) {
            console.error("[2FA challenge] submit:", err);
            setError("Wystąpił błąd sieci. Spróbuj ponownie.");
        } finally {
            setSubmitting(false);
        }
    }

    if (backupRemaining !== null) {
        return (
            <div style={cardStyle}>
                <h1 style={{ color: "#10b981", fontSize: "1.5rem", marginBottom: 12 }}>
                    ✅ Zalogowano przez backup code
                </h1>
                <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                    Backup codes pozostało: <strong>{backupRemaining}/8</strong>
                </p>
                {backupRemaining <= 2 && (
                    <p style={{ color: "#fbbf24" }}>
                        ⚠️ Wygeneruj nowe backup codes w /pracownik/security
                    </p>
                )}
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Przekierowanie...</p>
            </div>
        );
    }

    return (
        <div style={cardStyle}>
            <h1 style={{ color: "#fff", fontSize: "1.5rem", marginBottom: 8 }}>
                🔒 Weryfikacja 2FA
            </h1>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>
                {mode === "totp"
                    ? "Wpisz 6-cyfrowy kod z aplikacji Authenticator"
                    : "Wpisz backup code (XXXXX-XXXXX)"}
            </p>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    inputMode={mode === "totp" ? "numeric" : "text"}
                    pattern={mode === "totp" ? "\\d{6}" : undefined}
                    maxLength={mode === "totp" ? 6 : 11}
                    autoComplete="one-time-code"
                    autoFocus
                    value={code}
                    onChange={(e) => {
                        const v = mode === "totp" ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase();
                        setCode(v);
                        // Auto-submit on TOTP when 6 digits typed
                        if (mode === "totp" && v.length === 6) {
                            const form = e.currentTarget.form;
                            if (form) setTimeout(() => form.requestSubmit(), 50);
                        }
                    }}
                    placeholder={mode === "totp" ? "123456" : "XXXXX-XXXXX"}
                    style={codeInputStyle}
                />
                {error && <p style={errorStyle}>{error}</p>}
                <button
                    type="submit"
                    disabled={submitting || !code}
                    style={{ ...primaryBtnStyle, opacity: code ? 1 : 0.5, width: "100%", marginTop: 12 }}
                >
                    {submitting ? "Weryfikacja..." : "Zaloguj się"}
                </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                    type="button"
                    onClick={() => { setMode(mode === "totp" ? "backup" : "totp"); setCode(""); setError(""); }}
                    style={linkBtnStyle}
                >
                    {mode === "totp"
                        ? "📱 Zgubiłem phone — użyj backup code"
                        : "← Wróć do kodu z Authenticator"}
                </button>
            </div>

            <div style={{ marginTop: 16, textAlign: "center" }}>
                <a href="/api/auth/signout" style={linkBtnStyle}>
                    Wyloguj
                </a>
            </div>
        </div>
    );
}

export default function ChallengePage() {
    return (
        <div style={pageStyle}>
            <Suspense fallback={<div style={cardStyle}><p style={{ color: "#94a3b8" }}>Ładowanie...</p></div>}>
                <ChallengeForm />
            </Suspense>
        </div>
    );
}

const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0a0a0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
};
const cardStyle: React.CSSProperties = {
    maxWidth: 440,
    width: "100%",
    background: "#1e293b",
    borderRadius: 12,
    padding: 32,
    border: "1px solid #334155",
};
const codeInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: "1.5rem",
    fontFamily: "monospace",
    textAlign: "center",
    letterSpacing: "0.4rem",
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #475569",
    borderRadius: 8,
};
const primaryBtnStyle: React.CSSProperties = {
    padding: "12px 24px",
    fontSize: "1rem",
    background: "linear-gradient(135deg, #d4af37, #b8941f)",
    color: "#0a0a0f",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
};
const linkBtnStyle: React.CSSProperties = {
    background: "transparent",
    color: "#94a3b8",
    border: "none",
    padding: 4,
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.85rem",
};
const errorStyle: React.CSSProperties = {
    color: "#fca5a5",
    fontSize: "0.85rem",
    marginTop: 8,
};
