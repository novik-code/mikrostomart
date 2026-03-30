"use client";

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Database, Plug, Info } from 'lucide-react';

interface PmsSettings {
    provider: string;
    apiUrl: string;
    hasApiKey: boolean;
    notes: string;
    updatedAt: string | null;
    updatedBy: string | null;
}

interface HealthResult {
    healthy: boolean;
    provider: string;
    message: string;
    detail?: any;
}

const PROVIDERS = [
    {
        id: 'prodentis',
        name: 'Prodentis',
        description: 'Zewnętrzne API systemu Prodentis (REST). Obecnie używane w Mikrostomart.',
        icon: '🦷',
        badge: 'Produkcja',
        badgeColor: '#22c55e',
    },
    {
        id: 'standalone',
        name: 'Standalone (bez PMS)',
        description: 'Wbudowany system rezerwacji oparty na Supabase. Dla gabinetów bez zewnętrznego PMS lub środowiska demo.',
        icon: '🗄️',
        badge: 'Demo / Nowy',
        badgeColor: '#a78bfa',
    },
];

const COMING_SOON = [
    { id: 'mediporta', name: 'Mediporta', icon: '🏥' },
    { id: 'kamsoft', name: 'KamSoft', icon: '💊' },
    { id: 'planmeca', name: 'Planmeca', icon: '⚙️' },
    { id: 'estomed', name: 'Estomed', icon: '📋' },
];

export default function PmsSettingsTab() {
    const [settings, setSettings] = useState<PmsSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [health, setHealth] = useState<HealthResult | null>(null);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetch('/api/admin/pms-settings')
            .then(r => r.json())
            .then(d => {
                setSettings(d);
                setNotes(d.notes || '');
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSaveNotes = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch('/api/admin/pms-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: settings?.provider, notes }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setMsg({ type: 'ok', text: 'Zapisano notatkę.' });
        } catch (e: any) {
            setMsg({ type: 'err', text: e.message });
        }
        setSaving(false);
    };

    const handleHealthCheck = async () => {
        setTesting(true);
        setHealth(null);
        try {
            const res = await fetch('/api/admin/pms-settings?action=health', { method: 'POST' });
            const data = await res.json();
            setHealth(data);
        } catch {
            setHealth({ healthy: false, provider: settings?.provider || '?', message: 'Błąd połączenia z API' });
        }
        setTesting(false);
    };

    const card: React.CSSProperties = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.5rem',
        marginBottom: '1.25rem',
    };

    const badge = (text: string, color: string) => (
        <span style={{
            background: `${color}22`,
            color,
            border: `1px solid ${color}44`,
            borderRadius: 99,
            padding: '2px 10px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
        }}>{text}</span>
    );

    if (loading) return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Ładowanie…</div>;

    const activeProvider = PROVIDERS.find(p => p.id === settings?.provider) || PROVIDERS[0];
    const runtimeNote = `⚙️ Zmiana adaptera wymaga aktualizacji NEXT_PUBLIC_PMS_PROVIDER w Vercel → Redeploy. 
Poniżej możesz monitorować stan połączenia i zostawić notatki dla teamu.`;

    return (
        <div style={{ maxWidth: 720, padding: '0.5rem 0' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                🔌 Integracja PMS
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Zarządzaj połączeniem z systemem gabinetowym (PMS).
            </p>

            {/* Current provider */}
            <div style={{ ...card, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>{activeProvider.icon}</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                            Aktywny adapter: <span style={{ color: '#818cf8' }}>{activeProvider.name}</span>
                        </div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {activeProvider.description}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        {badge(activeProvider.badge, activeProvider.badgeColor)}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={handleHealthCheck}
                        disabled={testing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            background: testing ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.15)',
                            border: '1px solid rgba(99,102,241,0.4)',
                            borderRadius: 8,
                            color: '#818cf8',
                            cursor: testing ? 'wait' : 'pointer',
                            fontSize: '0.88rem', fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                    >
                        {testing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={14} />}
                        {testing ? 'Testowanie…' : 'Testuj połączenie'}
                    </button>

                    {settings?.apiUrl && (
                        <code style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.25)', padding: '4px 10px', borderRadius: 6 }}>
                            {settings.apiUrl}
                        </code>
                    )}

                    {settings?.hasApiKey && (
                        <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>🔑 API Key skonfigurowany</span>
                    )}
                </div>

                {/* Health result */}
                {health && (
                    <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 8,
                        background: health.healthy ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${health.healthy ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        fontSize: '0.88rem',
                    }}>
                        {health.healthy
                            ? <CheckCircle size={16} color="#22c55e" />
                            : <XCircle size={16} color="#ef4444" />}
                        <span style={{ color: health.healthy ? '#22c55e' : '#ef4444' }}>{health.message}</span>
                    </div>
                )}
            </div>

            {/* Available providers */}
            <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={16} /> Dostępne adaptery
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                    {PROVIDERS.map(p => (
                        <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 8,
                            background: p.id === settings?.provider ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${p.id === settings?.provider ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                            <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{p.description}</div>
                            </div>
                            {badge(p.id === settings?.provider ? '✓ Aktywny' : p.badge, p.id === settings?.provider ? '#818cf8' : p.badgeColor)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Coming soon */}
            <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plug size={16} /> Planowane integracje
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {COMING_SOON.map(p => (
                        <div key={p.id} style={{
                            padding: '0.4rem 0.9rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            fontSize: '0.85rem',
                            color: 'var(--color-text-muted)',
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                            {p.icon} {p.name}
                            {badge('Wkrótce', '#6b7280')}
                        </div>
                    ))}
                </div>
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Każdy nowy PMS implementuje ten sam interfejs <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>PmsAdapter</code> —
                    podłączenie nowego systemu nie wymaga zmian w logice biznesowej.
                </p>
            </div>

            {/* Info + notes */}
            <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={16} /> Informacje techniczne
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '1rem', whiteSpace: 'pre-line' }}>
                    {runtimeNote}
                </p>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>Notatki (internal)</div>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Np. data podpięcia, kto konfigurował, uwagi techniczne..."
                    style={{
                        width: '100%', padding: '0.7rem', borderRadius: 8,
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--color-text-main)', fontSize: '0.85rem',
                        resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={handleSaveNotes}
                        disabled={saving}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: 'var(--color-primary)',
                            border: 'none', borderRadius: 8,
                            color: '#000', fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                            fontSize: '0.88rem',
                        }}
                    >{saving ? 'Zapisuję…' : 'Zapisz notatkę'}</button>
                    {msg && (
                        <span style={{ fontSize: '0.85rem', color: msg.type === 'ok' ? '#22c55e' : '#ef4444' }}>
                            {msg.text}
                        </span>
                    )}
                </div>
                {settings?.updatedAt && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Ostatnia zmiana: {new Date(settings.updatedAt).toLocaleString('pl-PL')} przez {settings.updatedBy}
                    </p>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
