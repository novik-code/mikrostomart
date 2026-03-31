'use client';

import { useEffect, useState } from 'react';

interface P24Status {
    source: 'db' | 'env' | 'none';
    enabled: boolean;
    sandbox: boolean;
    merchant_id: number | null;
    pos_id: number | null;
    crc_key_masked: string | null;
    api_key_masked: string | null;
}

export default function P24SettingsTab() {
    const [status, setStatus] = useState<P24Status | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

    const [merchantId, setMerchantId] = useState('');
    const [posId, setPosId] = useState('');
    const [crcKey, setCrcKey] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [sandbox, setSandbox] = useState(true);

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/p24-settings');
            const data: P24Status = await res.json();
            setStatus(data);
            setSandbox(data.sandbox ?? true);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!merchantId || !posId || !crcKey || !apiKey) return;
        setSaving(true);
        setSaveResult(null);
        try {
            const res = await fetch('/api/admin/p24-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchant_id: merchantId, pos_id: posId, crc_key: crcKey, api_key: apiKey, sandbox, enabled: true }),
            });
            const data = await res.json();
            if (res.ok) {
                setSaveResult({ ok: true, message: 'Klucze zapisane w bazie danych ✅' });
                setMerchantId(''); setPosId(''); setCrcKey(''); setApiKey('');
                await fetchStatus();
            } else {
                setSaveResult({ ok: false, error: data.error });
            }
        } catch (e: unknown) {
            setSaveResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally { setSaving(false); }
    };

    const handleTest = async () => {
        if (!posId || !apiKey) {
            setTestResult({ ok: false, error: 'Wpisz Pos ID i API Key aby przetestować' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/p24-settings?action=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pos_id: posId, api_key: apiKey, sandbox }),
            });
            const data = await res.json();
            setTestResult({ ok: data.ok, message: data.message, error: data.error });
        } catch (e: unknown) {
            setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally { setTesting(false); }
    };

    // Test using already-saved DB credentials (no need to re-enter)
    const handleTestSaved = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/p24-settings?action=test', {
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

    const sourceLabel = (s: P24Status) => {
        if (s.source === 'db') return { icon: '🗄️', label: 'Baza danych', color: '#10b981' };
        if (s.source === 'env') return { icon: '⚙️', label: 'Zmienna ENV', color: '#f59e0b' };
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

    if (loading) return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Ładowanie konfiguracji P24...</div>;

    const src = status ? sourceLabel(status) : null;

    return (
        <div style={{ padding: '1.5rem', maxWidth: 640 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                🏦 Przelewy24 — BLIK, karta, przelew
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Podaj dane konta Przelewy24 aby aktywować płatności BLIK i przelewem.
            </p>

            {/* Status */}
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
                    {status.merchant_id && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Merchant ID</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.merchant_id}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>POS ID</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.pos_id || '—'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CRC Key</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.crc_key_masked || '—'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>API Key</span>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{status.api_key_masked || '—'}</div>
                            </div>
                        </div>
                    )}
                    {/* Test saved credentials — always visible after save */}
                    {status.source !== 'none' && (
                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button
                                onClick={handleTestSaved}
                                disabled={testing}
                                style={{ ...btnStyle(false), opacity: testing ? 0.5 : 1, fontSize: '0.85rem' }}
                            >
                                {testing ? '⏳ Testowanie...' : '🔍 Testuj zapisane klucze'}
                            </button>
                            {testResult && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    {alertBox(testResult.ok, testResult.ok ? testResult.message! : `❌ ${testResult.error}`)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Form */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Zmień dane P24</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Merchant ID</label>
                        <input type="text" value={merchantId} onChange={e => setMerchantId(e.target.value)} placeholder="123456" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>POS ID</label>
                        <input type="text" value={posId} onChange={e => setPosId(e.target.value)} placeholder="123456" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>CRC Key (klucz do podpisów)</label>
                    <input type="password" value={crcKey} onChange={e => setCrcKey(e.target.value)} placeholder="••••••••••••••••" style={inputStyle} />
                </div>

                <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>API Key (klucz do raportów)</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="••••••••••••••••" style={inputStyle} />

                {/* Sandbox toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                        Tryb Sandbox (testy bez realnych płatności)
                    </label>
                </div>

                {saveResult && alertBox(saveResult.ok, saveResult.ok ? saveResult.message! : `❌ ${saveResult.error}`)}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={handleSave} disabled={saving || !merchantId || !posId || !crcKey || !apiKey}
                        style={{ ...btnStyle(true), opacity: saving || !merchantId || !posId || !crcKey || !apiKey ? 0.5 : 1 }}>
                        {saving ? 'Zapisywanie...' : 'Zapisz dane'}
                    </button>
                    <button onClick={handleTest} disabled={testing || !posId || !apiKey}
                        style={{ ...btnStyle(false), opacity: testing || !posId || !apiKey ? 0.5 : 1 }}>
                        {testing ? 'Testowanie...' : '🔍 Testuj połączenie'}
                    </button>
                </div>

                {testResult && (
                    <div style={{ marginTop: '0.75rem' }}>
                        {alertBox(testResult.ok, testResult.ok ? testResult.message! : `❌ ${testResult.error}`)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ ...cardStyle, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text-main)' }}>💡 Gdzie znaleźć klucze?</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                    <li><strong>Merchant ID</strong> i <strong>POS ID</strong> — Panel P24 → Moje dane</li>
                    <li><strong>CRC Key</strong> — Panel P24 → Klucze CRC</li>
                    <li><strong>API Key</strong> — Panel P24 → Klucz do raportów</li>
                    <li>Sandbox: <a href="https://sandbox.przelewy24.pl" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>sandbox.przelewy24.pl</a></li>
                    <li>Panel: <a href="https://panel.przelewy24.pl" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>panel.przelewy24.pl</a></li>
                </ul>
            </div>
        </div>
    );
}
