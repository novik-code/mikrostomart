"use client";

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Database, Plug, Info, Key } from 'lucide-react';

interface PmsSettings {
    provider: string;
    apiUrl: string;
    hasApiKey: boolean;
    api_key_masked: string | null;
    source: 'db' | 'env' | 'none';
    notes: string;
    updatedAt: string | null;
    updatedBy: string | null;
}

interface HealthResult {
    healthy: boolean;
    provider: string;
    message: string;
    detail?: any;
    keyTested?: string;
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
    const [savingNotes, setSavingNotes] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [health, setHealth] = useState<HealthResult | null>(null);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [keyMsg, setKeyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [notes, setNotes] = useState('');
    const [newApiKey, setNewApiKey] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        setLoading(true);
        fetch('/api/admin/pms-settings')
            .then(r => r.json())
            .then(d => {
                setSettings(d);
                setNotes(d.notes || '');
            })
            .finally(() => setLoading(false));
    };

    const handleSaveNotes = async () => {
        setSavingNotes(true);
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
        setSavingNotes(false);
    };

    const handleSaveKey = async () => {
        if (!newApiKey.trim()) return;
        setSavingKey(true);
        setKeyMsg(null);
        try {
            const res = await fetch('/api/admin/pms-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: newApiKey.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Błąd zapisu');
            setKeyMsg({ type: 'ok', text: `Klucz zapisany w bazie ✅ (${data.api_key_masked})` });
            setNewApiKey('');
            await loadSettings();
        } catch (e: any) {
            setKeyMsg({ type: 'err', text: e.message });
        }
        setSavingKey(false);
    };

    const handleClearKey = async () => {
        if (!confirm('Wyczyścić klucz z bazy? System wróci do klucza z env vars (PRODENTIS_API_KEY).')) return;
        setSavingKey(true);
        setKeyMsg(null);
        try {
            const res = await fetch('/api/admin/pms-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: '' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Błąd');
            setKeyMsg({ type: 'ok', text: `Klucz wyczyszczony. Źródło: ${data.source}` });
            await loadSettings();
        } catch (e: any) {
            setKeyMsg({ type: 'err', text: e.message });
        }
        setSavingKey(false);
    };

    const handleHealthCheck = async (overrideKey?: string) => {
        setTesting(true);
        setHealth(null);
        try {
            const res = await fetch('/api/admin/pms-settings?action=health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrideKey ? { apiKey: overrideKey } : {}),
            });
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

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.7rem 1rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        color: 'var(--color-text-main)',
        fontSize: '0.9rem',
        fontFamily: 'monospace',
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

    const sourceLabel = (s: PmsSettings) => {
        if (s.source === 'db') return { icon: '🗄️', label: 'Baza danych (admin panel)', color: '#10b981' };
        if (s.source === 'env') return { icon: '⚙️', label: 'Zmienna ENV (Vercel)', color: '#f59e0b' };
        return { icon: '❌', label: 'Brak konfiguracji', color: '#ef4444' };
    };

    const src = settings ? sourceLabel(settings) : null;

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
                        onClick={() => handleHealthCheck()}
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
                </div>

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

            {/* API Key management */}
            {settings?.provider === 'prodentis' && (
                <div style={card}>
                    <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Key size={16} /> Klucz API (X-API-Key)
                    </div>

                    {/* Current key status */}
                    {src && (
                        <div style={{
                            padding: '0.7rem 1rem',
                            borderRadius: 8,
                            background: 'rgba(0,0,0,0.2)',
                            border: `1px solid ${src.color}33`,
                            marginBottom: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Źródło
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: src.color, marginTop: 2 }}>
                                    {src.icon} {src.label}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Klucz</div>
                                <code style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                    {settings.api_key_masked || '—'}
                                </code>
                            </div>
                        </div>
                    )}

                    {/* New key form */}
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                        Wklej nowy klucz API
                    </label>
                    <input
                        type="password"
                        value={newApiKey}
                        onChange={e => setNewApiKey(e.target.value)}
                        placeholder="np. 7a3f8b2c-..."
                        style={inputStyle}
                    />

                    {keyMsg && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.7rem 1rem',
                            borderRadius: 8,
                            background: keyMsg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${keyMsg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            color: keyMsg.type === 'ok' ? '#10b981' : '#ef4444',
                            fontSize: '0.88rem',
                        }}>
                            {keyMsg.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleSaveKey}
                            disabled={savingKey || !newApiKey.trim()}
                            style={{
                                padding: '0.55rem 1.3rem',
                                background: 'var(--color-primary)',
                                color: '#000',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: savingKey || !newApiKey.trim() ? 'not-allowed' : 'pointer',
                                opacity: savingKey || !newApiKey.trim() ? 0.5 : 1,
                                fontSize: '0.88rem',
                            }}
                        >
                            {savingKey ? 'Zapisywanie…' : 'Zapisz klucz'}
                        </button>
                        <button
                            onClick={() => handleHealthCheck(newApiKey.trim() || undefined)}
                            disabled={testing}
                            style={{
                                padding: '0.55rem 1.3rem',
                                background: 'rgba(255,255,255,0.07)',
                                color: 'var(--color-text-main)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: testing ? 'wait' : 'pointer',
                                fontSize: '0.88rem',
                            }}
                        >
                            {testing ? 'Testowanie…' : '🔍 Testuj klucz'}
                        </button>
                        {settings?.source === 'db' && (
                            <button
                                onClick={handleClearKey}
                                disabled={savingKey}
                                style={{
                                    padding: '0.55rem 1.3rem',
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: savingKey ? 'not-allowed' : 'pointer',
                                    fontSize: '0.88rem',
                                    marginLeft: 'auto',
                                }}
                            >
                                Wyczyść (wróć do ENV)
                            </button>
                        )}
                    </div>

                    {/* Rotation info */}
                    <div style={{
                        marginTop: '1.25rem',
                        padding: '0.85rem 1rem',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 8,
                        fontSize: '0.83rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.65,
                    }}>
                        <strong style={{ color: '#f59e0b' }}>💡 Procedura rotacji klucza</strong>
                        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.3rem' }}>
                            <li>Na serwerze gabinetu (PowerShell jako admin) — wygeneruj nowy klucz przez <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>POST /api/admin/rotate-key</code> (grace period 30 dni — stary klucz działa równolegle).</li>
                            <li>Wklej <strong>nowy</strong> klucz powyżej i kliknij <em>Zapisz klucz</em>. Cache (60s) zostanie unieważniony natychmiast.</li>
                            <li>Sprawdź <em>Testuj połączenie</em> — powinno zwrócić 200.</li>
                            <li>Po potwierdzeniu, na serwerze gabinetu unieważnij stary klucz: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>POST /api/admin/revoke-previous-key</code>.</li>
                        </ol>
                        <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem' }}>
                            Klucz zapisany w bazie ma priorytet nad <code>PRODENTIS_API_KEY</code> z Vercel env. Pełna dokumentacja: <code>~/Desktop/bałagan/Dla dewelopera mikrostomart/INSTRUKCJA_ROTACJI_KLUCZA.md</code>.
                        </p>
                    </div>
                </div>
            )}

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
            </div>

            {/* Notes */}
            <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={16} /> Notatki (internal)
                </div>
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
                        disabled={savingNotes}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: 'var(--color-primary)',
                            border: 'none', borderRadius: 8,
                            color: '#000', fontWeight: 600, cursor: savingNotes ? 'wait' : 'pointer',
                            fontSize: '0.88rem',
                        }}
                    >{savingNotes ? 'Zapisuję…' : 'Zapisz notatkę'}</button>
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
