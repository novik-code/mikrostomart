"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = {
    enabled: boolean;
    setupAt: string | null;
    verifiedAt: string | null;
    lastUsedAt: string | null;
    backupCodesRemaining: number;
    deviceCount: number;
    enabledDeviceCount: number;
    isAdmin: boolean;
};

type Device = {
    id: string;
    name: string;
    enabled: boolean;
    createdAt: string;
    lastUsedAt: string | null;
};

type SetupData = {
    deviceId: string;
    qrDataUrl: string;
    /**
     * Raw otpauth:// URL — używany jako deep link `<a href>` na mobile. Klik na
     * Androidzie powinien otworzyć zainstalowaną aplikację Authenticator z
     * preconfigurowanym wpisem (działa też na iOS jeśli user ma app handler).
     */
    otpauthUrl: string;
    secret: string;
    backupCodes: string[] | null;
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
    const [devices, setDevices] = useState<Device[]>([]);

    // First-time setup wizard state
    const [setupStep, setSetupStep] = useState<"intro" | "qr" | "verify" | "backup" | "done" | null>(null);
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [verifyError, setVerifyError] = useState("");
    const [verifySubmitting, setVerifySubmitting] = useState(false);
    const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);

    // Add additional device state (when 2FA already enabled)
    const [addDeviceStep, setAddDeviceStep] = useState<"name" | "qr" | "verify" | "done" | null>(null);
    const [addDeviceName, setAddDeviceName] = useState("");
    const [addDeviceData, setAddDeviceData] = useState<SetupData | null>(null);
    const [addDeviceError, setAddDeviceError] = useState("");
    const [addDeviceSubmitting, setAddDeviceSubmitting] = useState(false);

    // Rename device state
    const [renameTarget, setRenameTarget] = useState<Device | null>(null);
    const [renameInput, setRenameInput] = useState("");
    const [renameError, setRenameError] = useState("");
    const [renameSubmitting, setRenameSubmitting] = useState(false);

    // Remove device state
    const [removeTarget, setRemoveTarget] = useState<Device | null>(null);
    const [removeCode, setRemoveCode] = useState("");
    const [removeError, setRemoveError] = useState("");
    const [removeSubmitting, setRemoveSubmitting] = useState(false);

    // Manage state (disable all + regenerate backup codes)
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
        }
    }

    async function fetchDevices() {
        try {
            const res = await fetch("/api/auth/2fa/devices");
            if (!res.ok) return;
            const data = await res.json();
            setDevices(data.devices || []);
        } catch (err) {
            console.error("[Security] fetch devices:", err);
        }
    }

    async function refreshAll() {
        setLoading(true);
        await Promise.all([fetchStatus(), fetchDevices()]);
        setLoading(false);
    }

    useEffect(() => {
        refreshAll();
    }, []);

    // ─── First-time setup wizard ─────────────────────────────────────────
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
                deviceId: data.deviceId,
                qrDataUrl: data.qrDataUrl,
                otpauthUrl: data.otpauthUrl,
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
                    setVerifyError("Nieprawidłowy kod. Sprawdź czas na telefonie (musi być zsynchronizowany) i spróbuj ponownie.");
                } else {
                    setVerifyError(`Błąd: ${data.error}`);
                }
                return;
            }
            setSetupStep("backup");
            setVerifyCode("");
        } catch (err) {
            console.error("[Security] verify:", err);
            setVerifyError("Wystąpił błąd sieci.");
        } finally {
            setVerifySubmitting(false);
        }
    }

    // ─── Add additional device flow ──────────────────────────────────────
    async function startAddDevice() {
        setAddDeviceStep("name");
        setAddDeviceName("");
        setAddDeviceError("");
    }

    async function submitAddDeviceName(e: React.FormEvent) {
        e.preventDefault();
        setAddDeviceError("");
        setAddDeviceSubmitting(true);
        try {
            const res = await fetch("/api/auth/2fa/devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceName: addDeviceName.trim() || undefined }),
            });
            if (!res.ok) {
                const data = await res.json();
                setAddDeviceError(
                    data.error === "device_name_taken" ? "Urządzenie o tej nazwie już istnieje."
                    : data.error === "max_devices_reached" ? "Osiągnąłeś limit 10 urządzeń na koncie."
                    : `Błąd: ${data.error}`
                );
                return;
            }
            const data = await res.json();
            setAddDeviceData({
                deviceId: data.deviceId,
                qrDataUrl: data.qrDataUrl,
                otpauthUrl: data.otpauthUrl,
                secret: data.secret,
                backupCodes: data.backupCodes,
            });
            setAddDeviceStep("qr");
        } catch (err) {
            console.error("[Security] add device:", err);
            setAddDeviceError("Wystąpił błąd sieci.");
        } finally {
            setAddDeviceSubmitting(false);
        }
    }

    async function submitAddDeviceVerify(e: React.FormEvent) {
        e.preventDefault();
        if (!addDeviceData) return;
        setVerifyError("");
        setVerifySubmitting(true);
        try {
            const res = await fetch(`/api/auth/2fa/devices/${addDeviceData.deviceId}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verifyCode }),
            });
            if (!res.ok) {
                const data = await res.json();
                setVerifyError(
                    data.error === "invalid_code" ? "Nieprawidłowy kod. Sprawdź czas na telefonie."
                    : `Błąd: ${data.error}`
                );
                return;
            }
            setAddDeviceStep("done");
            setVerifyCode("");
            await refreshAll();
        } catch (err) {
            console.error("[Security] add device verify:", err);
            setVerifyError("Wystąpił błąd sieci.");
        } finally {
            setVerifySubmitting(false);
        }
    }

    function cancelAddDevice() {
        setAddDeviceStep(null);
        setAddDeviceData(null);
        setAddDeviceName("");
        setAddDeviceError("");
        setVerifyCode("");
        setVerifyError("");
    }

    // ─── Rename device ───────────────────────────────────────────────────
    async function submitRename(e: React.FormEvent) {
        e.preventDefault();
        if (!renameTarget) return;
        setRenameError("");
        setRenameSubmitting(true);
        try {
            const res = await fetch(`/api/auth/2fa/devices/${renameTarget.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceName: renameInput }),
            });
            if (!res.ok) {
                const data = await res.json();
                setRenameError(
                    data.error === "device_name_taken" ? "Urządzenie o tej nazwie już istnieje."
                    : `Błąd: ${data.error}`
                );
                return;
            }
            setRenameTarget(null);
            setRenameInput("");
            await fetchDevices();
        } catch (err) {
            console.error("[Security] rename:", err);
            setRenameError("Wystąpił błąd sieci.");
        } finally {
            setRenameSubmitting(false);
        }
    }

    // ─── Remove device ───────────────────────────────────────────────────
    async function submitRemove(e: React.FormEvent) {
        e.preventDefault();
        if (!removeTarget) return;
        setRemoveError("");
        setRemoveSubmitting(true);
        try {
            const res = await fetch(`/api/auth/2fa/devices/${removeTarget.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: removeCode }),
            });
            if (!res.ok) {
                const data = await res.json();
                setRemoveError(
                    data.error === "invalid_code" ? "Nieprawidłowy kod."
                    : `Błąd: ${data.error}`
                );
                return;
            }
            setRemoveTarget(null);
            setRemoveCode("");
            await refreshAll();
        } catch (err) {
            console.error("[Security] remove:", err);
            setRemoveError("Wystąpił błąd sieci.");
        } finally {
            setRemoveSubmitting(false);
        }
    }

    // ─── Disable 2FA + regenerate backup codes ───────────────────────────
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
            await refreshAll();
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

                {/* ─── First-time setup wizard ─────────────────────────────── */}
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
                        <QrSetupBlock data={setupData} />
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

                {setupStep === "backup" && setupData && setupData.backupCodes && (
                    <div>
                        <h2 style={h2Style}>Krok 3 z 3: Zapisz backup codes</h2>
                        <div style={warningBoxStyle}>
                            ⚠️ <strong>Te 8 kodów ratunkowych musisz ZAPISAĆ TERAZ.</strong> Każdy
                            może być użyty <strong>tylko raz</strong> jako alternatywa dla
                            kodu z aplikacji (np. gdy zgubisz telefon). Po opuszczeniu tej
                            strony NIE BĘDĄ JUŻ POKAZANE.
                        </div>
                        <div style={codeBoxStyle}>
                            {setupData.backupCodes.map((code, i) => (
                                <div key={i} style={{ marginBottom: 4 }}>
                                    {i + 1}. <strong>{code}</strong>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => downloadBackupCodes(setupData.backupCodes!)} style={secondaryBtnStyle}>
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
                                await refreshAll();
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
                            aplikacji Authenticator. Możesz dodać dodatkowe urządzenia
                            (np. telefon współpracownika dla konta wspólnego) w sekcji
                            poniżej.
                        </p>
                        <button onClick={() => { setSetupStep(null); }} style={primaryBtnStyle}>
                            Pokaż moje urządzenia
                        </button>
                    </div>
                )}

                {/* ─── Manage (already enabled) ─────────────────────────── */}
                {status?.enabled && !setupStep && !addDeviceStep && (
                    <div>
                        <div style={statusBoxStyle}>
                            <p style={{ color: "#10b981", fontSize: "1.1rem", margin: 0 }}>
                                ✅ <strong>2FA aktywne</strong> ({status.enabledDeviceCount} {status.enabledDeviceCount === 1 ? "urządzenie" : "urządzeń"})
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

                        {/* Device list */}
                        <h2 style={h2Style}>📱 Twoje urządzenia</h2>
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 12 }}>
                            Możesz dodać do 10 urządzeń. Każde generuje własny kod TOTP —
                            wszystkie są równoważne podczas logowania. Idealne dla kont
                            wspólnych (np. gabinet@) używanych przez wiele osób.
                        </p>

                        <div style={{ marginBottom: 16 }}>
                            {devices.length === 0 && (
                                <p style={{ color: "#94a3b8", fontStyle: "italic", padding: 12 }}>
                                    Brak urządzeń.
                                </p>
                            )}
                            {devices.map(d => (
                                <div key={d.id} style={deviceRowStyle}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: "#fff", fontWeight: 500 }}>
                                            {d.enabled ? "✅" : "⏳"} {d.name}
                                            {!d.enabled && <span style={{ color: "#fbbf24", fontSize: "0.8rem", marginLeft: 8 }}>(setup w toku)</span>}
                                        </div>
                                        <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 2 }}>
                                            Dodano: {new Date(d.createdAt).toLocaleDateString("pl-PL")}
                                            {d.lastUsedAt && (
                                                <> · Ostatnio: {new Date(d.lastUsedAt).toLocaleString("pl-PL")}</>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                            onClick={() => { setRenameTarget(d); setRenameInput(d.name); setRenameError(""); }}
                                            style={smallBtnStyle}
                                            title="Zmień nazwę"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => { setRemoveTarget(d); setRemoveCode(""); setRemoveError(""); }}
                                            style={smallDangerBtnStyle}
                                            title="Usuń"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={startAddDevice} style={primaryBtnStyle}>
                            + Dodaj kolejne urządzenie
                        </button>

                        {/* Disable / regenerate sections */}
                        {!showRegen && !showDisable && (
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                                <button onClick={() => setShowRegen(true)} style={secondaryBtnStyle}>
                                    🔄 Wygeneruj nowe backup codes
                                </button>
                                <button onClick={() => setShowDisable(true)} style={dangerBtnStyle}>
                                    ❌ Wyłącz 2FA (wszystkie urządzenia)
                                </button>
                            </div>
                        )}

                        {showRegen && !newBackupCodes && (
                            <form onSubmit={submitRegen} style={{ marginTop: 16 }}>
                                <h3 style={{ color: "#fff", marginBottom: 8 }}>Wygeneruj nowe backup codes</h3>
                                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginBottom: 12 }}>
                                    Stare kody zostaną unieważnione. Wpisz aktualny kod TOTP z
                                    dowolnego urządzenia dla potwierdzenia:
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
                                <div style={codeBoxStyle}>
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
                                        await refreshAll();
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
                                    ⚠️ Wszystkie {status.enabledDeviceCount} {status.enabledDeviceCount === 1 ? "urządzenie zostanie" : "urządzeń zostanie"} usunięte z konta.
                                    Backup codes również zostaną unieważnione.
                                </div>
                                {status?.isAdmin && (
                                    <div style={warningBoxStyle}>
                                        🚨 <strong>Jesteś adminem!</strong> Po wyłączeniu 2FA przy
                                        następnym logowaniu będziesz musiał je ponownie skonfigurować
                                        (mandatory dla wszystkich adminów).
                                    </div>
                                )}
                                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginBottom: 12 }}>
                                    Wpisz aktualny kod TOTP (z dowolnego urządzenia) lub backup code dla potwierdzenia:
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

                {/* ─── Add additional device wizard ─────────────────────────── */}
                {addDeviceStep === "name" && (
                    <form onSubmit={submitAddDeviceName}>
                        <h2 style={h2Style}>Dodaj nowe urządzenie — krok 1 z 3</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 12 }}>
                            Wpisz nazwę urządzenia (np. <em>&quot;Justyna iPhone&quot;</em>,
                            <em> &quot;Recepcja iPad&quot;</em>) lub zostaw puste, by użyć
                            domyślnej.
                        </p>
                        <input
                            type="text"
                            maxLength={60}
                            value={addDeviceName}
                            onChange={(e) => setAddDeviceName(e.target.value)}
                            placeholder={`Urządzenie ${(status?.deviceCount || 0) + 1}`}
                            autoFocus
                            style={{ ...codeInputStyle, fontFamily: "inherit", letterSpacing: "normal", textAlign: "left", fontSize: "1rem" }}
                        />
                        {addDeviceError && <p style={errorStyle}>{addDeviceError}</p>}
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button type="submit" disabled={addDeviceSubmitting} style={primaryBtnStyle}>
                                {addDeviceSubmitting ? "Tworzenie..." : "Dalej →"}
                            </button>
                            <button type="button" onClick={cancelAddDevice} style={secondaryBtnStyle}>
                                Anuluj
                            </button>
                        </div>
                    </form>
                )}

                {addDeviceStep === "qr" && addDeviceData && (
                    <div>
                        <h2 style={h2Style}>Dodaj nowe urządzenie — krok 2 z 3: Zeskanuj QR</h2>
                        <QrSetupBlock data={addDeviceData} />
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setAddDeviceStep("verify")} style={primaryBtnStyle}>
                                ✓ Zeskanowałem — dalej
                            </button>
                            <button onClick={cancelAddDevice} style={secondaryBtnStyle}>
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}

                {addDeviceStep === "verify" && (
                    <form onSubmit={submitAddDeviceVerify}>
                        <h2 style={h2Style}>Dodaj nowe urządzenie — krok 3 z 3: Potwierdź</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                            Wpisz 6-cyfrowy kod, który pojawił się na nowym urządzeniu:
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
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button
                                type="submit"
                                disabled={verifySubmitting || verifyCode.length !== 6}
                                style={{ ...primaryBtnStyle, opacity: verifyCode.length === 6 ? 1 : 0.5 }}
                            >
                                {verifySubmitting ? "Sprawdzanie..." : "Potwierdź kod"}
                            </button>
                            <button type="button" onClick={cancelAddDevice} style={secondaryBtnStyle}>
                                Anuluj
                            </button>
                        </div>
                    </form>
                )}

                {addDeviceStep === "done" && (
                    <div>
                        <h2 style={{ ...h2Style, color: "#10b981" }}>✅ Urządzenie dodane</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
                            Nowe urządzenie generuje teraz prawidłowe kody. Może być używane
                            przy logowaniu razem z poprzednimi.
                        </p>
                        <button onClick={cancelAddDevice} style={primaryBtnStyle}>
                            Wróć do listy urządzeń
                        </button>
                    </div>
                )}

                {/* ─── Rename modal ────────────────────────────────────────── */}
                {renameTarget && (
                    <div style={modalOverlayStyle} onClick={() => !renameSubmitting && setRenameTarget(null)}>
                        <div style={modalStyle} onClick={e => e.stopPropagation()}>
                            <h3 style={{ color: "#fff", marginBottom: 12 }}>Zmień nazwę urządzenia</h3>
                            <form onSubmit={submitRename}>
                                <input
                                    type="text"
                                    maxLength={60}
                                    value={renameInput}
                                    onChange={(e) => setRenameInput(e.target.value)}
                                    autoFocus
                                    style={{ ...codeInputStyle, fontFamily: "inherit", letterSpacing: "normal", textAlign: "left", fontSize: "1rem" }}
                                />
                                {renameError && <p style={errorStyle}>{renameError}</p>}
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <button type="submit" disabled={renameSubmitting || renameInput.trim().length === 0 || renameInput === renameTarget.name} style={primaryBtnStyle}>
                                        {renameSubmitting ? "Zapisywanie..." : "Zapisz"}
                                    </button>
                                    <button type="button" onClick={() => setRenameTarget(null)} style={secondaryBtnStyle}>
                                        Anuluj
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ─── Remove device modal ─────────────────────────────────── */}
                {removeTarget && (
                    <div style={modalOverlayStyle} onClick={() => !removeSubmitting && setRemoveTarget(null)}>
                        <div style={modalStyle} onClick={e => e.stopPropagation()}>
                            <h3 style={{ color: "#fff", marginBottom: 12 }}>🗑️ Usuń urządzenie: {removeTarget.name}</h3>
                            <div style={warningBoxStyle}>
                                ⚠️ Po usunięciu to urządzenie nie będzie mogło wygenerować
                                kodu logowania. Jeśli to ostatnie urządzenie — 2FA zostanie
                                wyłączone i backup codes unieważnione.
                            </div>
                            <form onSubmit={submitRemove}>
                                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginBottom: 12 }}>
                                    Wpisz kod TOTP z dowolnego (innego) urządzenia lub backup code:
                                </p>
                                <input
                                    type="text"
                                    maxLength={11}
                                    value={removeCode}
                                    onChange={(e) => setRemoveCode(e.target.value)}
                                    placeholder="123456 lub XXXXX-XXXXX"
                                    autoFocus
                                    style={codeInputStyle}
                                />
                                {removeError && <p style={errorStyle}>{removeError}</p>}
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <button type="submit" disabled={removeSubmitting || !removeCode} style={dangerBtnStyle}>
                                        {removeSubmitting ? "Usuwanie..." : "🗑️ Usuń urządzenie"}
                                    </button>
                                    <button type="button" onClick={() => setRemoveTarget(null)} style={secondaryBtnStyle}>
                                        Anuluj
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Reusable QR setup block — używany w first-time setup (krok 1 z 3) i w add-device
 * (krok 2 z 3). Pokazuje:
 *   - Banner z instrukcją "Otwórz Authenticator app, NIE aparat"
 *   - Wyraźne ostrzeżenie dla Android (Samsung Camera/Bixby Vision domyślnie nie
 *     potrafią obsłużyć otpauth:// URI — open default camera scanning to webview błąd)
 *   - QR PNG do scan
 *   - Deep link `<a href="otpauth://...">` — na Androidzie otwiera zarejestrowany
 *     Authenticator app handler (Google Authenticator / Authy), na iOS analogicznie
 *   - Secret jako visible code + przycisk Kopiuj (fallback gdy QR nie działa)
 */
function QrSetupBlock({ data }: { data: SetupData }) {
    const [copied, setCopied] = useState(false);

    async function copySecret() {
        try {
            await navigator.clipboard.writeText(data.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Clipboard API niedostępne (np. starsze przeglądarki, brak HTTPS) — fallback
            window.prompt("Skopiuj secret ręcznie:", data.secret);
        }
    }

    return (
        <>
            <div style={infoBoxStyle}>
                📱 <strong>Otwórz aplikację Authenticator</strong> (Google Authenticator / Authy / 1Password)
                na urządzeniu, które ma generować kody → wybierz <em>„+&nbsp;Dodaj konto"</em>
                lub <em>„Skanuj kod QR"</em> → następnie zeskanuj kod poniżej.
            </div>
            <div style={warningBoxStyle}>
                🚨 <strong>Android (Samsung): NIE używaj domyślnego aparatu telefonu</strong> ani Bixby Vision —
                ten QR otwiera się TYLKO w aplikacji Authenticator. Jeśli aparat zamiast Authentcatora
                wraca do podglądu zdjęć, użyj przycisku „Otwórz w aplikacji" poniżej lub wpisz secret ręcznie.
            </div>
            <div style={{ textAlign: "center", marginBottom: 16, padding: 16, background: "#fff", borderRadius: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrDataUrl} alt="QR code dla 2FA" width={280} height={280} />
            </div>
            <a
                href={data.otpauthUrl}
                style={{
                    ...secondaryBtnStyle,
                    display: "block",
                    textAlign: "center",
                    textDecoration: "none",
                    marginBottom: 6,
                }}
            >
                📲 Otwórz w aplikacji Authenticator
            </a>
            <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "0 0 16px 0", textAlign: "center" }}>
                ↑ Tap na urządzeniu z zainstalowaną aplikacją Authenticator
            </p>
            <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #334155" }}>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 8px 0" }}>
                    Alternatywa — wpisz secret ręcznie w aplikacji:
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <code
                        style={{
                            flex: 1,
                            fontFamily: "monospace",
                            fontSize: "0.95rem",
                            color: "#fff",
                            wordBreak: "break-all",
                            background: "#1e293b",
                            padding: "10px 12px",
                            borderRadius: 6,
                            userSelect: "all",
                        }}
                    >
                        {data.secret}
                    </code>
                    <button
                        type="button"
                        onClick={copySecret}
                        style={{ ...secondaryBtnStyle, padding: "8px 14px", whiteSpace: "nowrap" }}
                    >
                        {copied ? "✓ Skopiowano" : "📋 Kopiuj"}
                    </button>
                </div>
            </div>
        </>
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
    marginTop: 24,
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
const codeBoxStyle: React.CSSProperties = {
    background: "#0f172a",
    padding: 16,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: "1rem",
    marginBottom: 16,
    color: "#fff",
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
    boxSizing: "border-box",
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
const smallBtnStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: "0.95rem",
    background: "transparent",
    color: "#cbd5e1",
    border: "1px solid #475569",
    borderRadius: 6,
    cursor: "pointer",
};
const smallDangerBtnStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: "0.95rem",
    background: "transparent",
    color: "#fca5a5",
    border: "1px solid #7f1d1d",
    borderRadius: 6,
    cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
    color: "#fca5a5",
    fontSize: "0.85rem",
    marginTop: 4,
};
const deviceRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    background: "#0f172a",
    borderRadius: 8,
    marginBottom: 8,
    border: "1px solid #334155",
};
const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
};
const modalStyle: React.CSSProperties = {
    maxWidth: 480,
    width: "100%",
    background: "#1e293b",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #334155",
};
