"use client";

import { Suspense, useEffect, useState } from "react";
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
    const [remember, setRemember] = useState(false);

    // Passkey support detection
    const [passkeyAvailable, setPasskeyAvailable] = useState(false);
    const [passkeySubmitting, setPasskeySubmitting] = useState(false);

    useEffect(() => {
        // Sprawdź czy WebAuthn jest dostępny w przeglądarce
        if (typeof window !== "undefined" && "PublicKeyCredential" in window) {
            setPasskeyAvailable(true);
        }
    }, []);

    async function handlePasskeyLogin() {
        setError("");
        setPasskeySubmitting(true);
        try {
            // 1. Begin: server zwraca options + sets challenge cookie
            const beginRes = await fetch("/api/auth/passkeys/authenticate/begin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!beginRes.ok) {
                const data = await beginRes.json();
                if (data.error === "no_passkeys") {
                    setError("Brak zarejestrowanych kluczy biometrycznych na tym koncie. Użyj kodu TOTP.");
                } else {
                    setError(`Błąd: ${data.error}`);
                }
                return;
            }
            const { options } = await beginRes.json();

            // 2. Browser API: prompt biometric
            const { startAuthentication } = await import("@simplewebauthn/browser");
            let authResponse;
            try {
                authResponse = await startAuthentication({ optionsJSON: options });
            } catch (err) {
                const msg = (err as Error).message || "";
                if (msg.includes("not allowed") || msg.includes("cancelled") || msg.includes("aborted")) {
                    setError("Anulowane przez użytkownika.");
                } else {
                    setError(`Błąd przeglądarki: ${msg.slice(0, 100)}`);
                }
                return;
            }

            // 3. Finish: server verify + setMfaSessionCookie
            const finishRes = await fetch("/api/auth/passkeys/authenticate/finish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ response: authResponse, remember }),
            });
            if (!finishRes.ok) {
                const data = await finishRes.json();
                setError(`Weryfikacja serwera nie powiodła się: ${data.error}`);
                return;
            }

            // Success — redirect
            router.replace(redirectTo);
        } catch (err) {
            console.error("[2FA passkey] login:", err);
            setError(`Wystąpił błąd: ${(err as Error).message}`);
        } finally {
            setPasskeySubmitting(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const res = await fetch("/api/auth/2fa/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, type: mode, remember }),
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

            {/* Passkey login — preferowana metoda gdy dostępna */}
            {passkeyAvailable && mode === "totp" && (
                <>
                    <button
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={passkeySubmitting || submitting}
                        style={{
                            ...primaryBtnStyle,
                            width: "100%",
                            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                            color: "#fff",
                            marginBottom: 12,
                            opacity: passkeySubmitting ? 0.6 : 1,
                        }}
                    >
                        {passkeySubmitting ? "Weryfikacja biometryczna..." : "🔐 Zaloguj biometrią (FaceID / TouchID)"}
                    </button>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        margin: "12px 0 16px 0",
                        color: "#64748b",
                        fontSize: "0.8rem",
                    }}>
                        <div style={{ flex: 1, height: 1, background: "#334155" }} />
                        <span>LUB</span>
                        <div style={{ flex: 1, height: 1, background: "#334155" }} />
                    </div>
                </>
            )}

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
                <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#cbd5e1",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    marginTop: 14,
                    padding: 10,
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 6,
                }}>
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#d4af37" }}
                    />
                    <span>
                        <strong>Zaufaj temu urządzeniu na 30 dni</strong>
                        <br />
                        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                            Nie pytaj o kod 2FA przez najbliższy miesiąc na tej przeglądarce. Zaznacz tylko na własnym, prywatnym urządzeniu.
                        </span>
                    </span>
                </label>
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
