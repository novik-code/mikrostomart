"use client";
import { useState, useEffect } from "react";
import { inputStyle } from "./adminStyles";

export default function WeekAfterVisitSmsTab() {
    const [weekAfterSms, setWeekAfterSms] = useState<any[]>([]);
    const [weekAfterTemplates, setWeekAfterTemplates] = useState<any[]>([]);
    const [weekAfterSmsTab, setWeekAfterSmsTab] = useState<'history' | 'templates'>('history');
    const [weekAfterTemplateEdits, setWeekAfterTemplateEdits] = useState<Record<string, string>>({});
    const [weekAfterLoading, setWeekAfterLoading] = useState(false);
    const [weekAfterSearch, setWeekAfterSearch] = useState('');
    const [weekAfterCronRunning, setWeekAfterCronRunning] = useState(false);
    const [weekAfterCronResult, setWeekAfterCronResult] = useState<any>(null);
    const [weekAfterEditingId, setWeekAfterEditingId] = useState<string | null>(null);
    const [weekAfterDraftEdits, setWeekAfterDraftEdits] = useState<Record<string, string>>({});

    useEffect(() => {
        (async () => {
            setWeekAfterLoading(true);
            try {
                const [histRes, tplRes] = await Promise.all([
                    fetch('/api/admin/sms-reminders?sms_type=week_after_visit&limit=200'),
                    fetch('/api/admin/sms-templates'),
                ]);
                const histData = await histRes.json();
                const tplData = await tplRes.json();
                setWeekAfterSms(histData.reminders || []);
                const filtered = (tplData.templates || []).filter((t: any) => t.key === 'week_after_visit');
                setWeekAfterTemplates(filtered);
                const edits: Record<string, string> = {};
                filtered.forEach((t: any) => { edits[t.id] = t.template; });
                setWeekAfterTemplateEdits(edits);
            } catch (e) { console.error(e); }
            setWeekAfterLoading(false);
        })();
    }, []);

const renderWeekAfterVisitSmsTab = () => {
    const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' };
    const inputS: React.CSSProperties = { width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white', fontSize: '0.88rem', boxSizing: 'border-box' };

    const loadData = async () => {
        setWeekAfterLoading(true);
        try {
            const [histRes, tplRes] = await Promise.all([
                fetch('/api/admin/sms-reminders?sms_type=week_after_visit&limit=200'),
                fetch('/api/admin/sms-templates'),
            ]);
            const histData = await histRes.json();
            const tplData = await tplRes.json();
            setWeekAfterSms(histData.reminders || []);
            const filtered = (tplData.templates || []).filter((t: any) => t.key === 'week_after_visit');
            setWeekAfterTemplates(filtered);
            const edits: Record<string, string> = {};
            filtered.forEach((t: any) => { edits[t.id] = t.template; });
            setWeekAfterTemplateEdits(edits);
        } catch (e) { console.error(e); }
        setWeekAfterLoading(false);
    };

    const saveTemplate = async (id: string) => {
        const res = await fetch('/api/admin/sms-templates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, template: weekAfterTemplateEdits[id] }),
        });
        if (res.ok) {
            setWeekAfterTemplates(prev => prev.map((t: any) =>
                t.id === id ? { ...t, template: weekAfterTemplateEdits[id] } : t
            ));
            alert('Szablon zapisany!');
        } else { alert('Błąd zapisu'); }
    };

    const runCronManual = async () => {
        setWeekAfterCronRunning(true);
        setWeekAfterCronResult(null);
        try {
            const res = await fetch('/api/cron/week-after-visit-sms?manual=true');
            const data = await res.json();
            setWeekAfterCronResult(data);
            await loadData();
        } catch (e: any) { setWeekAfterCronResult({ error: e.message }); }
        setWeekAfterCronRunning(false);
    };

    const filtered = weekAfterSms.filter(s =>
        !weekAfterSearch ||
        (s.patient_name || '').toLowerCase().includes(weekAfterSearch.toLowerCase()) ||
        (s.doctor_name || '').toLowerCase().includes(weekAfterSearch.toLowerCase())
    );

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = { sent: '#22c55e', failed: '#ef4444', draft: '#f59e0b', cancelled: '#6b7280' };
        return <span style={{ padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: 'bold', background: `${colors[status] || '#888'}22`, color: colors[status] || '#888', border: `1px solid ${colors[status] || '#888'}44` }}>{status}</span>;
    };

    return (
        <div>
            {/* Action bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={loadData} disabled={weekAfterLoading}
                    style={{ padding: '0.5rem 1.1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: weekAfterLoading ? 'rgba(255,255,255,0.3)' : 'white', cursor: weekAfterLoading ? 'wait' : 'pointer', fontSize: '0.83rem' }}>
                    {weekAfterLoading ? '⏳ Ładowanie...' : '🔄 Odśwież dane'}
                </button>
                <button onClick={runCronManual} disabled={weekAfterCronRunning}
                    style={{ padding: '0.5rem 1.1rem', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '0.5rem', color: '#34d399', cursor: weekAfterCronRunning ? 'wait' : 'pointer', fontSize: '0.83rem', fontWeight: 'bold' }}>
                    {weekAfterCronRunning ? '⏳ Uruchamianie...' : '▶ Uruchom cron teraz (test)'}
                </button>
                {weekAfterCronResult && (
                    <div style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', background: weekAfterCronResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${weekAfterCronResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, color: weekAfterCronResult.error ? '#ef4444' : '#22c55e' }}>
                        {weekAfterCronResult.error
                            ? `❌ ${weekAfterCronResult.error}`
                            : `✅ Razem: ${weekAfterCronResult.totalAppointments ?? '?'} wizyt | Szkice: ${weekAfterCronResult.draftsCreated ?? 0} | Pominięto: ${weekAfterCronResult.skipped ?? 0}${weekAfterCronResult.targetDate ? ` | Data: ${weekAfterCronResult.targetDate}` : ''}`
                        }
                    </div>
                )}
                {weekAfterSms.filter(s => s.status === 'draft').length > 0 && (
                    <button onClick={async () => {
                        const res = await fetch('/api/cron/post-visit-auto-send?manual=true&sms_type=week_after_visit');
                        const data = await res.json();
                        alert(`Wysłano: ${data.sent ?? 0} | Błędy: ${data.failed ?? 0}`);
                        setWeekAfterLoading(true);
                        const r = await fetch('/api/admin/sms-reminders?sms_type=week_after_visit&limit=200');
                        const d = await r.json();
                        setWeekAfterSms(d.reminders || []);
                        setWeekAfterLoading(false);
                    }} style={{ padding: '0.5rem 1.1rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '0.5rem', color: '#22c55e', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 'bold' }}>
                        📤 Wyślij wszystkie szkice ({weekAfterSms.filter(s => s.status === 'draft').length})
                    </button>
                )}
                {weekAfterSms.filter(s => s.status === 'draft').length > 0 && (
                    <button onClick={async () => {
                        if (!confirm('Usunąć wszystkie szkice SMS tydzień po wizycie?')) return;
                        const draftIds = weekAfterSms.filter(s => s.status === 'draft').map(s => s.id);
                        await Promise.all(draftIds.map(id => fetch(`/api/admin/sms-reminders?id=${id}`, { method: 'DELETE' })));
                        setWeekAfterSms(prev => prev.filter(s => s.status !== 'draft'));
                    }} style={{ padding: '0.5rem 1.1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.83rem' }}>
                        🗑 Usuń wszystkie szkice
                    </button>
                )}
            </div>

            {/* Skipped details panel - shows why appointments were not included */}
            {weekAfterCronResult && !weekAfterCronResult.error && (weekAfterCronResult.skippedDetails || []).length > 0 && (
                <details style={{ marginBottom: '1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.6rem', padding: '0.75rem 1rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                        {weekAfterCronResult.skippedDetails.length} pominiętych wizyt — kliknij aby zobaczyć powody
                    </summary>
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {weekAfterCronResult.skippedDetails.map((s: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.73rem', padding: '0.35rem 0.7rem', borderRadius: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ color: 'white', fontWeight: 600, minWidth: '140px' }}>{s.name}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{s.time}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)' }}>Dr. {s.doctor}</span>
                                <span style={{ color: '#f59e0b', marginLeft: 'auto' }}>{s.reason}</span>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                {(['history', 'templates'] as const).map(tab => (
                    <button key={tab} onClick={() => setWeekAfterSmsTab(tab)}
                        style={{ padding: '0.4rem 1rem', background: weekAfterSmsTab === tab ? 'rgba(52,211,153,0.15)' : 'transparent', border: `1px solid ${weekAfterSmsTab === tab ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.5rem', color: weekAfterSmsTab === tab ? '#34d399' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.83rem', fontWeight: weekAfterSmsTab === tab ? 'bold' : 'normal', transition: 'all 0.15s' }}>
                        {tab === 'history' ? '📋 Historia wysłanych' : '✏️ Szablon wiadomości'}
                    </button>
                ))}
            </div>

            {/* HISTORY TAB */}
            {weekAfterSmsTab === 'history' && (
                <div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input value={weekAfterSearch} onChange={e => setWeekAfterSearch(e.target.value)}
                            placeholder="Szukaj pacjenta, lekarza..." style={{ ...inputS, maxWidth: '320px', padding: '0.5rem 0.8rem' }} />
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            Łącznie: <strong style={{ color: 'white' }}>{weekAfterSms.length}</strong>
                            &nbsp;|&nbsp; Szkice: <strong style={{ color: '#f59e0b' }}>{weekAfterSms.filter(s => s.status === 'draft').length}</strong>
                            &nbsp;|&nbsp; Wysłanych: <strong style={{ color: '#22c55e' }}>{weekAfterSms.filter(s => s.status === 'sent').length}</strong>
                            &nbsp;|&nbsp; Błędów: <strong style={{ color: '#ef4444' }}>{weekAfterSms.filter(s => s.status === 'failed').length}</strong>
                        </div>
                    </div>
                    {weekAfterLoading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>⏳ Ładowanie...</p>}
                    {!weekAfterLoading && filtered.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                            Brak SMS z tygodnia po wizycie &mdash; kliknij &ldquo;Odśwież dane&rdquo; lub uruchom cron.
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filtered.map((sms: any) => {
                            const isDraft = sms.status === 'draft';
                            const isEditing = weekAfterEditingId === sms.id;
                            const editMsg = weekAfterDraftEdits[sms.id] ?? sms.sms_message;
                            const deleteDraftW = async (id: string) => {
                                if (!confirm('Usunąć tego szkicu?')) return;
                                await fetch(`/api/admin/sms-reminders?id=${id}`, { method: 'DELETE' });
                                setWeekAfterSms(prev => prev.filter((s: any) => s.id !== id));
                            };
                            const sendNowW = async (id: string, phone: string, message: string) => {
                                if (!confirm(`Wysłać SMS do ${phone} teraz?`)) return;
                                const res = await fetch('/api/admin/sms-send', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id, phone, message }),
                                });
                                const data = await res.json();
                                if (data.success) {
                                    setWeekAfterSms(prev => prev.map((s: any) => s.id === id ? { ...s, status: 'sent' } : s));
                                } else { alert('Błąd: ' + data.error); }
                            };
                            const editDraftW = async (id: string, newMsg: string) => {
                                await fetch('/api/admin/sms-reminders', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id, sms_message: newMsg }),
                                });
                                setWeekAfterSms(prev => prev.map((s: any) => s.id === id ? { ...s, sms_message: newMsg } : s));
                            };
                            return (
                                <div key={sms.id} style={{ ...cardStyle, marginBottom: 0, padding: '0.85rem 1rem', border: isDraft ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.88rem' }}>{sms.patient_name}</span>
                                                {statusBadge(sms.status)}
                                                <span style={{ fontSize: '0.65rem', color: '#34d399', padding: '0.1rem 0.4rem', borderRadius: '1rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)' }}>📱 Tydzień po wizycie</span>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                                                Dr. {sms.doctor_name} &middot; {sms.appointment_type} &middot; {sms.phone}
                                                {sms.sent_at && <> &middot; wysłano: {new Date(sms.sent_at).toLocaleString('pl-PL')}</>}
                                                {sms.appointment_date && <> &middot; wizyta: {new Date(sms.appointment_date).toLocaleDateString('pl-PL')}</>}
                                            </div>
                                            {isEditing ? (
                                                <textarea
                                                    value={editMsg}
                                                    onChange={e => setWeekAfterDraftEdits(prev => ({ ...prev, [sms.id]: e.target.value }))}
                                                    rows={3}
                                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'white', fontSize: '0.75rem', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.4rem' }}
                                                />
                                            ) : (
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', borderRadius: '0.4rem', padding: '0.4rem 0.6rem', fontStyle: 'italic' }}>
                                                    {sms.sms_message}
                                                </div>
                                            )}
                                            {sms.send_error && <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '0.3rem' }}>⚠ {sms.send_error}</div>}
                                            {isDraft && (
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={() => { editDraftW(sms.id, editMsg); setWeekAfterEditingId(null); }} style={{ padding: '0.25rem 0.7rem', background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.4)', borderRadius: '0.35rem', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}>💾 Zapisz</button>
                                                            <button onClick={() => setWeekAfterEditingId(null)} style={{ padding: '0.25rem 0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.35rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>Anuluj</button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => { setWeekAfterEditingId(sms.id); setWeekAfterDraftEdits(prev => ({ ...prev, [sms.id]: sms.sms_message })); }} style={{ padding: '0.25rem 0.7rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '0.35rem', color: '#34d399', cursor: 'pointer', fontSize: '0.72rem' }}>✏️ Edytuj</button>
                                                    )}
                                                    <button onClick={() => sendNowW(sms.id, sms.phone, editMsg)} style={{ padding: '0.25rem 0.7rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.35rem', color: '#22c55e', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}>📤 Wyślij teraz</button>
                                                    <button onClick={() => deleteDraftW(sms.id)} style={{ padding: '0.25rem 0.7rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.35rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem' }}>🗑 Usuń</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TEMPLATES TAB */}
            {weekAfterSmsTab === 'templates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '0.6rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                        <strong style={{ color: '#34d399' }}>Dostępne zmienne:</strong> {'{patientFirstName}'} &mdash; imię &nbsp;|&nbsp; {'{appUrl}'} &mdash; link do strony aplikacji (wstawiany automatycznie)<br />
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem', display: 'block' }}>💡 Wskazówka: Używaj angielskich liter bez polskich znaków, żeby SMS mieścił się w 160 znakach (kodowanie GSM-7).</span>
                    </div>
                    {weekAfterTemplates.length === 0 && !weekAfterLoading && (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Brak szablonu &mdash; kliknij &ldquo;Odśwież dane&rdquo;.</p>
                    )}
                    {weekAfterTemplates.map((tpl: any) => (
                        <div key={tpl.id} style={cardStyle}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem', marginBottom: '0.1rem' }}>{tpl.label}</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>Klucz: <code style={{ color: '#34d399' }}>{tpl.key}</code></div>
                            </div>
                            <textarea
                                value={weekAfterTemplateEdits[tpl.id] ?? tpl.template}
                                onChange={e => setWeekAfterTemplateEdits(prev => ({ ...prev, [tpl.id]: e.target.value }))}
                                rows={4}
                                style={{ ...inputS, resize: 'vertical', lineHeight: '1.5', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                <button onClick={() => saveTemplate(tpl.id)}
                                    style={{ padding: '0.45rem 1.1rem', background: 'var(--color-primary)', border: 'none', borderRadius: '0.4rem', color: 'black', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    💾 Zapisz
                                </button>
                                <button onClick={() => setWeekAfterTemplateEdits(prev => ({ ...prev, [tpl.id]: tpl.template }))}
                                    style={{ padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    ↺ Przywróć
                                </button>
                                <span style={{ fontSize: '0.72rem', color: (weekAfterTemplateEdits[tpl.id] ?? tpl.template).length > 150 ? '#f59e0b' : 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                                    {(weekAfterTemplateEdits[tpl.id] ?? tpl.template).length} znaków
                                    {(weekAfterTemplateEdits[tpl.id] ?? tpl.template).length > 160 && ' ⚠ przekracza 160'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
    return renderWeekAfterVisitSmsTab();
}
