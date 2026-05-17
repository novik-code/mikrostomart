"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = {
    enabled: boolean;
    setupAt: string | null;
    verifiedAt: string | null;
    lastUsedAt: string | null;
    backupCodesRemaining: number;
    isAdmin: boolean;
};

type SetupData = {
    qrDataUrl: string;
    secret: string;
    backupCodes: string[];
};

export default function SecurityPageWrapper() {
    return (
        <Suspense fallback={<div style={pageStyle}><div style={cardStyle}><p style={{ color: "#94a3b8" }}>Ładowanie...</p></div></div>}>
            <SecurityPage />
        </Suspense>
    );
}

function SecurityPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForced = searchParams.get("force") === "true";

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<Status | null>(null);

    // Setup flow state
    const [setupStep, setSetupStep] = useState<"intro" | "qr" | "verify" | "backup" | "done" | null>(null);
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [verifyError, setVerifyError] = useState("");
    const [verifySubmitting, setVerifySubmitting] = useState(false);
    const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);

    // Manage state (when already enabled)
    const [showDisable, setShowDisable] = useState(false);
    const [disableCode, setDisableCode] = useState("");
    const [disableError, setDisableError] = useState("");
    const [disableSubmitting, setDisableSubmitting] = useState(false);

    const [showRegen, setShowRegen] = useState(false);
    const [regenCode, setRegenCode] = useState("");
    const [regenError, setRegenError] = useState("");
    const [regenSubmitting, setRegenSubmitting] = useState(false);
    const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

    async function fetchStatus() {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/2fa/status");
            if (!res.ok) {
                if (res.status === 401) {
                    router.replace("/pracownik/login");
                    return;
                }
                throw new Error(`Status: ${res.status}`);
            }
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            console.error("[Security] fetch status:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStatus();
    }, []);

    async function startSetup() {
        setSetupStep("qr");
        try {
            const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                alert(`Błąd: ${data.error}`);
                setSetupStep(null);
                return;
            }
            const data = await res.json();
            setSetupData({
                qrDataUrl: data.qrDataUrl,
                secret: data.secret,
                backupCodes: data.backupCodes,
            });
        } catch (err) {
            console.error("[Security] setup:", err);
            alert("Wystąpił błąd. Spróbuj ponownie.");
            setSetupStep(null);
        }
    }

    async function submitVerify(e: React.FormEvent) {
        e.preventDefault();
        setVerifyError("");
        setVerifySubmitting(true);
        try {
            const res = await fetch("/api/auth/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verifyCode }),
            });
            if (!res.ok) {
                const data = await res.json();
                if (data.error === "invalid_code") {
                    setVerifyError("Nieprawidłowy kod. Sprawdź czas na phone (musi być zsynchronizowany) i spróbuj ponownie.");
                } else {
                    setVerifyError(`Błąd: ${data.error}`);
                }
                return;
            }
            // Move to backup codes display step
            setSetupStep("backup");
            setVerifyCode("");
        } catch (err) {
            console.error("[Security] verify:", err);
            setVerifyError("Wystąpił błąd sieci.");
        } finally {
            setVerifySubmitting(false);
        }
    }

    async function submitDisable(e: React.FormEvent) {
        e.preventDefault();
        setDisableError("");
        setDisableSubmitting(true);
        try {
            const res = await fetch("/api/auth/2fa/disable", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: disableCode }),
            });
            if (!res.ok) {
                const data = await res.json();
                setDisableError(data.error === "invalid_code"
                    ? "Nieprawidłowy kod."
                    : `Błąd: ${data.error}`);
                return;
            }
            setDisableCode("");
            setShowDisable(false);
            await fetchStatus();
        } catch (err) {
            console.error("[Security] disable:", err);
            setDisableError("Wystąpił błąd sieci.");
        } finally {
            setDisableSubmitting(false);
        }
    }

    async function submitRegen(e: React.FormEvent) {
        e.preventDefault();
        setRegenError("");
        setRegenSubmitting(true);
        try {
            const res = await fetch("/api/auth/2fa/regenerate-backup-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: regenCode }),
            });
            if (!res.ok) {
                const data = await res.json();
                setRegenError(data.error === "invalid_code"
                    ? "Nieprawidłowy kod."
                    : `Błąd: ${data.error}`);
                return;
            }
            const data = await res.json();
            setNewBackupCodes(data.backupCodes);
            setRegenCode("");
        } catch (err) {
            console.error("[Security] regen:", err);
            setRegenError("Wystąpił błąd sieci.");
        } finally {
            setRegenSubmitting(false);
        }
    }

    function downloadBackupCodes(codes: string[]) {
        const text = `Mikrostomart — Backup codes dla 2FA
Wygenerowane: ${new Date().toLocaleString("pl-PL")}

Każdy kod może być użyty TYLKO RAZ. Zachowaj te kody w bezpiecznym miejscu
(np. menedżer haseł lub kartka w sejfie).

${codes.join("\n")}

Po zużyciu wszystkich kodów wygeneruj nowe w panelu /pracownik/security.
`;
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mikrostomart-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <p style={{ textAlign: "center", color: "#94a3b8" }}>Ładowanie...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                <h1 style={h1Style}>🔒 Ustawienia bezpieczeństwa</h1>
                <p style={subtitleStyle}>
                    Two-Factor Authentication (2FA) — dodatkowa warstwa zabezpieczeń konta.
                </p>

                {isForced && !status?.enabled && (
                    <div style={warningBoxStyle}>
                        ⚠️ <strong>Twoje konto admin wymaga 2FA.</strong> Skonfiguruj
                        zabezpieczenie, aby kontynuować korzystanie z panelu.
                    </div>
                )}

                {status?.isAdmin && !status.enabled && !isForced && (
                    <div style={infoBoxStyle}>
                        ℹ️ Jako administrator powinieneś włączyć 2FA dla bezpieczeństwa
                        konta i pacjentów. (Mandatory dla wszystkich adminów per polityka
                        Hotfix Sprint S8-2.)
                    </div>
                )}

                {/* ─── Setup wizard ─────────────────────────────────────── */}
                {!status?.enabled && !setupStep && (
                    <div>
                        <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                            2FA wymaga aplikacji authenticator na telefonie:
                        </p>
                        <ul style={{ color: "#94a3b8", marginBottom: 24, lineHeight: 1.8 }}>
                            <li>📱 <strong>Google Authenticator</strong> (Android / iOS)</li>
                            <li>📱 <strong>Authy</strong> (Android / iOS / Desktop)</li>
                            <li>📱 <strong>1Password</strong> (jeśli już używasz)</li>
                        </ul>
                        <button onClick={startSetup} style={primaryBtnStyle}>
                            🚀 Rozpocznij konfigurację 2FA
                        </button>
                    </div>
                )}

                {setupStep === "qr" && setupData && (
                    <div>
                        <h2 style={h2Style}>Krok 1 z 3: Zeskanuj QR code</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                            Otwórz aplikację Authenticator i zeskanuj kod poniżej:
                        </p>
                        <div style={{ textAlign: "center", marginBottom: 16, padding: 16, background: "#fff", borderRadius: 8 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={setupData.qrDataUrl} alt="QR code" width={280} height={280} />
                        </div>
                        <details style={{ marginBottom: 16 }}>
                            <summary style={{ color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem" }}>
                                ❓ QR nie działa? Wpisz secret ręcznie
                            </summary>
                            <div style={{ marginTop: 8, padding: 12, background: "#0f172a", borderRadius: 6, fontFamily: "monospace", fontSize: "0.9rem", wordBreak: "break-all" }}>
                                {setupData.secret}
                            </div>
                        </details>
                        <button onClick={() => setSetupStep("verify")} style={primaryBtnStyle}>
                            ✓ Zeskanowałem — dalej
                        </button>
                    </div>
                )}

                {setupStep === "verify" && (
                    <form onSubmit={submitVerify}>
                        <h2 style={h2Style}>Krok 2 z 3: Potwierdź kod</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                            Wpisz 6-cyfrowy kod z aplikacji Authenticator:
                        </p>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{6}"
                            maxLength={6}
                            autoComplete="one-time-code"
                            autoFocus
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="123456"
                            style={codeInputStyle}
                        />
                        {verifyError && <p style={errorStyle}>{verifyError}</p>}
                        <button
                            type="submit"
                            disabled={verifySubmitting || verifyCode.length !== 6}
                            style={{ ...primaryBtnStyle, opacity: verifyCode.length === 6 ? 1 : 0.5 }}
                        >
                            {verifySubmitting ? "Sprawdzanie..." : "Potwierdź kod"}
                        </button>
                    </form>
                )}

                {setupStep === "backup" && setupData && (
                    <div>
                        <h2 style={h2Style}>Krok 3 z 3: Zapisz backup codes</h2>
                        <div style={warningBoxStyle}>
                            ⚠️ <strong>Te 8 kodów ratunkowych musisz ZAPISAĆ TERAZ.</strong> Każdy
                            może być użyty <strong>tylko raz</strong> jako alternatywa dla
                            kodu z aplikacji (np. gdy zgubisz phone). Po opuszczeniu tej
                            strony NIE BĘDĄ JUŻ POKAZANE.
                        </div>
                        <div style={{ background: "#0f172a", padding: 16, borderRadius: 8, fontFamily: "monospace", fontSize: "1rem", marginBottom: 16 }}>
                            {setupData.backupCodes.map((code, i) => (
                                <div key={i} style={{ marginBottom: 4 }}>
                                    {i + 1}. <strong>{code}</strong>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => downloadBackupCodes(setupData.backupCodes)} style={secondaryBtnStyle}>
                            📥 Pobierz jako .txt
                        </button>
                        <div style={{ marginTop: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={acknowledgedBackup}
                                    onChange={(e) => setAcknowledgedBackup(e.target.checked)}
                                />
                                Zapisałem kody w bezpiecznym miejscu (1Password / sejf / wydrukowane)
                            </label>
                        </div>
                        <button
                            onClick={async () => {
                                setSetupStep("done");
                                await fetchStatus();
                                setSetupData(null);
                            }}
                            disabled={!acknowledgedBackup}
                            style={{ ...primaryBtnStyle, marginTop: 16, opacity: acknowledgedBackup ? 1 : 0.5 }}
                        >
                            ✅ Gotowe — włącz 2FA
                        </button>
                    </div>
                )}

                {setupStep === "done" && (
                    <div>
                        <h2 style={{ ...h2Style, color: "#10b981" }}>✅ 2FA jest aktywne</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                            Od teraz przy logowaniu będziesz proszony o 6-cyfrowy kod z
                            aplikacji Authenticator.
                        </p>
                        <button onClick={() => router.push("/pracownik")} style={primaryBtnStyle}>
                            Wróć do panelu
                        </button>
                    </div>
                )}

                {/* ─── Manage (already enabled) ─────────────────────────── */}
                {status?.enabled && !setupStep && (
                    <div>
                        <div style={statusBoxStyle}>
                            <p style={{ color: "#10b981", fontSize: "1.1rem", margin: 0 }}>
                                ✅ <strong>2FA aktywne</strong>
                            </p>
                            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "8px 0 0 0" }}>
                                Włączone: {status.verifiedAt ? new Date(status.verifiedAt).toLocaleString("pl-PL") : "—"}
                                <br />
                                Ostatnio użyte: {status.lastUsedAt ? new Date(status.lastUsedAt).toLocaleString("pl-PL") : "—"}
                                <br />
                                Backup codes pozostało: <strong>{status.backupCodesRemaining}/8</strong>
                            </p>
                        </div>

                        {status.backupCodesRemaining <= 2 && (
                            <div style={warningBoxStyle}>
                                ⚠️ Zostały Ci tylko {status.backupCodesRemaining} backup
                                codes. Wygeneruj nowe (poniżej) zanim wszystkie się skończą.
                            </div>
                        )}

                        {!showRegen && !showDisable && (
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <button onClick={() => setShowRegen(true)} style={secondaryBtnStyle}>
                                    🔄 Wygeneruj nowe backup codes
                                </button>
                                <button onClick={() => setShowDisable(true)} style={dangerBtnStyle}>
                                    ❌ Wyłącz 2FA
                                </button>
                            </div>
                        )}

                        {showRegen && !newBackupCodes && (
                            <form onSubmit={submitRegen} style={{ marginTop: 16 }}>
                                <h3 style={{ color: "#fff", marginBottom: 8 }}>Wygeneruj nowe backup codes</h3>
                                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginBottom: 12 }}>
                                    Stare kody zostaną unieważnione. Wpisz aktualny kod z
                                    Authenticator dla potwierdzenia:
                                </p>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d{6}"
                                    maxLength={6}
                                    value={regenCode}
                                    onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="123456"
                                    style={codeInputStyle}
                                />
                                {regenError && <p style={errorStyle}>{regenError}</p>}
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <button type="submit" disabled={regenSubmitting || regenCode.length !== 6} style={{ ...primaryBtnStyle, opacity: regenCode.length === 6 ? 1 : 0.5 }}>
                                        {regenSubmitting ? "Generowanie..." : "Wygeneruj"}
                                    </button>
                                    <button type="button" onClick={() => { setShowRegen(false); setRegenCode(""); setRegenError(""); }} style={secondaryBtnStyle}>
                                        Anuluj
                                    </button>
                                </div>
                            </form>
                        )}

                        {newBackupCodes && (
                            <div style={{ marginTop: 16 }}>
                                <h3 style={{ color: "#10b981" }}>✅ Nowe backup codes wygenerowane</h3>
                                <div style={warningBoxStyle}>
                                    ⚠️ Zapisz nowe kody — stare są nieaktywne. Te kody NIE BĘDĄ
                                    POKAZANE PONOWNIE.
                                </div>
                                <div style={{ background: "#0f172a", padding: 16, borderRadius: 8, fontFamily: "monospace", marginBottom: 12 }}>
                                    {newBackupCodes.map((code, i) => (
                                        <div key={i}>{i + 1}. <strong>{code}</strong></div>
                                    ))}
                                </div>
                                <button onClick={() => downloadBackupCodes(newBackupCodes)} style={secondaryBtnStyle}>
                                    📥 Pobierz jako .txt
                                </button>
                                <button
                                    onClick={async () => {
                                        setNewBackupCodes(null);
                                        setShowRegen(false);
                                        await fetchStatus();
                                    }}
                                    style={{ ...primaryBtnStyle, marginLeft: 8 }}
                                >
                                    Zapisałem
                                </button>
                            </div>
                        )}

                        {showDisable && (
                            <form onSubmit={submitDisable} style={{ marginTop: 16 }}>
                                <h3 style={{ color: "#fff", marginBottom: 8 }}>❌ Wyłącz 2FA</h3>
                                <div style={warningBoxStyle}>
                                    ⚠️ Wyłączenie 2FA znacznie obniża bezpieczeństwo Twojego
                                    konta. Każdy kto pozna Twoje hasło będzie mógł się
                                    zalogować.
                                </div>
                                {status?.isAdmin && (
                                    <div style={warningBoxStyle}>
                                        🚨 <strong>Jesteś adminem!</strong> Po wyłączeniu 2FA przy
                                        następnym logowaniu będziesz musiał je ponownie skonfigurować
                                        (mandatory dla wszystkich adminów).
                                    </div>
                                )}
                                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginBottom: 12 }}>
                                    Wpisz aktualny kod TOTP lub backup code dla potwierdzenia:
                                </p>
                                <input
                                    type="text"
                                    maxLength={11}
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value)}
                                    placeholder="123456 lub XXXXX-XXXXX"
                                    style={codeInputStyle}
                                />
                                {disableError && <p style={errorStyle}>{disableError}</p>}
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <button type="submit" disabled={disableSubmitting || !disableCode} style={dangerBtnStyle}>
                                        {disableSubmitting ? "Wyłączanie..." : "Potwierdź wyłączenie"}
                                    </button>
                                    <button type="button" onClick={() => { setShowDisable(false); setDisableCode(""); setDisableError(""); }} style={secondaryBtnStyle}>
                                        Anuluj
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Inline styles (dark theme matching admin/pracownik convention) ────
const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0a0a0f",
    padding: "32px 16px",
};
const cardStyle: React.CSSProperties = {
    maxWidth: 640,
    margin: "0 auto",
    background: "#1e293b",
    borderRadius: 12,
    padding: 32,
    border: "1px solid #334155",
};
const h1Style: React.CSSProperties = {
    color: "#fff",
    fontSize: "1.8rem",
    marginBottom: 8,
    fontWeight: 600,
};
const h2Style: React.CSSProperties = {
    color: "#fff",
    fontSize: "1.3rem",
    marginBottom: 12,
    fontWeight: 600,
};
const subtitleStyle: React.CSSProperties = {
    color: "#94a3b8",
    marginBottom: 24,
};
const warningBoxStyle: React.CSSProperties = {
    background: "#7c2d12",
    color: "#fed7aa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: "0.9rem",
    lineHeight: 1.5,
};
const infoBoxStyle: React.CSSProperties = {
    background: "#1e3a8a",
    color: "#bfdbfe",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: "0.9rem",
    lineHeight: 1.5,
};
const statusBoxStyle: React.CSSProperties = {
    background: "#064e3b",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
};
const codeInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    fontSize: "1.5rem",
    fontFamily: "monospace",
    textAlign: "center",
    letterSpacing: "0.5rem",
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #475569",
    borderRadius: 8,
    marginBottom: 8,
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
const secondaryBtnStyle: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: "0.95rem",
    background: "transparent",
    color: "#cbd5e1",
    border: "1px solid #475569",
    borderRadius: 8,
    cursor: "pointer",
};
const dangerBtnStyle: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: "0.95rem",
    background: "#991b1b",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
    color: "#fca5a5",
    fontSize: "0.85rem",
    marginTop: 4,
};
