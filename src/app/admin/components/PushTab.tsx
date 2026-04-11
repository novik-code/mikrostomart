"use client";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

const GROUP_LABELS: Record<string, string> = {
    patients: '👥 Pacjenci',
    doctors: '🦷 Lekarze',
    hygienists: '💉 Higienistki',
    reception: '📞 Recepcja',
    assistant: '🔧 Asysta',
    admin: '👑 Admin',
};

const EMP_GROUP_OPTIONS: { key: string; label: string }[] = [
    { key: 'doctor', label: '🦷 Lekarz' },
    { key: 'hygienist', label: '💉 Higienistka' },
    { key: 'reception', label: '📞 Recepcja' },
    { key: 'assistant', label: '🔧 Asysta' },
];

export default function PushTab() {
    const [pushEmployees, setPushEmployees] = useState<any[]>([]);
    const [pushAdminSubs, setPushAdminSubs] = useState<any[]>([]);
    const [pushPatientSubsCount, setPushPatientSubsCount] = useState(0);
    const [pushStats, setPushStats] = useState<any>({});
    const [pushLoading, setPushLoading] = useState(false);
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [pushUrl, setPushUrl] = useState('/pracownik');
    const [pushGroups, setPushGroups] = useState<string[]>([]);
    const [pushIndividuals, setPushIndividuals] = useState<string[]>([]);
    const [pushEmpSearch, setPushEmpSearch] = useState('');
    const [pushSending, setPushSending] = useState(false);
    const [pushResult, setPushResult] = useState<any>(null);

    const [pushEmpGroups, setPushEmpGroups] = useState<Record<string, string[]>>({});
    const [pushEmpGroupSaving, setPushEmpGroupSaving] = useState<Record<string, boolean>>({});
    const [pushConfigs, setPushConfigs] = useState<any[]>([]);
    const [localConfigs, setLocalConfigs] = useState<Record<string, { groups: string[]; enabled: boolean }>>({});
    const [pushConfigSaving, setPushConfigSaving] = useState<Record<string, boolean>>({});

    const fetchPushData = async () => {
        setPushLoading(true);
        try {
            const [pushRes, configRes] = await Promise.all([
                fetch('/api/admin/push'),
                fetch('/api/admin/push/config'),
            ]);
            if (pushRes.ok) {
                const data = await pushRes.json();
                const emps = data.employees || [];
                setPushEmployees(emps);
                setPushAdminSubs(data.adminSubs || []);
                setPushPatientSubsCount(data.patientSubsCount || 0);
                setPushStats(data.stats || {});
                const groupMap: Record<string, string[]> = {};
                for (const emp of emps) {
                    groupMap[emp.user_id] = emp.push_groups || [];
                }
                setPushEmpGroups(groupMap);
            }
            if (configRes.ok) {
                const configData = await configRes.json();
                const configs = configData.configs || [];
                setPushConfigs(configs);
                const localInit: Record<string, { groups: string[]; enabled: boolean }> = {};
                for (const c of configs) {
                    localInit[c.key] = { groups: [...(c.groups || [])], enabled: c.enabled };
                }
                setLocalConfigs(localInit);
            }
        } catch (e) { console.error(e); }
        finally { setPushLoading(false); }
    };

    useEffect(() => { fetchPushData(); }, []);

    const handleSendPush = async () => {
        if (!pushTitle || !pushBody || (pushGroups.length === 0 && pushIndividuals.length === 0)) {
            alert('Wpisz tytuł, treść i wybierz co najmniej jedną grupę lub pracownika');
            return;
        }
        setPushSending(true);
        setPushResult(null);
        try {
            const res = await fetch('/api/admin/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: pushTitle,
                    body: pushBody,
                    url: pushUrl,
                    groups: pushGroups,
                    userIds: pushIndividuals,
                }),
            });
            const data = await res.json();
            setPushResult(data);
            if (res.ok) {
                setPushTitle('');
                setPushBody('');
                setPushGroups([]);
                setPushIndividuals([]);
                fetchPushData();
            }
        } catch (e: any) { setPushResult({ error: e.message }); }
        finally { setPushSending(false); }
    };

    const handleDeleteSub = async (id: string) => {
        if (!confirm('Usunąć tę subskrypcję?')) return;
        await fetch('/api/admin/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        fetchPushData();
    };

    const handleToggleEmpGroup = (userId: string, group: string) => {
        setPushEmpGroups(prev => {
            const current = prev[userId] || [];
            if (current.includes(group)) {
                return { ...prev, [userId]: current.filter(g => g !== group) };
            } else {
                return { ...prev, [userId]: [...current, group] };
            }
        });
    };

    const handleSaveEmpGroups = async (userId: string) => {
        setPushEmpGroupSaving(prev => ({ ...prev, [userId]: true }));
        try {
            const groups = pushEmpGroups[userId] || [];
            const res = await fetch('/api/admin/employees/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, groups }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Błąd zapisu');
            } else {
                setPushEmployees(prev => prev.map(e =>
                    e.user_id === userId ? { ...e, push_groups: groups } : e
                ));
            }
        } catch (e: any) { alert(e.message); }
        finally { setPushEmpGroupSaving(prev => ({ ...prev, [userId]: false })); }
    };

    const handleSaveConfig = async (key: string) => {
        setPushConfigSaving(prev => ({ ...prev, [key]: true }));
        try {
            const cfg = localConfigs[key];
            const res = await fetch('/api/admin/push/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, groups: cfg.groups, enabled: cfg.enabled }),
            });
            if (res.ok) {
                setPushConfigs(prev => prev.map((c: any) => c.key === key ? { ...c, ...cfg } : c));
            } else {
                alert('Błąd zapisu konfiguracji');
            }
        } catch (e: any) { alert(e.message); }
        finally { setPushConfigSaving(prev => ({ ...prev, [key]: false })); }
    };

    if (pushLoading) return <div style={{ padding: '2rem', color: 'white' }}>⏳ Ładowanie...</div>;

    const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.5rem' };
    const inputS: React.CSSProperties = { width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box' };

    const empConfigs = pushConfigs.filter((c: any) =>
        !c.recipient_types || c.recipient_types.includes('employees')
    );
    const patientConfigs = pushConfigs.filter((c: any) =>
        c.recipient_types && c.recipient_types.includes('patients') && !c.recipient_types.includes('employees')
    );
    const allEmpGroups = [{ k: 'doctors', l: '🦷 Lekarze' }, { k: 'hygienists', l: '💉 Higienistki' }, { k: 'reception', l: '📞 Recepcja' }, { k: 'assistant', l: '🔧 Asysta' }, { k: 'admin', l: '👑 Admin' }];

    const renderConfigRow = (cfg: any) => {
        const local = localConfigs[cfg.key] || { groups: cfg.groups || [], enabled: cfg.enabled };
        const isEmpTargeted = !cfg.recipient_types || cfg.recipient_types.includes('employees');
        return (
            <div key={cfg.key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', padding: '1rem 1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '0.1rem' }}>{cfg.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.73rem' }}>{cfg.description}</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', flexShrink: 0 }}>
                        <input type="checkbox" checked={local.enabled}
                            onChange={e => setLocalConfigs(prev => ({ ...prev, [cfg.key]: { ...local, enabled: e.target.checked } }))}
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.78rem', color: local.enabled ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                            {local.enabled ? 'Aktywne' : 'Wyłączone'}
                        </span>
                    </label>
                </div>
                {isEmpTargeted && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                        {allEmpGroups.map(g => {
                            const active = local.groups.includes(g.k);
                            return (
                                <button key={g.k}
                                    onClick={() => setLocalConfigs(prev => ({
                                        ...prev,
                                        [cfg.key]: { ...local, groups: active ? local.groups.filter((x: string) => x !== g.k) : [...local.groups, g.k] }
                                    }))}
                                    style={{ padding: '0.25rem 0.65rem', borderRadius: '2rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.1s', fontWeight: active ? 'bold' : 'normal', border: `1px solid ${active ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'}`, background: active ? 'rgba(250,189,0,0.12)' : 'transparent', color: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.45)' }}>{g.l}</button>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => handleSaveConfig(cfg.key)} disabled={pushConfigSaving[cfg.key]}
                        style={{ padding: '0.35rem 1rem', background: 'var(--color-primary)', border: 'none', borderRadius: '0.4rem', color: 'black', fontWeight: 'bold', cursor: pushConfigSaving[cfg.key] ? 'wait' : 'pointer', fontSize: '0.76rem', opacity: pushConfigSaving[cfg.key] ? 0.6 : 1 }}>
                        {pushConfigSaving[cfg.key] ? '⏳ Zapisuję...' : '💾 Zapisz'}
                    </button>
                    <button
                        onClick={async (e) => {
                            const btn = e.currentTarget;
                            btn.disabled = true;
                            btn.textContent = '🧪 …';
                            try {
                                const res = await fetch('/api/admin/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configKey: cfg.key, label: cfg.label }) });
                                const data = await res.json();
                                btn.textContent = data.error ? `✗ ${data.error}` : `✓ ${data.sent ?? 0} dostarczono`;
                                btn.style.color = data.error ? '#ef4444' : '#22c55e';
                                btn.style.borderColor = data.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)';
                            } catch (err) {
                                btn.textContent = '✗ błąd';
                                btn.style.color = '#ef4444';
                            } finally {
                                setTimeout(() => { btn.disabled = false; btn.textContent = '🧪 Test'; btn.style.color = 'rgba(255,255,255,0.5)'; btn.style.borderColor = 'rgba(255,255,255,0.15)'; }, 4000);
                            }
                        }}
                        title="Wyślij testowe powiadomienie do skonfigurowanych grup"
                        style={{ padding: '0.35rem 0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.76rem' }}>
                        🧪 Test
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {[{ k: 'doctors', l: '🦷 Lekarze' }, { k: 'hygienists', l: '💉 Higienistki' }, { k: 'reception', l: '📞 Recepcja' }, { k: 'assistant', l: '🔧 Asysta' }, { k: 'admin', l: '👑 Admin' }].map(({ k, l }) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.65rem 1.1rem', minWidth: '100px' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{pushStats[k] ?? 0}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{l}</div>
                    </div>
                ))}
                {(pushStats.unassigned ?? 0) > 0 && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '0.65rem 1.1rem', minWidth: '100px' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ef4444' }}>{pushStats.unassigned}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>⚠️ Bez grupy</div>
                    </div>
                )}
                <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '0.75rem', padding: '0.65rem 1.1rem', minWidth: '100px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8' }}>{pushPatientSubsCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>👥 Pacjenci</div>
                </div>
            </div>

            {/* Automatic notifications — FOR EMPLOYEES */}
            {empConfigs.length > 0 && (
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 0.4rem 0', fontSize: '1.05rem' }}>🔁 Powiadomienia automatyczne — dla pracowników</h3>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.77rem', margin: '0 0 1.1rem 0' }}>
                        Wybierz grupy pracowników, które otrzymają każdy typ powiadomienia. Kliknij Zapisz po zmianach.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {empConfigs.map(renderConfigRow)}
                    </div>
                </div>
            )}

            {/* Automatic notifications — FOR PATIENTS */}
            {patientConfigs.length > 0 && (
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 0.4rem 0', fontSize: '1.05rem' }}>👥 Powiadomienia automatyczne — dla pacjentów</h3>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.77rem', margin: '0 0 1.1rem 0' }}>
                        Te powiadomienia trafiają do konkretnych pacjentów (np. przypomnienia o wizytach). Włącz lub wyłącz.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {patientConfigs.map(renderConfigRow)}
                    </div>
                </div>
            )}

            {/* Manual send */}
            <div style={cardStyle}>
                <h3 style={{ color: 'white', margin: '0 0 1.1rem 0', fontSize: '1.05rem' }}>📤 Wyślij powiadomienie jednorazowe</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.9rem' }}>
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', display: 'block', marginBottom: '0.3rem' }}>Tytuł *</label>
                        <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="np. Ważna informacja" maxLength={100} style={inputS} />
                    </div>
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', display: 'block', marginBottom: '0.3rem' }}>Link URL</label>
                        <input value={pushUrl} onChange={e => setPushUrl(e.target.value)} placeholder="/pracownik" style={inputS} />
                    </div>
                </div>
                <div style={{ marginBottom: '0.9rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', display: 'block', marginBottom: '0.3rem' }}>Treść *</label>
                    <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Treść powiadomienia..." maxLength={300} rows={3} style={{ ...inputS, resize: 'vertical' }} />
                </div>

                {/* Group chips */}
                <div style={{ marginBottom: '0.9rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', display: 'block', marginBottom: '0.5rem' }}>Grupy docelowe</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {Object.entries(GROUP_LABELS).map(([key, label]) => {
                            const active = pushGroups.includes(key);
                            return (
                                <button key={key} onClick={() => setPushGroups(prev => active ? prev.filter(g => g !== key) : [...prev, key])}
                                    style={{ padding: '0.35rem 0.8rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 'bold' : 'normal', transition: 'all 0.1s', border: `1px solid ${active ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'}`, background: active ? 'rgba(250,189,0,0.14)' : 'transparent', color: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)' }}>{label}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Individual employee chips */}
                <div style={{ marginBottom: '1.1rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', display: 'block', marginBottom: '0.5rem' }}>
                        Konkretni pracownicy
                        {pushIndividuals.length > 0 && <span style={{ marginLeft: '0.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>({pushIndividuals.length} wybranych)</span>}
                    </label>
                    <input
                        value={pushEmpSearch}
                        onChange={e => setPushEmpSearch(e.target.value)}
                        placeholder="Szukaj pracownika..."
                        style={{ ...inputS, marginBottom: '0.5rem', fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '120px', overflowY: 'auto' }}>
                        {pushEmployees
                            .filter((emp: any) => {
                                const q = pushEmpSearch.toLowerCase();
                                return !q || (emp.name || '').toLowerCase().includes(q) || (emp.email || '').toLowerCase().includes(q);
                            })
                            .map((emp: any) => {
                                const active = pushIndividuals.includes(emp.user_id);
                                const hasSubs = emp.subscription_count > 0;
                                return (
                                    <button key={emp.user_id}
                                        onClick={() => setPushIndividuals(prev => active ? prev.filter(id => id !== emp.user_id) : [...prev, emp.user_id])}
                                        style={{ padding: '0.3rem 0.7rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 'bold' : 'normal', transition: 'all 0.1s', border: `1px solid ${active ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(56,189,248,0.12)' : 'transparent', color: active ? '#38bdf8' : hasSubs ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        {emp.name || emp.email}
                                        {hasSubs && <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>📱</span>}
                                        {!hasSubs && <span style={{ fontSize: '0.62rem', opacity: 0.4 }}>○</span>}
                                    </button>
                                );
                            })
                        }
                    </div>
                    {pushEmployees.length === 0 && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>Brak danych — załaduj zakładkę Push lub odśwież.</p>
                    )}
                </div>

                {pushResult && (
                    <div style={{ marginBottom: '0.9rem', padding: '0.7rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', background: pushResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${pushResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, color: pushResult.error ? '#ef4444' : '#22c55e' }}>
                        {pushResult.error ? `❌ Błąd: ${pushResult.error}` : `✅ Wysłano: ${pushResult.sent} | Nieudane: ${pushResult.failed}`}
                    </div>
                )}
                {(() => {
                    const hasTargets = pushGroups.length > 0 || pushIndividuals.length > 0;
                    const canSend = !pushSending && !!pushTitle && !!pushBody && hasTargets;
                    return (
                        <button onClick={handleSendPush} disabled={!canSend}
                            style={{ padding: '0.65rem 1.6rem', background: 'var(--color-primary)', border: 'none', borderRadius: '0.5rem', color: 'black', fontWeight: 'bold', transition: 'all 0.2s', cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.5 }}>
                            {pushSending ? '📤 Wysyłanie...' : '📤 Wyślij powiadomienie'}
                        </button>
                    );
                })()}
            </div>

            {/* Employee subscriptions — multi-chip group editing */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                    <div>
                        <h3 style={{ color: 'white', margin: '0 0 0.2rem 0', fontSize: '1.05rem' }}>👥 Pracownicy i grupy powiadomień ({pushEmployees.length})</h3>
                        <p style={{ color: 'rgba(56,189,248,0.6)', fontSize: '0.73rem', margin: 0 }}>
                            {pushPatientSubsCount > 0 && `+ ${pushPatientSubsCount} pacjentów subskrybuje push`}
                        </p>
                    </div>
                    <button onClick={fetchPushData} style={{ padding: '0.3rem 0.65rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.73rem' }}>🔄 Odśwież</button>
                </div>

                {pushEmployees.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Brak pracowników.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {pushEmployees.map((emp: any) => {
                            const currentGroups = pushEmpGroups[emp.user_id] || emp.push_groups || [];
                            const serverGroups = emp.push_groups || [];
                            const changed = JSON.stringify([...currentGroups].sort()) !== JSON.stringify([...serverGroups].sort());
                            const hasSubs = emp.subscription_count > 0;
                            return (
                                <div key={emp.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', padding: '0.65rem 0.9rem', background: 'rgba(255,255,255,0.025)', borderRadius: '0.5rem', border: `1px solid ${hasSubs ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)'}` }}>
                                    {/* Name & email */}
                                    <div style={{ flex: 1, minWidth: '140px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>{emp.name || '—'}</span>
                                            {hasSubs && (
                                                <span style={{ padding: '0.08rem 0.4rem', borderRadius: '1rem', fontSize: '0.65rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                                                    📱 {emp.subscription_count}
                                                </span>
                                            )}
                                            {!hasSubs && (
                                                <span style={{ padding: '0.08rem 0.4rem', borderRadius: '1rem', fontSize: '0.65rem', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}>
                                                    brak sub.
                                                </span>
                                            )}
                                        </div>
                                        {emp.email && <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: '0.7rem' }}>{emp.email}</div>}
                                    </div>

                                    {/* Group chips — multi-select */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                        {EMP_GROUP_OPTIONS.map(opt => {
                                            const active = currentGroups.includes(opt.key);
                                            return (
                                                <button key={opt.key}
                                                    onClick={() => handleToggleEmpGroup(emp.user_id, opt.key)}
                                                    style={{ padding: '0.22rem 0.6rem', borderRadius: '2rem', fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.1s', fontWeight: active ? 'bold' : 'normal', border: `1px solid ${active ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(250,189,0,0.13)' : 'transparent', color: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.38)' }}>
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Save button — only visible when changed */}
                                    {changed && (
                                        <button onClick={() => handleSaveEmpGroups(emp.user_id)} disabled={pushEmpGroupSaving[emp.user_id]}
                                            style={{ padding: '0.25rem 0.7rem', background: 'var(--color-primary)', border: 'none', borderRadius: '0.4rem', color: 'black', fontWeight: 'bold', cursor: pushEmpGroupSaving[emp.user_id] ? 'wait' : 'pointer', fontSize: '0.73rem', opacity: pushEmpGroupSaving[emp.user_id] ? 0.6 : 1 }}>
                                            {pushEmpGroupSaving[emp.user_id] ? '⏳' : '💾 Zapisz'}
                                        </button>
                                    )}
                                    {/* Test push button per employee */}
                                    <button
                                        disabled={!hasSubs}
                                        title={hasSubs ? `Wyślij testowe push do ${emp.name || emp.email}` : 'Brak subskrypcji push dla tego pracownika'}
                                        onClick={async (e) => {
                                            const btn = e.currentTarget;
                                            btn.disabled = true;
                                            btn.textContent = '🧪 …';
                                            try {
                                                const res = await fetch('/api/admin/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: emp.user_id, label: emp.name || emp.email }) });
                                                const data = await res.json();
                                                btn.textContent = data.error ? `✗` : (data.sent > 0 ? '✓ push' : '○ 0');
                                                btn.style.color = data.error ? '#ef4444' : data.sent > 0 ? '#22c55e' : '#9ca3af';
                                            } catch {
                                                btn.textContent = '✗';
                                                btn.style.color = '#ef4444';
                                            } finally {
                                                setTimeout(() => { btn.disabled = !hasSubs; btn.textContent = '🧪'; btn.style.color = 'rgba(255,255,255,0.4)'; }, 4000);
                                            }
                                        }}
                                        style={{ padding: '0.2rem 0.45rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.35rem', color: 'rgba(255,255,255,0.4)', cursor: hasSubs ? 'pointer' : 'not-allowed', fontSize: '0.72rem', opacity: hasSubs ? 1 : 0.4 }}>
                                        🧪
                                    </button>
                                </div>
                            );
                        })}

                    </div>
                )}
            </div>
        </div>
    );
}
