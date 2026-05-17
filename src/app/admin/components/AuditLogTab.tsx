"use client";

import { useEffect, useState, useCallback } from "react";

type AuditEntry = {
    id: string;
    user_id: string;
    user_email: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    patient_name: string | null;
    metadata: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
    view_patient_data: "👤 Podgląd danych pacjenta",
    view_patient_history: "📋 Podgląd historii wizyt",
    view_patient_appointments: "📅 Podgląd przyszłych wizyt",
    view_intake: "📝 Podgląd e-karty",
    view_consents: "✍️ Podgląd zgód",
    search_patients: "🔍 Wyszukiwanie pacjentów",
    admin_search_patients: "🔍 Admin: szukanie pacjenta",
    admin_delete_patient: "🗑️ Admin: usunięcie konta pacjenta",
    admin_approve_patient: "✅ Admin: zatwierdzenie konta",
    admin_reject_patient: "❌ Admin: odrzucenie konta",
    admin_close_chat: "💬 Admin: zamknięcie czatu",
    admin_reopen_chat: "💬 Admin: ponowne otwarcie czatu",
    admin_read_patient_chat: "💬 Admin: odczyt czatu pacjenta",
    admin_reply_patient_chat: "💬 Admin: odpowiedź w czacie",
    admin_booking_approve: "✅ Admin: zatwierdzenie rezerwacji",
    admin_booking_reject: "❌ Admin: odrzucenie rezerwacji",
    admin_booking_schedule: "📅 Admin: planowanie w Prodentis",
    admin_booking_fail: "⚠️ Admin: oznaczenie niepowodzenia rezerwacji",
    admin_booking_pick_patient: "🎯 Admin: ręczne wybranie pacjenta",
    admin_delete_booking: "🗑️ Admin: usunięcie rezerwacji",
    create_consent_token: "🔑 Generowanie tokenu zgody",
    create_intake_token: "🔑 Generowanie tokenu e-karty",
    export_biometric: "📤 Export biometryczny do Prodentis",
    "2fa_reset_admin": "🔐 Admin: reset 2FA pracownikowi",
    sms_send: "📱 Wysłanie SMS",
};

const RESOURCE_LABELS: Record<string, string> = {
    patient: "Pacjent",
    patient_search: "Wyszukiwanie pacjentów",
    patient_list: "Lista pacjentów",
    consent: "Zgoda pacjenta",
    consent_token: "Token zgody",
    intake: "E-karta",
    patient_intake_token: "Token e-karty",
    biometric: "Podpis biometryczny",
    chat_conversation: "Konwersacja czat",
    online_booking: "Rezerwacja online",
    employee: "Pracownik",
};

function actionLabel(action: string): string {
    return ACTION_LABELS[action] || action;
}

function resourceLabel(type: string): string {
    return RESOURCE_LABELS[type] || type;
}

export default function AuditLogTab() {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState("");

    // Filters
    const [filterUser, setFilterUser] = useState("");
    const [filterPatient, setFilterPatient] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [limit, setLimit] = useState(100);
    const [offset, setOffset] = useState(0);

    // Detail modal
    const [selected, setSelected] = useState<AuditEntry | null>(null);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (filterUser.trim()) params.set('user_email', filterUser.trim());
            if (filterPatient.trim()) params.set('patient_name', filterPatient.trim());
            if (filterAction.trim()) params.set('action', filterAction.trim());
            if (filterFrom) params.set('from', new Date(filterFrom).toISOString());
            if (filterTo) {
                const toDate = new Date(filterTo);
                toDate.setHours(23, 59, 59, 999);
                params.set('to', toDate.toISOString());
            }

            const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            setEntries(data.entries || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error("[AuditLog]", err);
            setError("Nie udało się pobrać audit log.");
        } finally {
            setLoading(false);
        }
    }, [filterUser, filterPatient, filterAction, filterFrom, filterTo, limit, offset]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    function exportCsv() {
        const rows = [
            ["Timestamp", "User", "Action", "Resource Type", "Resource ID", "Patient", "IP", "Metadata"].join(","),
            ...entries.map(e => [
                new Date(e.created_at).toISOString(),
                e.user_email,
                e.action,
                e.resource_type,
                e.resource_id || "",
                e.patient_name || "",
                e.ip_address || "",
                JSON.stringify(e.metadata || {}).replace(/"/g, '""'),
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
        ];
        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audyt-rodo-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function clearFilters() {
        setFilterUser("");
        setFilterPatient("");
        setFilterAction("");
        setFilterFrom("");
        setFilterTo("");
        setOffset(0);
    }

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ color: "#fff", fontSize: "1.5rem", marginBottom: 8 }}>
                🕵️ Audyt RODO — Rejestr dostępu do danych pacjentów
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: 24 }}>
                RODO Art. 30: rejestr czynności przetwarzania. Retencja 90 dni (automatyczny cleanup codziennie 03:30).
            </p>

            {/* Filters */}
            <div style={filterBoxStyle}>
                <div style={filterRowStyle}>
                    <FilterInput label="Pracownik (email)" value={filterUser} onChange={setFilterUser} placeholder="np. dr.nowosielski@gmail.com" />
                    <FilterInput label="Pacjent (nazwisko)" value={filterPatient} onChange={setFilterPatient} placeholder="np. Kowalski" />
                    <FilterInput label="Typ akcji" value={filterAction} onChange={setFilterAction} placeholder="np. view_patient_data" />
                </div>
                <div style={filterRowStyle}>
                    <FilterInput label="Od" value={filterFrom} onChange={setFilterFrom} type="date" />
                    <FilterInput label="Do" value={filterTo} onChange={setFilterTo} type="date" />
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <button onClick={() => { setOffset(0); fetchEntries(); }} style={primaryBtnStyle}>🔍 Filtruj</button>
                        <button onClick={clearFilters} style={secondaryBtnStyle}>Wyczyść</button>
                        <button onClick={exportCsv} disabled={entries.length === 0} style={{ ...secondaryBtnStyle, opacity: entries.length === 0 ? 0.5 : 1 }}>📥 CSV</button>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ background: "#991b1b", color: "#fecaca", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 12 }}>
                Łącznie wpisów: <strong style={{ color: "#fff" }}>{total}</strong>
                {total > limit && ` (pokazano ${entries.length} od pozycji ${offset + 1})`}
            </div>

            {loading ? (
                <p style={{ color: "#94a3b8" }}>Ładowanie...</p>
            ) : entries.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic" }}>Brak wpisów dla wybranych filtrów.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid #334155", color: "#94a3b8", textAlign: "left" }}>
                                <th style={thStyle}>Data / czas</th>
                                <th style={thStyle}>Pracownik</th>
                                <th style={thStyle}>Akcja</th>
                                <th style={thStyle}>Pacjent</th>
                                <th style={thStyle}>IP</th>
                                <th style={thStyle}>Szczegóły</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(e => (
                                <tr key={e.id} style={{ borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>
                                    <td style={tdStyle}>{new Date(e.created_at).toLocaleString("pl-PL")}</td>
                                    <td style={tdStyle}>{e.user_email}</td>
                                    <td style={tdStyle}>
                                        <span style={{ color: "#fff" }}>{actionLabel(e.action)}</span>
                                        <br />
                                        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{resourceLabel(e.resource_type)}</span>
                                    </td>
                                    <td style={tdStyle}>{e.patient_name || <span style={{ color: "#64748b" }}>—</span>}</td>
                                    <td style={tdStyle}><code style={{ fontSize: "0.75rem", color: "#64748b" }}>{e.ip_address || "—"}</code></td>
                                    <td style={tdStyle}>
                                        <button onClick={() => setSelected(e)} style={smallBtnStyle}>
                                            👁 Pokaż
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {total > limit && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                    <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        style={{ ...secondaryBtnStyle, opacity: offset === 0 ? 0.5 : 1 }}
                    >
                        ← Poprzednie {limit}
                    </button>
                    <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                        style={{ ...secondaryBtnStyle, opacity: offset + limit >= total ? 0.5 : 1 }}
                    >
                        Następne {limit} →
                    </button>
                </div>
            )}

            {/* Detail modal */}
            {selected && (
                <div style={modalOverlayStyle} onClick={() => setSelected(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: "#fff", marginBottom: 16 }}>Szczegóły wpisu audit</h3>
                        <Field label="ID" value={selected.id} mono />
                        <Field label="Data / czas" value={new Date(selected.created_at).toLocaleString("pl-PL")} />
                        <Field label="Pracownik" value={`${selected.user_email} (${selected.user_id})`} />
                        <Field label="Akcja" value={`${actionLabel(selected.action)} (${selected.action})`} />
                        <Field label="Typ zasobu" value={`${resourceLabel(selected.resource_type)} (${selected.resource_type})`} />
                        <Field label="ID zasobu" value={selected.resource_id || "—"} mono />
                        <Field label="Pacjent" value={selected.patient_name || "—"} />
                        <Field label="IP address" value={selected.ip_address || "—"} mono />
                        <Field label="User agent" value={selected.user_agent || "—"} mono />
                        <Field label="Metadata" value={JSON.stringify(selected.metadata || {}, null, 2)} mono multiline />
                        <button onClick={() => setSelected(null)} style={{ ...primaryBtnStyle, marginTop: 16 }}>Zamknij</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.8rem", marginBottom: 4 }}>{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
            />
        </div>
    );
}

function Field({ label, value, mono = false, multiline = false }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: 2 }}>{label}</div>
            {multiline ? (
                <pre style={{ background: "#0f172a", color: "#cbd5e1", padding: 8, borderRadius: 4, fontSize: "0.85rem", fontFamily: mono ? "monospace" : "inherit", overflow: "auto", maxHeight: 200, margin: 0 }}>{value}</pre>
            ) : (
                <div style={{ color: "#fff", fontFamily: mono ? "monospace" : "inherit", fontSize: "0.9rem", wordBreak: "break-all" }}>{value}</div>
            )}
        </div>
    );
}

// Inline styles
const filterBoxStyle: React.CSSProperties = {
    background: "#1e293b", borderRadius: 8, padding: 16, marginBottom: 16, border: "1px solid #334155",
};
const filterRowStyle: React.CSSProperties = {
    display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap",
};
const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "0.9rem", background: "#0f172a",
    color: "#fff", border: "1px solid #475569", borderRadius: 6, boxSizing: "border-box",
};
const thStyle: React.CSSProperties = { padding: "8px 12px", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
const primaryBtnStyle: React.CSSProperties = {
    padding: "8px 16px", background: "linear-gradient(135deg, #d4af37, #b8941f)",
    color: "#0a0a0f", border: "none", borderRadius: 6, fontWeight: 500, cursor: "pointer",
};
const secondaryBtnStyle: React.CSSProperties = {
    padding: "8px 16px", background: "transparent", color: "#cbd5e1",
    border: "1px solid #475569", borderRadius: 6, cursor: "pointer",
};
const smallBtnStyle: React.CSSProperties = {
    padding: "4px 10px", fontSize: "0.8rem", background: "transparent",
    color: "#fbbf24", border: "1px solid #fbbf24", borderRadius: 4, cursor: "pointer",
};
const modalOverlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, overflow: "auto",
};
const modalStyle: React.CSSProperties = {
    maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto",
    background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155",
};
