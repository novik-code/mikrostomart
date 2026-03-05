"use client";
import { useState, useEffect } from "react";
import { inputStyle } from "./adminStyles";

export default function PostVisitSmsTab() {
    const [postVisitSms, setPostVisitSms] = useState<any[]>([]);
    const [postVisitTemplates, setPostVisitTemplates] = useState<any[]>([]);
    const [postVisitSmsTab, setPostVisitSmsTab] = useState<'history' | 'templates'>('history');
    const [postVisitTemplateEdits, setPostVisitTemplateEdits] = useState<Record<string, string>>({});
    const [postVisitLoading, setPostVisitLoading] = useState(false);
    const [postVisitSearch, setPostVisitSearch] = useState('');
    const [postVisitCronRunning, setPostVisitCronRunning] = useState(false);
    const [postVisitCronResult, setPostVisitCronResult] = useState<any>(null);
    const [postVisitEditingId, setPostVisitEditingId] = useState<string | null>(null);
    const [postVisitDraftEdits, setPostVisitDraftEdits] = useState<Record<string, string>>({});

    useEffect(() => {
        // Auto-load on mount
        (async () => {
            setPostVisitLoading(true);
            try {
                const [histRes, tplRes] = await Promise.all([
                    fetch('/api/admin/sms-reminders?sms_type=post_visit&limit=200'),
                    fetch('/api/admin/sms-templates'),
                ]);
                const histData = await histRes.json();
                const tplData = await tplRes.json();
                setPostVisitSms(histData.reminders || []);
                const pvTemplates = (tplData.templates || []).filter((t: any) =>
                    t.key === 'post_visit_review' || t.key === 'post_visit_reviewed'
                );
                setPostVisitTemplates(pvTemplates);
                const edits: Record<string, string> = {};
                pvTemplates.forEach((t: any) => { edits[t.id] = t.template; });
                setPostVisitTemplateEdits(edits);
            } catch (e) { console.error(e); }
            setPostVisitLoading(false);
        })();
    }, []);

const renderPostVisitSmsTab = () => {
    const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' };
    const inputS: React.CSSProperties = { width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white', fontSize: '0.88rem', boxSizing: 'border-box' };

    const loadData = async () => {
        setPostVisitLoading(true);
        try {
            const [histRes, tplRes] = await Promise.all([
                fetch('/api/admin/sms-reminders?sms_type=post_visit&limit=200'),
                fetch('/api/admin/sms-templates'),
            ]);
            const histData = await histRes.json();
            const tplData = await tplRes.json();
            setPostVisitSms(histData.reminders || []);
            const pvTemplates = (tplData.templates || []).filter((t: any) =>
                t.key === 'post_visit_review' || t.key === 'post_visit_reviewed'
            );
            setPostVisitTemplates(pvTemplates);
            const edits: Record<string, string> = {};
            pvTemplates.forEach((t: any) => { edits[t.id] = t.template; });
            setPostVisitTemplateEdits(edits);
        } catch (e) { console.error(e); }
        setPostVisitLoading(false);
    };

    const saveTemplate = async (id: string) => {
        const res = await fetch('/api/admin/sms-templates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, template: postVisitTemplateEdits[id] }),
        });
        if (res.ok) {
            setPostVisitTemplates(prev => prev.map((t: any) =>
                t.id === id ? { ...t, template: postVisitTemplateEdits[id] } : t
            ));
            alert('Szablon zapisany!');
        } else { alert('Błąd zapisu'); }
    };

    const runCronManual = async () => {
        setPostVisitCronRunning(true);
        setPostVisitCronResult(null);
        try {
            const res = await fetch('/api/cron/post-visit-sms?manual=true');
            const data = await res.json();
            setPostVisitCronResult(data);
            await loadData();
        } catch (e: any) { setPostVisitCronResult({ error: e.message }); }
        setPostVisitCronRunning(false);
    };

    const sendAllDrafts = async () => {
        if (!confirm('Wysłać wszystkie wersje robocze TERAZ?')) return;
        const res = await fetch('/api/cron/post-visit-auto-send?manual=true&sms_type=post_visit');
        const data = await res.json();
        alert(`Wysłano: ${data.sent ?? 0} | Błędy: ${data.failed ?? 0}`);
        await loadData();
    };

    const editDraft = async (id: string, newMsg: string) => {
        await fetch('/api/admin/sms-reminders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, sms_message: newMsg }),
        });
        setPostVisitSms(prev => prev.map((s: any) => s.id === id ? { ...s, sms_message: newMsg } : s));
    };

    const deleteDraft = async (id: string) => {
        if (!confirm('Usunąć tę wersję roboczą?')) return;
        await fetch(`/api/admin/sms-reminders?id=${id}`, { method: 'DELETE' });
        setPostVisitSms(prev => prev.filter((s: any) => s.id !== id));
    };

    const sendNow = async (id: string, phone: string, message: string) => {
        if (!confirm(`Wysłać SMS do ${phone} teraz?`)) return;
        const res = await fetch('/api/admin/sms-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, phone, message }),
        });
        const data = await res.json();
        if (data.success) {
            setPostVisitSms(prev => prev.map((s: any) => s.id === id ? { ...s, status: 'sent' } : s));
            alert('SMS wysłany!');
        } else { alert('Błąd: ' + data.error); }
    };

    const filtered = postVisitSms.filter(s =>
        !postVisitSearch ||
        (s.patient_name || '').toLowerCase().includes(postVisitSearch.toLowerCase()) ||
        (s.doctor_name || '').toLowerCase().includes(postVisitSearch.toLowerCase())
    );

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = { sent: '#22c55e', failed: '#ef4444', draft: '#f59e0b', cancelled: '#6b7280' };
        return <span style={{ padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: 'bold', background: `${colors[status] || '#888'}22`, color: colors[status] || '#888', border: `1px solid ${colors[status] || '#888'}44` }}>{status}</span>;
    };

    return (
        <div>
            {/* Action bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={loadData} disabled={postVisitLoading}
                    style={{ padding: '0.5rem 1.1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: postVisitLoading ? 'rgba(255,255,255,0.3)' : 'white', cursor: postVisitLoading ? 'wait' : 'pointer', fontSize: '0.83rem' }}>
                    {postVisitLoading ? '⏳ Ładowanie...' : '🔄 Odśwież dane'}
                </button>
                <button onClick={runCronManual} disabled={postVisitCronRunning}
                    style={{ padding: '0.5rem 1.1rem', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '0.5rem', color: '#38bdf8', cursor: postVisitCronRunning ? 'wait' : 'pointer', fontSize: '0.83rem', fontWeight: 'bold' }}>
                    {postVisitCronRunning ? '⏳ Uruchamianie...' : '▶ Uruchom cron teraz (test)'}
                </button>
                {postVisitCronResult && (
                    <div style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', background: postVisitCronResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${postVisitCronResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, color: postVisitCronResult.error ? '#ef4444' : '#22c55e' }}>
                        {postVisitCronResult.error
                            ? `❌ ${postVisitCronResult.error}`
                            : `✅ Razem: ${postVisitCronResult.totalAppointments ?? '?'} wizyt | Szkice: ${postVisitCronResult.draftsCreated ?? 0} | Pominięto: ${postVisitCronResult.skipped ?? 0}`}
                    </div>
                )}
                {postVisitSms.filter(s => s.status === 'draft').length > 0 && (
                    <button onClick={sendAllDrafts} style={{ padding: '0.5rem 1.1rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '0.5rem', color: '#22c55e', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 'bold' }}>
                        📤 Wyślij wszystkie szkice ({postVisitSms.filter(s => s.status === 'draft').length})
                    </button>
                )}
                {postVisitSms.filter(s => s.status === 'draft').length > 0 && (
                    <button onClick={async () => {
                        if (!confirm('Usunąć wszystkie szkice SMS po wizycie?')) return;
                        const draftIds = postVisitSms.filter(s => s.status === 'draft').map(s => s.id);
                        await Promise.all(draftIds.map(id => fetch(`/api/admin/sms-reminders?id=${id}`, { method: 'DELETE' })));
                        setPostVisitSms(prev => prev.filter(s => s.status !== 'draft'));
                    }} style={{ padding: '0.5rem 1.1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.83rem' }}>
                        🗑 Usuń wszystkie szkice
                    </button>
                )}
            </div>

            {/* Skipped details panel - shows why appointments were not included */}
            {postVisitCronResult && !postVisitCronResult.error && (postVisitCronResult.skippedDetails || []).length > 0 && (
                <details style={{ marginBottom: '1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.6rem', padding: '0.75rem 1rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                        {postVisitCronResult.skippedDetails.length} pominiętych wizyt — kliknij aby zobaczyć powody
                    </summary>
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {postVisitCronResult.skippedDetails.map((s: any, i: number) => (
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
                    <button key={tab} onClick={() => setPostVisitSmsTab(tab)}
                        style={{ padding: '0.4rem 1rem', background: postVisitSmsTab === tab ? 'rgba(56,189,248,0.15)' : 'transparent', border: `1px solid ${postVisitSmsTab === tab ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.5rem', color: postVisitSmsTab === tab ? '#38bdf8' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.83rem', fontWeight: postVisitSmsTab === tab ? 'bold' : 'normal', transition: 'all 0.15s' }}>
                        {tab === 'history' ? '📋 Historia wysłanych' : '✏️ Szablony wiadomości'}
                    </button>
                ))}
            </div>

            {/* HISTORY TAB */}
            {postVisitSmsTab === 'history' && (
                <div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input value={postVisitSearch} onChange={e => setPostVisitSearch(e.target.value)}
                            placeholder="Szukaj pacjenta, lekarza..." style={{ ...inputS, maxWidth: '320px', padding: '0.5rem 0.8rem' }} />
                        {/* Summary stats */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            Łącznie: <strong style={{ color: 'white' }}>{postVisitSms.length}</strong>
                            &nbsp;|&nbsp; Szkice: <strong style={{ color: '#f59e0b' }}>{postVisitSms.filter(s => s.status === 'draft').length}</strong>
                            &nbsp;|&nbsp; Wysłanych: <strong style={{ color: '#22c55e' }}>{postVisitSms.filter(s => s.status === 'sent').length}</strong>
                            &nbsp;|&nbsp; Błędów: <strong style={{ color: '#ef4444' }}>{postVisitSms.filter(s => s.status === 'failed').length}</strong>
                        </div>
                    </div>
                    {postVisitLoading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>⏳ Ładowanie...</p>}
                    {!postVisitLoading && filtered.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                            Brak SMS po wizycie — kliknij &ldquo;Odśwież dane&rdquo; lub uruchom cron.
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filtered.map((sms: any) => {
                            const isDraft = sms.status === 'draft';
                            const isEditing = postVisitEditingId === sms.id;
                            const editMsg = postVisitDraftEdits[sms.id] ?? sms.sms_message;
                            return (
                                <div key={sms.id} style={{ ...cardStyle, marginBottom: 0, padding: '0.85rem 1rem', border: isDraft ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.88rem' }}>{sms.patient_name}</span>
                                                {statusBadge(sms.status)}
                                                {sms.already_reviewed && <span style={{ fontSize: '0.65rem', color: '#a78bfa', padding: '0.1rem 0.4rem', borderRadius: '1rem', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.1)' }}>⭐ Ma recenzję Google</span>}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                                                Dr. {sms.doctor_name} &middot; {sms.appointment_type} &middot; {sms.phone}
                                                {sms.sent_at && <> &middot; wysłano: {new Date(sms.sent_at).toLocaleString('pl-PL')}</>}
                                                {sms.appointment_date && <> &middot; wizyta: {new Date(sms.appointment_date).toLocaleDateString('pl-PL')}</>}
                                            </div>
                                            {isEditing ? (
                                                <textarea
                                                    value={editMsg}
                                                    onChange={e => setPostVisitDraftEdits(prev => ({ ...prev, [sms.id]: e.target.value }))}
                                                    rows={3}
                                                    style={{ ...inputS, resize: 'vertical', fontSize: '0.75rem', marginBottom: '0.4rem' }}
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
                                                            <button onClick={() => { editDraft(sms.id, editMsg); setPostVisitEditingId(null); }} style={{ padding: '0.25rem 0.7rem', background: 'rgba(220,177,74,0.15)', border: '1px solid rgba(220,177,74,0.4)', borderRadius: '0.35rem', color: '#dcb14a', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}>💾 Zapisz</button>
                                                            <button onClick={() => setPostVisitEditingId(null)} style={{ padding: '0.25rem 0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.35rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>Anuluj</button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => { setPostVisitEditingId(sms.id); setPostVisitDraftEdits(prev => ({ ...prev, [sms.id]: sms.sms_message })); }} style={{ padding: '0.25rem 0.7rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '0.35rem', color: '#38bdf8', cursor: 'pointer', fontSize: '0.72rem' }}>✏️ Edytuj</button>
                                                    )}
                                                    <button onClick={() => sendNow(sms.id, sms.phone, editMsg)} style={{ padding: '0.25rem 0.7rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.35rem', color: '#22c55e', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}>📤 Wyślij teraz</button>
                                                    <button onClick={() => deleteDraft(sms.id)} style={{ padding: '0.25rem 0.7rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.35rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem' }}>🗑 Usuń</button>
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
            {postVisitSmsTab === 'templates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '0.6rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                        <strong style={{ color: '#38bdf8' }}>Dostępne zmienne:</strong> {'{patientFirstName}'} — imię pacjenta &nbsp;|&nbsp; {'{surveyUrl}'} — link do ankiety &nbsp;|&nbsp; {'{doctorName}'} — lekarz &nbsp;|&nbsp; {'{funFact}'} — losowa ciekawostka/anegdota (tylko w wersji z recenzją)
                    </div>
                    {postVisitTemplates.length === 0 && !postVisitLoading && (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Brak szablonów — kliknij &ldquo;Odśwież dane&rdquo;.</p>
                    )}
                    {postVisitTemplates.map((tpl: any) => (
                        <div key={tpl.id} style={cardStyle}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem', marginBottom: '0.1rem' }}>{tpl.label}</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>Klucz: <code style={{ color: '#38bdf8' }}>{tpl.key}</code></div>
                            </div>
                            <textarea
                                value={postVisitTemplateEdits[tpl.id] ?? tpl.template}
                                onChange={e => setPostVisitTemplateEdits(prev => ({ ...prev, [tpl.id]: e.target.value }))}
                                rows={4}
                                style={{ ...inputS, resize: 'vertical', lineHeight: '1.5', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                <button onClick={() => saveTemplate(tpl.id)}
                                    style={{ padding: '0.45rem 1.1rem', background: 'var(--color-primary)', border: 'none', borderRadius: '0.4rem', color: 'black', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    💾 Zapisz
                                </button>
                                <button onClick={() => setPostVisitTemplateEdits(prev => ({ ...prev, [tpl.id]: tpl.template }))}
                                    style={{ padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    ↺ Przywróć oryginalny
                                </button>
                                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                                    {(postVisitTemplateEdits[tpl.id] ?? tpl.template).length} znaków
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
    return renderPostVisitSmsTab();
}
