"use client";

import { useEffect, useState } from "react";

type EmployeeStatus = {
    id: string;
    user_id: string;
    name: string;
    email: string;
    is_active: boolean;
    totp_enabled: boolean;
    totp_setup_at: string | null;
    totp_verified_at: string | null;
    totp_last_used_at: string | null;
    backup_codes_remaining: number;
    device_count: number;
    enabled_device_count: number;
    is_admin: boolean;
};

export default function SecurityTab() {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
    const [error, setError] = useState("");

    // Reset modal state
    const [resetTarget, setResetTarget] = useState<EmployeeStatus | null>(null);
    const [resetOwnCode, setResetOwnCode] = useState("");
    const [resetReason, setResetReason] = useState("");
    const [resetError, setResetError] = useState("");
    const [resetSubmitting, setResetSubmitting] = useState(false);

    async function fetchEmployees() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/2fa/status");
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            setEmployees(data.employees || []);
        } catch (err) {
            console.error("[SecurityTab] fetch:", err);
            setError("Nie udało się pobrać listy pracowników.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function submitReset(e: React.FormEvent) {
        e.preventDefault();
        if (!resetTarget) return;
        setResetError("");
        setResetSubmitting(true);
        try {
            const res = await fetch("/api/admin/2fa/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUserId: resetTarget.user_id,
                    ownCode: resetOwnCode,
                    reason: resetReason,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setResetError(
                    data.error === "invalid_own_code" ? "Nieprawidłowy kod TOTP — sprawdź swój authenticator."
                    : data.error === "reason_required_min_5_chars" ? "Podaj powód (min. 5 znaków)."
                    : data.error === "cannot_reset_self_use_disable_endpoint" ? "Nie możesz resetować własnego 2FA — użyj /pracownik/security."
                    : `Błąd: ${data.error}`
                );
                return;
            }
            setResetTarget(null);
            setResetOwnCode("");
            setResetReason("");
            await fetchEmployees();
        } catch (err) {
            console.error("[SecurityTab] reset:", err);
            setResetError("Wystąpił błąd sieci.");
        } finally {
            setResetSubmitting(false);
        }
    }

    const admins = employees.filter(e => e.is_admin);
    const staff = employees.filter(e => !e.is_admin && e.is_active);
    const inactive = employees.filter(e => !e.is_admin && !e.is_active);

    const adminsWithoutMfa = admins.filter(a => !a.totp_enabled);

    if (loading) {
        return <div style={{ padding: 24, color: "#94a3b8" }}>Ładowanie...</div>;
    }

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ color: "#fff", fontSize: "1.5rem", marginBottom: 16 }}>
                🔒 Ustawienia bezpieczeństwa — 2FA Status
            </h2>

            {error && (
                <div style={errorBoxStyle}>{error}</div>
            )}

            {adminsWithoutMfa.length > 0 && (
                <div style={warningBoxStyle}>
                    🚨 <strong>{adminsWithoutMfa.length} {adminsWithoutMfa.length === 1 ? "admin nie ma" : "adminów nie ma"} skonfigurowanego 2FA!</strong>
                    {" "}Per polityka Hotfix Sprint S8-2: 2FA jest mandatory dla wszystkich
                    adminów. Przy następnym logowaniu zostaną przekierowani do setup.
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                        {adminsWithoutMfa.map(a => (
                            <li key={a.user_id}><strong>{a.name}</strong> ({a.email})</li>
                        ))}
                    </ul>
                </div>
            )}

            {admins.length > 0 && (
                <Section title={`👑 Adminzy (${admins.length})`} subtitle="2FA mandatory">
                    <EmployeeTable employees={admins} onReset={setResetTarget} />
                </Section>
            )}

            {staff.length > 0 && (
                <Section title={`👷 Pracownicy aktywni (${staff.length})`} subtitle="2FA opt-in">
                    <EmployeeTable employees={staff} onReset={setResetTarget} />
                </Section>
            )}

            {inactive.length > 0 && (
                <Section title={`📦 Pracownicy nieaktywni (${inactive.length})`} subtitle="">
                    <EmployeeTable employees={inactive} onReset={setResetTarget} />
                </Section>
            )}

            {/* Reset modal */}
            {resetTarget && (
                <div style={modalOverlayStyle} onClick={() => !resetSubmitting && setResetTarget(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: "#fff", fontSize: "1.2rem", marginBottom: 8 }}>
                            🔄 Reset 2FA dla {resetTarget.name}
                        </h3>
                        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: 16 }}>
                            Email: {resetTarget.email}
                            <br />
                            Backup codes pozostało: <strong>{resetTarget.backup_codes_remaining}/8</strong>
                            {resetTarget.is_admin && (
                                <><br /><span style={{ color: "#fbbf24" }}>⚠️ Admin — po resecie będzie musiał re-setup przy następnym logowaniu</span></>
                            )}
                        </p>

                        <div style={infoBoxStyle}>
                            ℹ️ <strong>Hybrid recovery (D3=C)</strong>: aby zresetować innemu
                            adminowi/pracownikowi, musisz potwierdzić własny TOTP code +
                            podać powód (audit log RODO Art. 30).
                        </div>

                        <form onSubmit={submitReset}>
                            <label style={labelStyle}>Twój aktualny kod TOTP (6 cyfr):</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="\d{6}"
                                maxLength={6}
                                value={resetOwnCode}
                                onChange={(e) => setResetOwnCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                autoFocus
                                style={codeInputStyle}
                            />

                            <label style={labelStyle}>Powód resetu (audit log):</label>
                            <textarea
                                value={resetReason}
                                onChange={(e) => setResetReason(e.target.value)}
                                placeholder="np. Marcin zgubił phone podczas konferencji, brak backup codes"
                                rows={3}
                                style={textareaStyle}
                            />

                            {resetError && <p style={errorTextStyle}>{resetError}</p>}

                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <button
                                    type="submit"
                                    disabled={resetSubmitting || resetOwnCode.length !== 6 || resetReason.trim().length < 5}
                                    style={{ ...dangerBtnStyle, opacity: (resetOwnCode.length === 6 && resetReason.trim().length >= 5) ? 1 : 0.5 }}
                                >
                                    {resetSubmitting ? "Resetowanie..." : "🔄 Potwierdź reset"}
                                </button>
                                <button
                                    type="button"
                                    disabled={resetSubmitting}
                                    onClick={() => { setResetTarget(null); setResetOwnCode(""); setResetReason(""); setResetError(""); }}
                                    style={secondaryBtnStyle}
                                >
                                    Anuluj
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: 4 }}>
                {title} <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 400 }}>— {subtitle}</span>
            </h3>
            {children}
        </div>
    );
}

function EmployeeTable({ employees, onReset }: { employees: EmployeeStatus[]; onReset: (e: EmployeeStatus) => void }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8", textAlign: "left" }}>
                        <th style={thStyle}>Pracownik</th>
                        <th style={thStyle}>Status 2FA</th>
                        <th style={thStyle}>Urządzenia</th>
                        <th style={thStyle}>Włączone</th>
                        <th style={thStyle}>Ostatnio użyte</th>
                        <th style={thStyle}>Backup codes</th>
                        <th style={thStyle}>Akcja</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map(e => (
                        <tr key={e.id} style={{ borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>
                            <td style={tdStyle}>
                                <strong>{e.name}</strong>
                                <br />
                                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{e.email}</span>
                            </td>
                            <td style={tdStyle}>
                                {e.totp_enabled
                                    ? <span style={{ color: "#10b981" }}>✅ Aktywne</span>
                                    : <span style={{ color: e.is_admin ? "#ef4444" : "#94a3b8" }}>
                                        {e.is_admin ? "🚨 Wyłączone (mandatory!)" : "❌ Wyłączone"}
                                    </span>
                                }
                            </td>
                            <td style={tdStyle}>
                                {e.totp_enabled
                                    ? <span style={{ color: e.enabled_device_count > 1 ? "#10b981" : "#cbd5e1" }}>
                                        📱 {e.enabled_device_count}
                                    </span>
                                    : "—"
                                }
                            </td>
                            <td style={tdStyle}>
                                {e.totp_verified_at ? new Date(e.totp_verified_at).toLocaleDateString("pl-PL") : "—"}
                            </td>
                            <td style={tdStyle}>
                                {e.totp_last_used_at ? new Date(e.totp_last_used_at).toLocaleString("pl-PL") : "—"}
                            </td>
                            <td style={tdStyle}>
                                {e.totp_enabled ? `${e.backup_codes_remaining}/8` : "—"}
                            </td>
                            <td style={tdStyle}>
                                {e.totp_enabled && (
                                    <button onClick={() => onReset(e)} style={smallBtnStyle}>
                                        🔄 Reset
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Inline styles matching admin panel convention
const thStyle: React.CSSProperties = { padding: "8px 12px", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
const labelStyle: React.CSSProperties = { display: "block", color: "#cbd5e1", fontSize: "0.85rem", marginBottom: 4, marginTop: 12 };
const codeInputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", fontSize: "1.2rem", fontFamily: "monospace",
    textAlign: "center", letterSpacing: "0.4rem", background: "#0f172a", color: "#fff",
    border: "1px solid #475569", borderRadius: 6, boxSizing: "border-box",
};
const textareaStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", fontSize: "0.95rem", background: "#0f172a",
    color: "#fff", border: "1px solid #475569", borderRadius: 6,
    boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
};
const errorBoxStyle: React.CSSProperties = {
    background: "#991b1b", color: "#fecaca", padding: 12, borderRadius: 8, marginBottom: 16,
};
const warningBoxStyle: React.CSSProperties = {
    background: "#7c2d12", color: "#fed7aa", padding: 12, borderRadius: 8, marginBottom: 16,
    fontSize: "0.9rem", lineHeight: 1.5,
};
const infoBoxStyle: React.CSSProperties = {
    background: "#1e3a8a", color: "#bfdbfe", padding: 12, borderRadius: 8, marginBottom: 16,
    fontSize: "0.85rem", lineHeight: 1.5,
};
const errorTextStyle: React.CSSProperties = { color: "#fca5a5", fontSize: "0.85rem", marginTop: 8 };
const modalOverlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
};
const modalStyle: React.CSSProperties = {
    maxWidth: 480, width: "100%", background: "#1e293b", borderRadius: 12,
    padding: 24, border: "1px solid #334155",
};
const dangerBtnStyle: React.CSSProperties = {
    padding: "10px 20px", background: "#991b1b", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500,
};
const secondaryBtnStyle: React.CSSProperties = {
    padding: "10px 20px", background: "transparent", color: "#cbd5e1",
    border: "1px solid #475569", borderRadius: 8, cursor: "pointer",
};
const smallBtnStyle: React.CSSProperties = {
    padding: "4px 10px", fontSize: "0.85rem", background: "transparent",
    color: "#fbbf24", border: "1px solid #fbbf24", borderRadius: 4, cursor: "pointer",
};
