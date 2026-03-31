'use client';

import { useEffect, useState } from 'react';

interface StripeStatus {
    source: 'db' | 'env' | 'none';
    enabled: boolean;
    publishable_key: string | null;
    secret_key_masked: string | null;
}

export default function StripeSettingsTab() {
    const [status, setStatus] = useState<StripeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

    const [publishableKey, setPublishableKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [testPhone] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/stripe-settings');
            const data: StripeStatus = await res.json();
            setStatus(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!publishableKey || !secretKey) return;
        setSaving(true);
        setSaveResult(null);
        try {
            const res = await fetch('/api/admin/stripe-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publishable_key: publishableKey, secret_key: secretKey, enabled: true }),
            });
            const data = await res.json();
            if (res.ok) {
                setSaveResult({ ok: true, message: 'Klucze zapisane w bazie danych ✅' });
                setPublishableKey('');
                setSecretKey('');
                await fetchStatus();
            } else {
                setSaveResult({ ok: false, error: data.error });
            }
        } catch (e: unknown) {
            setSaveResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        const keyToTest = secretKey || ''; // test with newly entered key
        if (!keyToTest) {
            setTestResult({ ok: false, error: 'Wpisz Secret Key aby przetestować' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/stripe-settings?action=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret_key: keyToTest }),
            });
            const data = await res.json();
            setTestResult({ ok: data.ok, message: data.message, error: data.error });
        } catch (e: unknown) {
            setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Błąd sieci' });
        } finally {
            setTesting(false);
        }
    };

    const sourceLabel = (s: StripeStatus) => {
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

    if (loading) {
        return (
            <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>
                Ładowanie konfiguracji Stripe...
            </div>
        );
    }

    const src = status ? sourceLabel(status) : null;

    return (
        <div style={{ padding: '1.5rem', maxWidth: 640 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                💳 Stripe — Bramka płatności
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Podaj własne klucze Stripe aby płatności trafiały na Twoje konto.
            </p>

            {/* Status */}
            {status && src && (
                <div style={{ ...cardStyle, borderColor: src.color + '40' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Źródło konfiguracji
                            </span>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: src.color, marginTop: '0.25rem' }}>
                                {src.icon} {src.label}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Secret Key</span>
                            <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                {status.secret_key_masked || '—'}
                            </div>
                        </div>
                    </div>
                    {status.publishable_key && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Publishable Key</span>
                            <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                {status.publishable_key.slice(0, 14)}...{status.publishable_key.slice(-4)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Form */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Zmień klucze Stripe
                </h3>

                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                    Publishable Key (pk_live_... lub pk_test_...)
                </label>
                <input
                    type="text"
                    value={publishableKey}
                    onChange={e => setPublishableKey(e.target.value)}
                    placeholder="pk_live_..."
                    style={inputStyle}
                />

                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                    Secret Key (sk_live_... lub sk_test_...)
                </label>
                <input
                    type="password"
                    value={secretKey}
                    onChange={e => setSecretKey(e.target.value)}
                    placeholder="sk_live_..."
                    style={inputStyle}
                />

                {saveResult && (
                    <div style={{
                        padding: '0.7rem 1rem',
                        borderRadius: '8px',
                        background: saveResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${saveResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: saveResult.ok ? '#10b981' : '#ef4444',
                        fontSize: '0.9rem',
                        marginBottom: '0.75rem',
                    }}>
                        {saveResult.ok ? saveResult.message : `❌ ${saveResult.error}`}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving || !publishableKey || !secretKey}
                        style={{ ...btnStyle(true), opacity: saving || !publishableKey || !secretKey ? 0.5 : 1 }}
                    >
                        {saving ? 'Zapisywanie...' : 'Zapisz klucze'}
                    </button>
                    <button
                        onClick={handleTest}
                        disabled={testing || !secretKey}
                        style={{ ...btnStyle(false), opacity: testing || !secretKey ? 0.5 : 1 }}
                    >
                        {testing ? 'Testowanie...' : '🔍 Testuj klucze'}
                    </button>
                </div>

                {testResult && (
                    <div style={{
                        marginTop: '0.75rem',
                        padding: '0.7rem 1rem',
                        borderRadius: '8px',
                        background: testResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: testResult.ok ? '#10b981' : '#ef4444',
                        fontSize: '0.9rem',
                    }}>
                        {testResult.ok ? testResult.message : `❌ ${testResult.error}`}
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ ...cardStyle, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text-main)' }}>💡 Jak to działa?</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                    <li>Klucze z bazy danych mają priorytet nad zmiennymi ENV</li>
                    <li>Jeśli baza jest niedostępna — system automatycznie użyje ENV</li>
                    <li>Użyj kluczy <strong>sk_test_</strong> / <strong>pk_test_</strong> dla środowiska demo</li>
                    <li>
                        Klucze znajdziesz w{' '}
                        <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--color-primary)' }}>
                            Stripe Dashboard → API Keys
                        </a>
                    </li>
                </ul>
            </div>

            {/* Unused variable lint fix */}
            {testPhone && null}
        </div>
    );
}
