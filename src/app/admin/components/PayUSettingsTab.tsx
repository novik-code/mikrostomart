'use client';

import { useEffect, useState } from 'react';

interface PayUStatus {
    source: 'db' | 'env' | 'defaults' | 'none';
    enabled: boolean;
    sandbox: boolean;
    pos_id: string | null;
    client_id: string | null;
    client_secret_masked: string | null;
    second_key_masked: string | null;
}

export default function PayUSettingsTab() {
    const [status, setStatus] = useState<PayUStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

    const [posId, setPosId] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [secondKey, setSecondKey] = useState('');
    const [sandbox, setSandbox] = useState(true);

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/payu-settings');
            const data: PayUStatus = await res.json();
            setStatus(data);
            setSandbox(data.sandbox ?? true);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!posId || !clientId || !clientSecret || !secondKey) return;
        setSaving(true); setSaveResult(null);
        try {
            const res = await fetch('/api/admin/payu-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pos_id: posId, client_id: clientId, client_secret: clientSecret, second_key: secondKey, sandbox, enabled: true }),
            });
            const data = await res.json();
            if (res.ok) {
                setSaveResult({ ok: true, message: 'Klucze zapisane w bazie danych ✅' });
                setPosId(''); setClientId(''); setClientSecret(''); setSecondKey('');
                await fetchStatus();
            } else {
                setSaveResult({ ok: false, error: data.error });
            }
        } catch (e: unknown) {
            setSaveResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally { setSaving(false); }
    };

    const handleTestSaved = async () => {
        setTesting(true); setTestResult(null);
        try {
            const res = await fetch('/api/admin/payu-settings?action=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const data = await res.json();
            setTestResult({ ok: data.ok, message: data.message, error: data.error });
        } catch (e: unknown) {
            setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally { setTesting(false); }
    };

    const handleTestForm = async () => {
        if (!posId || !clientId || !clientSecret) {
            setTestResult({ ok: false, error: 'Wypełnij Pos ID, Client ID i Client Secret' });
            return;
        }
        setTesting(true); setTestResult(null);
        try {
            const res = await fetch('/api/admin/payu-settings?action=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pos_id: posId, client_id: clientId, client_secret: clientSecret, sandbox }),
            });
            const data = await res.json();
            setTestResult({ ok: data.ok, message: data.message, error: data.error });
        } catch (e: unknown) {
            setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally { setTesting(false); }
    };

    const sourceLabel = (s: PayUStatus) => {
        if (s.source === 'db') return { icon: '🗄️', label: 'Baza danych', color: '#10b981' };
        if (s.source === 'env') return { icon: '⚙️', label: 'Zmienna ENV', color: '#f59e0b' };
        if (s.source === 'defaults') return { icon: '🧪', label: 'Sandbox (demo)', color: '#6366f1' };
        return { icon: '❌', label: 'Brak konfiguracji', color: '#ef4444' };
    };

    const cardStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1rem',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.7rem 1rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        color: 'var(--color-text-main)',
        fontSize: '0.9rem',
        fontFamily: 'monospace',
        marginBottom: '0.75rem',
    };

    const btnStyle = (primary = true): React.CSSProperties => ({
        padding: '0.6rem 1.4rem',
        background: primary ? 'var(--color-primary)' : 'rgba(255,255,255,0.07)',
        color: primary ? '#000' : 'var(--color-text-main)',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.9rem',
    });

    const alertBox = (ok: boolean, text: string) => (
        <div style={{
            padding: '0.7rem 1rem', borderRadius: '8px',
            background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: ok ? '#10b981' : '#ef4444',
            fontSize: '0.9rem', marginBottom: '0.75rem',
        }}>{text}</div>
    );

    if (loading) return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Ładowanie konfiguracji PayU...</div>;

    const src = status ? sourceLabel(status) : null;

    return (
        <div style={{ padding: '1.5rem', maxWidth: 640 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                💳 PayU — BLIK, karta, szybki przelew
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                PayU to wiodąca polska bramka płatności. Obsługuje BLIK, karty Visa/Mastercard, szybkie przelewy online i portfele cyfrowe.
            </p>

            {/* Status card */}
            {status && src && (
                <div style={{ ...cardStyle, borderColor: src.color + '40' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Źródło konfiguracji</span>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: src.color, marginTop: '0.25rem' }}>{src.icon} {src.label}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Tryb</span>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: status.sandbox ? '#f59e0b' : '#10b981', marginTop: '0.25rem' }}>
                                {status.sandbox ? '🧪 SANDBOX' : '🟢 LIVE'}
                            </div>
                        </div>
                    </div>
                    {status.pos_id && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>POS ID</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.pos_id}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Client ID</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.client_id || '—'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Client Secret</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.client_secret_masked || '—'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Second Key</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.second_key_masked || '—'}</div>
                            </div>
                        </div>
                    )}
                    {/* Test saved credentials */}
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={handleTestSaved} disabled={testing}
                            style={{ ...btnStyle(false), opacity: testing ? 0.5 : 1, fontSize: '0.85rem' }}>
                            {testing ? '⏳ Testowanie...' : '🔍 Testuj zapisane klucze'}
                        </button>
                        {testResult && (
                            <div style={{ marginTop: '0.5rem' }}>
                                {alertBox(testResult.ok, testResult.ok ? testResult.message! : `❌ ${testResult.error}`)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Form */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Zmień dane PayU</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>POS ID</label>
                        <input type="text" value={posId} onChange={e => setPosId(e.target.value)} placeholder="300746" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Client ID</label>
                        <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="300746" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                </div>

                <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Client Secret (OAuth2)</label>
                <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="••••••••••••••••••••••••••••••••" style={inputStyle} />

                <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Second Key (weryfikacja webhook)</label>
                <input type="password" value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="••••••••••••••••••••••••••••••••" style={inputStyle} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                        Tryb Sandbox (testy bez realnych płatności)
                    </label>
                </div>

                {saveResult && alertBox(saveResult.ok, saveResult.ok ? saveResult.message! : `❌ ${saveResult.error}`)}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={handleSave} disabled={saving || !posId || !clientId || !clientSecret || !secondKey}
                        style={{ ...btnStyle(true), opacity: saving || !posId || !clientId || !clientSecret || !secondKey ? 0.5 : 1 }}>
                        {saving ? 'Zapisywanie...' : 'Zapisz dane'}
                    </button>
                    <button onClick={handleTestForm} disabled={testing || !posId || !clientId || !clientSecret}
                        style={{ ...btnStyle(false), opacity: testing || !posId || !clientId || !clientSecret ? 0.5 : 1 }}>
                        {testing ? 'Testowanie...' : '🔍 Testuj przed zapisem'}
                    </button>
                </div>
            </div>

            {/* Info */}
            <div style={{ ...cardStyle, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text-main)' }}>💡 Gdzie znaleźć klucze?</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                    <li><strong>POS ID</strong> i <strong>Client ID</strong> — Panel PayU → Ustawienia POS</li>
                    <li><strong>Client Secret</strong> — Panel PayU → Ustawienia POS → OAuth Protocol</li>
                    <li><strong>Second Key</strong> — Panel PayU → Ustawienia POS → Klucz (Drugi klucz)</li>
                    <li>Sandbox: <a href="https://sandbox.payu.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>sandbox.payu.com</a></li>
                    <li>Panel: <a href="https://panel.payu.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>panel.payu.com</a></li>
                </ul>
                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
                    🧪 <strong>Demo sandbox aktywny</strong> — w środowisku testowym PayU dostarcza gotowe kredencjały demo (POS ID: 300746). Test możesz wykonać od razu bez konfiguracji.
                </div>
            </div>
        </div>
    );
}
