"use client";
import { useState, useEffect } from "react";
import { inputStyle } from "./adminStyles";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export default function SmsRemindersTab() {
    const [smsReminders, setSmsReminders] = useState<any[]>([]);
    const [smsStats, setSmsStats] = useState({ total: 0, draft: 0, sent: 0, failed: 0, cancelled: 0 });
    const [editingSmsId, setEditingSmsId] = useState<string | null>(null);
    const [editingSmsMessage, setEditingSmsMessage] = useState('');
    const [sendingAll, setSendingAll] = useState(false);
    const [smsTab, setSmsTab] = useState<'drafts' | 'sent' | 'manual'>('drafts');
    const [sentDateFilter, setSentDateFilter] = useState<string>('');
    const [manualPhone, setManualPhone] = useState('');
    const [manualMessage, setManualMessage] = useState('');
    const [manualPatientName, setManualPatientName] = useState('');
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const [sendingManual, setSendingManual] = useState(false);
    const [manualGenerationStatus, setManualGenerationStatus] = useState<string | null>(null);
    const [skippedPatients, setSkippedPatients] = useState<Array<{
        patientName: string;
        doctorName: string;
        appointmentTime: string;
        appointmentType: string;
        reason: string;
    }>>([]);
    const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editingTemplateText, setEditingTemplateText] = useState('');
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [smsSettings, setSmsSettings] = useState<any[]>([]);
    const [showSmsSettings, setShowSmsSettings] = useState(false);
    const [togglingType, setTogglingType] = useState<string | null>(null);

    // SMS Reminders Functions
    const fetchSmsReminders = async () => {
        try {
            // Fetch ALL SMS (draft, sent, failed) to populate both tabs
            const res = await fetch('/api/admin/sms-reminders');
            if (res.ok) {
                const data = await res.json();
                setSmsReminders(data.reminders);
                setSmsStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch SMS reminders:', err);
        }
    };

    const handleEditSms = async (id: string, message: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    sms_message: message,
                    edited_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            if (res.ok) {
                setEditingSmsId(null);
                setEditingSmsMessage('');
                fetchSmsReminders();
                alert('SMS zaktualizowany');
            }
        } catch (err) {
            alert('Błąd aktualizacji');
        }
    };

    const handleDeleteSms = async (id: string) => {
        if (!confirm('Anulować ten SMS?')) return;

        try {
            const res = await fetch(`/api/admin/sms-reminders?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchSmsReminders();
                alert('SMS anulowany');
            }
        } catch (err) {
            alert('Błąd');
        }
    };

    const handleDeleteAllDrafts = async () => {
        if (!confirm(`Usunąć wszystkie szkice SMS (${smsStats.draft})?`)) return;

        try {
            const res = await fetch('/api/admin/sms-reminders?id=all-drafts', {
                method: 'DELETE'
            });

            if (res.ok) {
                const result = await res.json();
                fetchSmsReminders();
                alert(`Usunięto ${result.deleted} szkiców`);
            }
        } catch (err) {
            alert('Błąd usuwania');
        }
    };

    // Manual SMS Generation (Trigger Cron)
    const handleManualGenerate = async () => {
        if (!confirm('Wywołać cron job do generowania SMS na jutro?')) return;

        setManualGenerationStatus('Wywołuję cron job...');
        try {
            const res = await fetch('/api/cron/appointment-reminders?manual=true', {
                method: 'GET'
            });

            if (res.ok) {
                const result = await res.json();
                setManualGenerationStatus(
                    `✅ Sukces!\n` +
                    `📊 Processed: ${result.processed}\n` +
                    `✅ Drafts: ${result.draftsCreated}\n` +
                    `⏭️ Skipped: ${result.skipped}\n` +
                    `❌ Failed: ${result.failed || 0}`
                );

                // Save skipped patients for display
                setSkippedPatients(result.skippedPatients || []);

                // Refresh SMS list
                setTimeout(() => {
                    fetchSmsReminders();
                    setManualGenerationStatus(null);
                }, 3000);
            } else {
                const errorText = await res.text();
                setManualGenerationStatus(`❌ Błąd (${res.status}): ${errorText}`);
            }
        } catch (err: any) {
            setManualGenerationStatus(`❌ Błąd: ${err.message}`);
        }
    };

    const handleSendAllSms = async () => {
        if (!confirm(`Wysłać ${smsStats.draft} SMS przypomnień?`)) return;

        setSendingAll(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reminder_ids: 'all',
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`✅ Wysłano: ${result.sent}\n❌ Błędy: ${result.failed}`);
                fetchSmsReminders();
            }
        } catch (err) {
            alert('Błąd wysyłania');
        } finally {
            setSendingAll(false);
        }
    };

    const handleSendSingleSms = async (id: string) => {
        if (!confirm('Wysłać ten SMS teraz?')) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reminder_ids: [id],
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            if (res.ok) {
                fetchSmsReminders();
                alert('SMS wysłany!');
            }
        } catch (err) {
            alert('Błąd wysyłania');
        }
    };

    const handleResendSms = async (sms: any) => {
        if (!confirm(`Wysłać ponownie SMS do ${sms.patient_name || sms.phone}?`)) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: sms.phone,
                    message: sms.sms_message,
                    patient_name: sms.patient_name,
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            const result = await res.json();
            if (result.success) {
                alert('SMS wysłany ponownie!');
                fetchSmsReminders();
            } else {
                alert(`Błąd: ${result.error}`);
            }
        } catch (err) {
            alert('Błąd wysyłania');
        }
    };

    const handleSearchPatients = async (query: string) => {
        setPatientSearchQuery(query);
        if (query.length < 2) {
            setPatientSearchResults([]);
            return;
        }

        setSearchingPatients(true);
        try {
            const res = await fetch(`/api/admin/patients/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setPatientSearchResults(data.patients || []);
            }
        } catch (err) {
            console.error('Patient search error:', err);
        } finally {
            setSearchingPatients(false);
        }
    };

    const handleSelectPatient = (patient: any) => {
        setManualPatientName(`${patient.firstName} ${patient.lastName}`);
        setManualPhone(patient.phone || '');
        setPatientSearchQuery('');
        setPatientSearchResults([]);
    };

    const handleSendManualSms = async () => {
        if (!manualPhone || !manualMessage) {
            alert('Wypełnij numer telefonu i treść SMS');
            return;
        }
        if (!confirm(`Wysłać SMS do ${manualPatientName || manualPhone}?`)) return;

        setSendingManual(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: manualPhone,
                    message: manualMessage,
                    patient_name: manualPatientName,
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ SMS wysłany!');
                setManualPhone('');
                setManualMessage('');
                setManualPatientName('');
                fetchSmsReminders();
            } else {
                alert(`❌ Błąd: ${result.error}`);
            }
        } catch (err) {
            alert('Błąd wysyłania');
        } finally {
            setSendingManual(false);
        }
    };

    useEffect(() => { fetchSmsReminders(); }, []);

    // SMS Settings Functions
    const fetchSmsSettings = async () => {
        try {
            const res = await fetch('/api/admin/sms-settings');
            if (res.ok) {
                const data = await res.json();
                setSmsSettings(data.settings || []);
            }
        } catch (err) {
            console.error('Failed to fetch SMS settings:', err);
        }
    };

    const handleToggleSmsType = async (id: string, currentEnabled: boolean) => {
        setTogglingType(id);
        try {
            const res = await fetch('/api/admin/sms-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, enabled: !currentEnabled })
            });
            if (res.ok) {
                setSmsSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !currentEnabled } : s));
            } else {
                alert('Blad zapisu ustawienia');
            }
        } catch (err) {
            alert('Blad sieci');
        } finally {
            setTogglingType(null);
        }
    };

    const renderSmsRemindersTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Header with stats */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: "0.5rem" }}>📱 SMS Przypomnienia</h2>
                    <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                        Zarządzaj automatycznymi SMS przed wysyłką
                    </p>
                </div>
                <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem" }}>
                    <div>
                        <span style={{ color: "var(--color-text-muted)" }}>Szkice: </span>
                        <strong style={{ color: "var(--color-primary)", fontSize: "1.2rem" }}>{smsStats.draft}</strong>
                    </div>
                    <div>
                        <span style={{ color: "var(--color-text-muted)" }}>Wysłane: </span>
                        <strong>{smsStats.sent}</strong>
                    </div>
                    <div>
                        <span style={{ color: "var(--color-text-muted)" }}>Błędy: </span>
                        <strong>{smsStats.failed}</strong>
                    </div>
                </div>
            </div>
            {/* SMS Settings (Toggle Types) */}
            <button
                onClick={() => {
                    setShowSmsSettings(!showSmsSettings);
                    if (!showSmsSettings && smsSettings.length === 0) {
                        fetchSmsSettings();
                    }
                }}
                style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: showSmsSettings ? "rgba(239, 68, 68, 0.1)" : "var(--color-surface)",
                    border: showSmsSettings ? "2px solid #ef4444" : "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: showSmsSettings ? "#ef4444" : "var(--color-text-muted)",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    textAlign: "left",
                    marginBottom: "0.5rem"
                }}
            >
                {showSmsSettings ? '\u25BC' : '\u25B6'} \u2699\uFE0F Ustawienia SMS (wlacz/wylacz typy)
            </button>

            {showSmsSettings && (
                <div style={{
                    background: "var(--color-surface)",
                    padding: "1.5rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1rem",
                    border: "1px solid rgba(239, 68, 68, 0.2)"
                }}>
                    <div style={{ marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0, marginBottom: "0.25rem" }}>Typy automatycznych SMS</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                            Przypomnienia o wizytach sa zawsze wlaczone. Ponizej mozesz wylaczyc pozostale typy SMS aby zaoszczedzic koszty.
                        </p>
                    </div>

                    {smsSettings.length === 0 ? (
                        <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "1rem" }}>Ladowanie...</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                            {smsSettings.map(setting => (
                                <div key={setting.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.75rem 1rem",
                                    background: "var(--color-background)",
                                    borderRadius: "6px",
                                    border: setting.enabled ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <span style={{ fontSize: "1.2rem" }}>{setting.icon}</span>
                                        <div>
                                            <strong style={{ fontSize: "0.9rem" }}>{setting.label}</strong>
                                            {setting.updated_by && (
                                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>
                                                    Zmieniono przez: {setting.updated_by}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleSmsType(setting.id, setting.enabled)}
                                        disabled={togglingType === setting.id}
                                        style={{
                                            padding: "0.4rem 1.2rem",
                                            background: setting.enabled ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                            border: setting.enabled ? "2px solid #22c55e" : "2px solid #ef4444",
                                            borderRadius: "20px",
                                            color: setting.enabled ? "#22c55e" : "#ef4444",
                                            cursor: togglingType === setting.id ? "wait" : "pointer",
                                            fontWeight: "bold",
                                            fontSize: "0.85rem",
                                            minWidth: "100px",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {togglingType === setting.id ? '...' : (setting.enabled ? 'WLACZONY' : 'WYLACZONY')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Manual Trigger Button */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button
                    onClick={handleManualGenerate}
                    disabled={!!manualGenerationStatus}
                    className="btn-secondary"
                    style={{
                        flex: 1,
                        padding: "1rem",
                        background: manualGenerationStatus ? "#666" : "rgba(255, 255, 255, 0.05)",
                        border: "2px solid var(--color-primary)",
                        fontSize: "1rem",
                        fontWeight: "600",
                        minWidth: "200px"
                    }}
                >
                    {manualGenerationStatus ? "⏳ Generuję..." : "🔄 Wywołaj Cron (Generuj SMS na jutro)"}
                </button>

                {manualGenerationStatus && (
                    <div style={{
                        width: "100%",
                        padding: "1rem",
                        background: "var(--color-surface)",
                        borderRadius: "var(--radius-md)",
                        whiteSpace: "pre-line",
                        fontFamily: "monospace",
                        fontSize: "0.9rem"
                    }}>
                        {manualGenerationStatus}
                    </div>
                )}
            </div>

            {/* Send All Button */}
            {smsStats.draft > 0 && (
                <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                        onClick={handleSendAllSms}
                        disabled={sendingAll}
                        className="btn-primary"
                        style={{
                            flex: 1,
                            padding: "1rem",
                            background: sendingAll ? "#666" : "linear-gradient(135deg, #dcb14a, #f0c96c)",
                            fontSize: "1.1rem",
                            fontWeight: "bold"
                        }}
                    >
                        {sendingAll ? "Wysyłanie..." : `📤 Wyślij Wszystkie (${smsStats.draft})`}
                    </button>
                    <button
                        onClick={handleDeleteAllDrafts}
                        style={{
                            padding: "1rem 1.5rem",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "2px solid #ef4444",
                            borderRadius: "var(--radius-md)",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "1rem"
                        }}
                    >
                        🗑️ Usuń wszystkie szkice
                    </button>
                </div>
            )}

            {/* SMS Tabs */}
            <div style={{ display: "flex", gap: "0", borderBottom: "2px solid var(--color-border)", marginBottom: "1.5rem" }}>
                {(['drafts', 'sent', 'manual'] as const).map(tab => {
                    const labels = {
                        drafts: `📝 Szkice (${smsStats.draft})`,
                        sent: `📤 Wysłane (${smsStats.sent})`,
                        manual: '✉️ Wyślij SMS ręcznie'
                    };
                    return (
                        <button
                            key={tab}
                            onClick={() => setSmsTab(tab)}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: "none",
                                border: "none",
                                borderBottom: smsTab === tab ? "3px solid var(--color-primary)" : "3px solid transparent",
                                color: smsTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
                                fontWeight: smsTab === tab ? "bold" : "normal",
                                fontSize: "0.95rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {labels[tab]}
                        </button>
                    );
                })}
            </div>

            {/* Template Editor Toggle */}
            <button
                onClick={() => {
                    setShowTemplateEditor(!showTemplateEditor);
                    if (!showTemplateEditor && smsTemplates.length === 0) {
                        fetch('/api/admin/sms-templates')
                            .then(r => r.json())
                            .then(d => setSmsTemplates(d.templates || []))
                            .catch(() => { });
                    }
                }}
                style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: showTemplateEditor ? "rgba(220, 177, 74, 0.15)" : "var(--color-surface)",
                    border: showTemplateEditor ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: showTemplateEditor ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    textAlign: "left",
                    marginBottom: "1rem"
                }}
            >
                {showTemplateEditor ? '▼' : '▶'} 📝 Szablony SMS (kliknij aby {showTemplateEditor ? 'schować' : 'edytować'})
            </button>

            {/* Template Editor */}
            {showTemplateEditor && (
                <div style={{
                    background: "var(--color-surface)",
                    padding: "1.5rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1.5rem",
                    border: "1px solid rgba(220, 177, 74, 0.2)"
                }}>
                    <div style={{ marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>📝 Szablony treści SMS</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                            Placeholders: <code>{'{time}'}</code> = godzina, <code>{'{doctor}'}</code> = lekarz, <code>{'{patientName}'}</code> = imię, <code>{'{date}'}</code> = data, <code>{'{appointmentType}'}</code> = typ
                        </p>
                    </div>

                    {smsTemplates.length === 0 ? (
                        <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "1rem" }}>Ładowanie szablonów...</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {smsTemplates.map(tmpl => {
                                const isEditing = editingTemplateId === tmpl.id;
                                return (
                                    <div key={tmpl.id} style={{
                                        padding: "1rem",
                                        background: "var(--color-background)",
                                        borderRadius: "6px",
                                        border: isEditing ? "2px solid var(--color-primary)" : "1px solid var(--color-border)"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                            <strong style={{ fontSize: "0.9rem" }}>
                                                {tmpl.label || tmpl.key}
                                            </strong>
                                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                                                {tmpl.key}
                                            </span>
                                        </div>

                                        {isEditing ? (
                                            <div>
                                                <textarea
                                                    value={editingTemplateText}
                                                    onChange={(e) => setEditingTemplateText(e.target.value)}
                                                    style={{
                                                        width: "100%",
                                                        minHeight: "70px",
                                                        padding: "0.8rem",
                                                        borderRadius: "4px",
                                                        border: "1px solid var(--color-border)",
                                                        background: "var(--color-surface)",
                                                        color: "var(--color-text-main)",
                                                        fontSize: "0.9rem",
                                                        fontFamily: "inherit",
                                                        resize: "vertical"
                                                    }}
                                                />
                                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                                    <button
                                                        onClick={async () => {
                                                            const res = await fetch('/api/admin/sms-templates', {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ id: tmpl.id, template: editingTemplateText })
                                                            });
                                                            if (res.ok) {
                                                                setSmsTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, template: editingTemplateText } : t));
                                                                setEditingTemplateId(null);
                                                                setEditingTemplateText('');
                                                            } else {
                                                                alert('Błąd zapisu szablonu');
                                                            }
                                                        }}
                                                        style={{
                                                            padding: "0.4rem 1rem",
                                                            background: "var(--color-primary)",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            color: "black",
                                                            cursor: "pointer",
                                                            fontWeight: "bold",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        💾 Zapisz
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingTemplateId(null); setEditingTemplateText(''); }}
                                                        style={{
                                                            padding: "0.4rem 1rem",
                                                            background: "var(--color-surface-hover)",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            color: "#fff",
                                                            cursor: "pointer",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        Anuluj
                                                    </button>
                                                </div>
                                                <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    {editingTemplateText.length} znaków
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => { setEditingTemplateId(tmpl.id); setEditingTemplateText(tmpl.template); }}
                                                style={{
                                                    padding: "0.5rem",
                                                    fontSize: "0.85rem",
                                                    color: "var(--color-text-muted)",
                                                    cursor: "pointer",
                                                    borderRadius: "4px",
                                                    transition: "background 0.2s"
                                                }}
                                                title="Kliknij aby edytować"
                                            >
                                                {tmpl.template}
                                                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", opacity: 0.6 }}>✏️</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ DRAFTS TAB ═══ */}
            {smsTab === 'drafts' && (
                <>
                    {smsReminders.filter(sms => sms.status === 'draft').length === 0 ? (
                        <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>Brak szkiców SMS</p>
                    ) : (
                        smsReminders.filter(sms => sms.status === 'draft').map(sms => {
                            const isEditing = editingSmsId === sms.id;
                            const timeMatch = sms.sms_message?.match(/(\d{1,2}):(\d{2})/);
                            const appointmentTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : new Date(sms.appointment_date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                            const appointmentDate = new Date(sms.appointment_date).toLocaleDateString('pl-PL', { timeZone: 'UTC' });

                            return (
                                <div key={sms.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                        <div>
                                            <strong style={{ fontSize: "1.1rem" }}>{sms.patient_name || sms.phone}</strong>
                                            <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>📞 {sms.phone} • 🦷 {sms.appointment_type}</div>
                                            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>📅 {appointmentDate} • ⏰ {appointmentTime} • 👨‍⚕️ {sms.doctor_name}</span>
                                        </div>
                                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", background: '#ffc107', color: 'white' }}>draft</span>
                                    </div>

                                    {isEditing ? (
                                        <div style={{ marginBottom: "1rem" }}>
                                            <textarea value={editingSmsMessage} onChange={(e) => setEditingSmsMessage(e.target.value)} style={{ width: "100%", minHeight: "80px", padding: "0.8rem", borderRadius: "4px", border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text-main)", fontSize: "0.9rem", fontFamily: "inherit" }} />
                                            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{editingSmsMessage.length} znaków • {Math.ceil(editingSmsMessage.length / 160)} SMS</div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: "1rem", background: "var(--color-background)", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                            {sms.sms_message}
                                            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{sms.sms_message.length} znaków • {Math.ceil(sms.sms_message.length / 160)} SMS</div>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                        {isEditing ? (
                                            <>
                                                <button onClick={() => handleEditSms(sms.id, editingSmsMessage)} style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold" }}>💾 Zapisz</button>
                                                <button onClick={() => { setEditingSmsId(null); setEditingSmsMessage(''); }} style={{ padding: "0.5rem 1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>Anuluj</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditingSmsId(sms.id); setEditingSmsMessage(sms.sms_message); }} style={{ padding: "0.5rem 1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>✏️ Edytuj</button>
                                                <button onClick={() => handleSendSingleSms(sms.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold" }}>📱 Wyślij</button>
                                                <button onClick={() => handleDeleteSms(sms.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>🗑️ Usuń</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* ═══ SKIPPED PATIENTS ═══ */}
                    {skippedPatients.length > 0 && (
                        <div style={{
                            marginTop: "1.5rem",
                            padding: "1.25rem",
                            background: "rgba(255, 193, 7, 0.08)",
                            border: "2px solid rgba(255, 193, 7, 0.3)",
                            borderRadius: "var(--radius-md)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                                <strong style={{ fontSize: "1rem", color: "#ffc107" }}>Pominięci pacjenci ({skippedPatients.length})</strong>
                                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>— w godzinach pracy, ale bez SMS</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                {skippedPatients.map((sp, idx) => (
                                    <div key={idx} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.75rem 1rem",
                                        background: "var(--color-surface)",
                                        borderRadius: "6px",
                                        gap: "1rem",
                                        flexWrap: "wrap"
                                    }}>
                                        <div style={{ flex: 1, minWidth: "200px" }}>
                                            <strong style={{ fontSize: "0.95rem" }}>{sp.patientName}</strong>
                                            <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                ⏰ {sp.appointmentTime} • 👨‍⚕️ {sp.doctorName} • 🦷 {sp.appointmentType}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                            <span style={{
                                                padding: "0.25rem 0.6rem",
                                                background: "rgba(255, 193, 7, 0.15)",
                                                color: "#ffc107",
                                                borderRadius: "4px",
                                                fontSize: "0.78rem",
                                                fontWeight: "600",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {sp.reason}
                                            </span>
                                            {sp.reason.includes('telefonu') && (
                                                <button
                                                    onClick={() => {
                                                        setSmsTab('manual');
                                                        setPatientSearchQuery(sp.patientName);
                                                    }}
                                                    style={{
                                                        padding: "0.35rem 0.75rem",
                                                        background: "var(--color-primary)",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        color: "black",
                                                        cursor: "pointer",
                                                        fontWeight: "600",
                                                        fontSize: "0.8rem",
                                                        whiteSpace: "nowrap"
                                                    }}
                                                >
                                                    ✉️ Wyślij ręcznie
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ═══ SENT TAB — Grouped by Date ═══ */}
            {smsTab === 'sent' && (() => {
                const sentSms = smsReminders.filter(sms => sms.status === 'sent' || sms.status === 'failed');

                // Group by appointment date
                const grouped: Record<string, any[]> = {};
                sentSms.forEach(sms => {
                    const dateKey = new Date(sms.sent_at || sms.appointment_date).toLocaleDateString('pl-PL', { timeZone: 'UTC' });
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(sms);
                });

                // Sort dates newest first
                const sortedDates = Object.keys(grouped).sort((a, b) => {
                    const [da, ma, ya] = a.split('.').map(Number);
                    const [db, mb, yb] = b.split('.').map(Number);
                    return (yb * 10000 + mb * 100 + db) - (ya * 10000 + ma * 100 + da);
                });

                // Filter by selected date
                const visibleDates = sentDateFilter
                    ? sortedDates.filter(d => d === sentDateFilter)
                    : sortedDates;

                return (
                    <>
                        {/* Date Filter */}
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
                            <label style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", fontWeight: "600" }}>📅 Filtruj po dacie:</label>
                            <select
                                value={sentDateFilter}
                                onChange={(e) => setSentDateFilter(e.target.value)}
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "6px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.9rem",
                                    cursor: "pointer"
                                }}
                            >
                                <option value="">Wszystkie daty ({sentSms.length})</option>
                                {sortedDates.map(date => (
                                    <option key={date} value={date}>{date} ({grouped[date].length} SMS)</option>
                                ))}
                            </select>
                            {sentDateFilter && (
                                <button
                                    onClick={() => setSentDateFilter('')}
                                    style={{ padding: "0.4rem 0.8rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
                                >✕ Pokaż wszystkie</button>
                            )}
                        </div>

                        {visibleDates.length === 0 ? (
                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>Brak wysłanych SMS</p>
                        ) : (
                            visibleDates.map(dateKey => (
                                <div key={dateKey} style={{ marginBottom: "1.5rem" }}>
                                    {/* Date group header */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                        marginBottom: "0.75rem",
                                        padding: "0.6rem 1rem",
                                        background: "rgba(220, 177, 74, 0.08)",
                                        borderRadius: "6px",
                                        borderLeft: "3px solid var(--color-primary)"
                                    }}>
                                        <span style={{ fontSize: "1rem" }}>📅</span>
                                        <strong style={{ fontSize: "0.95rem", color: "var(--color-primary)" }}>{dateKey}</strong>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>({grouped[dateKey].length} SMS)</span>
                                    </div>

                                    {/* SMS cards for this date */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "0.5rem" }}>
                                        {grouped[dateKey].map(sms => {
                                            const timeMatch = sms.sms_message?.match(/(\d{1,2}):(\d{2})/);
                                            const appointmentTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '';

                                            return (
                                                <div key={sms.id} style={{
                                                    background: "var(--color-surface)",
                                                    padding: "1.25rem",
                                                    borderRadius: "var(--radius-md)",
                                                    border: sms.status === 'failed' ? '2px solid var(--color-error)' : undefined
                                                }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                                        <div>
                                                            <strong>{sms.patient_name || sms.phone}</strong>
                                                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                                📞 {sms.phone} {appointmentTime && `• ⏰ ${appointmentTime}`} • 👨‍⚕️ {sms.doctor_name}
                                                            </div>
                                                        </div>
                                                        <span style={{
                                                            padding: "0.2rem 0.5rem",
                                                            borderRadius: "4px",
                                                            fontSize: "0.75rem",
                                                            background: sms.status === 'sent' ? '#4caf50' : '#f44336',
                                                            color: 'white',
                                                            alignSelf: 'flex-start'
                                                        }}>{sms.status}</span>
                                                    </div>

                                                    <div style={{ padding: "0.75rem", background: "var(--color-background)", borderRadius: "4px", marginBottom: "0.75rem", fontSize: "0.88rem", lineHeight: "1.6" }}>
                                                        {sms.sms_message}
                                                    </div>

                                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                                                        <button
                                                            onClick={() => handleResendSms(sms)}
                                                            style={{ padding: "0.4rem 0.9rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                                                        >🔄 Wyślij ponownie</button>
                                                        <button
                                                            onClick={() => handleDeleteSms(sms.id)}
                                                            style={{ padding: "0.4rem 0.9rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer", fontSize: "0.85rem" }}
                                                        >🗑️ Usuń</button>
                                                        {sms.status === 'failed' && sms.send_error && (
                                                            <div style={{ flex: 1, padding: "0.4rem 0.6rem", background: "#fff3cd", color: "#856404", borderRadius: "4px", fontSize: "0.8rem" }}>❌ {sms.send_error}</div>
                                                        )}
                                                        {sms.sent_at && (
                                                            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginLeft: "auto" }}>
                                                                Wysłano: {new Date(sms.sent_at).toLocaleString('pl-PL', { timeZone: 'UTC' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                );
            })()}

            {/* ═══ MANUAL SMS TAB ═══ */}
            {smsTab === 'manual' && (
                <div style={{ maxWidth: "600px" }}>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>✉️ Wyślij SMS ręcznie</h3>
                        <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem", color: "var(--color-text-muted)" }}>Wyszukaj pacjenta po nazwisku, system automatycznie uzupełni numer telefonu.</p>

                        {/* Patient search */}
                        <div style={{ marginBottom: "1.25rem", position: "relative" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>🔍 Wyszukaj pacjenta</label>
                            <input
                                type="text"
                                value={patientSearchQuery}
                                onChange={(e) => handleSearchPatients(e.target.value)}
                                placeholder="Wpisz imię lub nazwisko..."
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid var(--color-border)",
                                    background: "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit"
                                }}
                            />
                            {searchingPatients && (
                                <div style={{ position: "absolute", right: "12px", top: "36px", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Szukam...</div>
                            )}

                            {/* Search results dropdown */}
                            {patientSearchResults.length > 0 && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "0 0 8px 8px",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                    zIndex: 100,
                                    maxHeight: "200px",
                                    overflowY: "auto"
                                }}>
                                    {patientSearchResults.map((patient, idx) => (
                                        <div
                                            key={patient.id || idx}
                                            onClick={() => handleSelectPatient(patient)}
                                            style={{
                                                padding: "0.65rem 1rem",
                                                cursor: "pointer",
                                                borderBottom: "1px solid var(--color-border)",
                                                transition: "background 0.15s",
                                                fontSize: "0.9rem"
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 177, 74, 0.1)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <strong>{patient.firstName} {patient.lastName}</strong>
                                            <span style={{ marginLeft: "0.75rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>📞 {patient.phone || 'brak numeru'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Patient name (auto-filled or manual) */}
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>👤 Imię i nazwisko</label>
                            <input
                                type="text"
                                value={manualPatientName}
                                onChange={(e) => setManualPatientName(e.target.value)}
                                placeholder="Jan Kowalski"
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid var(--color-border)",
                                    background: manualPatientName ? "rgba(220, 177, 74, 0.05)" : "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>

                        {/* Phone (auto-filled or manual) */}
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>📞 Numer telefonu</label>
                            <input
                                type="text"
                                value={manualPhone}
                                onChange={(e) => setManualPhone(e.target.value)}
                                placeholder="48123456789"
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: `2px solid ${manualPhone ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    background: manualPhone ? "rgba(220, 177, 74, 0.05)" : "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit"
                                }}
                            />
                            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Format: 48XXXXXXXXX (bez + i spacji)</div>
                        </div>

                        {/* Message */}
                        <div style={{ marginBottom: "1.25rem" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>💬 Treść SMS</label>
                            <textarea
                                value={manualMessage}
                                onChange={(e) => setManualMessage(e.target.value)}
                                placeholder="Wpisz treść wiadomości SMS..."
                                rows={4}
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid var(--color-border)",
                                    background: "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit",
                                    resize: "vertical",
                                    lineHeight: "1.5"
                                }}
                            />
                            <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: manualMessage.length > 160 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                                {manualMessage.length} / 160 znaków {manualMessage.length > 160 && `(${Math.ceil(manualMessage.length / 160)} SMS)`}
                            </div>
                        </div>

                        {/* Send button */}
                        <button
                            onClick={handleSendManualSms}
                            disabled={sendingManual || !manualPhone || !manualMessage}
                            style={{
                                width: "100%",
                                padding: "0.85rem",
                                background: (!manualPhone || !manualMessage) ? "#666" : "var(--color-primary)",
                                border: "none",
                                borderRadius: "8px",
                                color: "#1a1a1a",
                                fontWeight: "700",
                                fontSize: "1rem",
                                cursor: (!manualPhone || !manualMessage) ? "not-allowed" : "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {sendingManual ? '⏳ Wysyłanie...' : '📱 Wyślij SMS'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
    return renderSmsRemindersTab();
}
