'use client';

import { useState, useEffect, useCallback } from 'react';

interface SmsProviderStatus {
    token_set: boolean;
    token_source: 'db' | 'env' | 'none';
    sender_name: string;
    test_phone: string;
}

export default function SmsSettingsTab() {
    const [status, setStatus] = useState<SmsProviderStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const [token, setToken] = useState('');
    const [senderName, setSenderName] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [saveMsg, setSaveMsg] = useState('');

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/sms-provider');
            const data = await res.json();
            setStatus(data);
            setSenderName(data.sender_name || '');
            setTestPhone(data.test_phone || '');
        } catch {
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg('');
        try {
            const body: Record<string, string> = { sender_name: senderName, test_phone: testPhone };
            if (token) body.token = token;

            const res = await fetch('/api/admin/sms-provider', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setSaveMsg('✅ Zapisano');
                setToken('');
                await fetchStatus();
            } else {
                const err = await res.json();
                setSaveMsg(`❌ ${err.error}`);
            }
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(''), 4000);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/sms-provider?action=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: testPhone }),
            });
            const data = await res.json();
            setTestResult(res.ok
                ? { ok: true, msg: `✅ SMS wysłany! ID: ${data.messageId}` }
                : { ok: false, msg: `❌ ${data.error}` }
            );
        } finally {
            setTesting(false);
        }
    };

    const sourceLabel = {
        db: { icon: '🗄️', text: 'Token z bazy danych (Admin Panel)', color: '#4ade80' },
        env: { icon: '⚙️', text: 'Token ze zmiennych środowiskowych (Vercel ENV)', color: '#facc15' },
        none: { icon: '❌', text: 'Brak tokenu — SMS nie będą wysyłane!', color: '#f87171' },
    };

    const s = {
        card: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 24, marginBottom: 20 },
        label: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 },
        input: { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: 14, boxSizing: 'border-box' as const },
        btn: (color: string) => ({ padding: '10px 22px', background: color, border: 'none', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
        row: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' as const },
        h2: { color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 },
        hint: { color: '#64748b', fontSize: 12, marginTop: 6 },
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>📱 SMS API — Konfiguracja dostawcy</h1>
            <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
                Wpisz własny token SMSAPI.pl aby wysyłać SMS z konta kliniki. Bez tokenu SMS są blokowane.
            </p>

            {/* Status */}
            <div style={s.card}>
                <h2 style={s.h2}>Status połączenia</h2>
                {loading ? (
                    <p style={{ color: '#94a3b8' }}>Ładowanie...</p>
                ) : status && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{sourceLabel[status.token_source].icon}</span>
                        <span style={{ color: sourceLabel[status.token_source].color, fontWeight: 600 }}>
                            {sourceLabel[status.token_source].text}
                        </span>
                    </div>
                )}
                {status?.token_source === 'env' && (
                    <p style={{ ...s.hint, color: '#facc15', marginTop: 12 }}>
                        ⚠️ Używany jest token ze zmiennych środowiskowych Vercel. Aby przypisać osobny token tej klinice, wpisz go poniżej i zapisz.
                    </p>
                )}
            </div>

            {/* Token + sender */}
            <div style={s.card}>
                <h2 style={s.h2}>Konfiguracja SMSAPI</h2>

                <div style={{ marginBottom: 18 }}>
                    <label style={s.label}>Token SMSAPI</label>
                    <input
                        type="password"
                        style={s.input}
                        placeholder={status?.token_set ? '••••••••••••••• (token zapisany)' : 'Wklej token ze strony smsapi.pl'}
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        autoComplete="off"
                    />
                    <p style={s.hint}>
                        Znajdź token na <a href="https://ssl.smsapi.pl/apikey-list" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>smsapi.pl → API Keys</a>.
                        Zostaw puste jeśli nie chcesz zmieniać istniejącego tokenu.
                    </p>
                </div>

                <div style={{ marginBottom: 18 }}>
                    <label style={s.label}>Nazwa nadawcy SMS (max 11 znaków, tylko ASCII)</label>
                    <input
                        type="text"
                        style={s.input}
                        placeholder="np. Mikrostom"
                        value={senderName}
                        maxLength={11}
                        onChange={e => setSenderName(e.target.value)}
                    />
                    <p style={s.hint}>Nazwa wyświetlana jako nadawca SMS. Max 11 znaków, bez polskich liter.</p>
                </div>

                <div style={s.row}>
                    <button onClick={handleSave} disabled={saving} style={s.btn('#3b82f6')}>
                        {saving ? 'Zapisywanie...' : '💾 Zapisz'}
                    </button>
                    {saveMsg && <span style={{ color: saveMsg.startsWith('✅') ? '#4ade80' : '#f87171', fontWeight: 600 }}>{saveMsg}</span>}
                </div>
            </div>

            {/* Test SMS */}
            <div style={s.card}>
                <h2 style={s.h2}>Wysyłka testowa</h2>
                <div style={{ marginBottom: 18 }}>
                    <label style={s.label}>Numer telefonu testowego (format: 48XXXXXXXXX lub +48XXXXXXXXX)</label>
                    <input
                        type="tel"
                        style={s.input}
                        placeholder="np. +48570270470"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                    />
                </div>
                <div style={s.row}>
                    <button
                        onClick={handleTest}
                        disabled={testing || !testPhone}
                        style={s.btn('#10b981')}
                    >
                        {testing ? 'Wysyłanie...' : '📨 Wyślij SMS testowy'}
                    </button>
                    {testResult && (
                        <span style={{ color: testResult.ok ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                            {testResult.msg}
                        </span>
                    )}
                </div>
                <p style={{ ...s.hint, marginTop: 12 }}>
                    Test weryfikuje połączenie z SMSAPI i autentyczność tokenu. SMS jest wysyłany na podany numer.
                </p>
            </div>

            {/* Links */}
            <div style={{ ...s.card, background: 'rgba(59,130,246,0.1)' }}>
                <h2 style={{ ...s.h2, fontSize: 14 }}>🔗 Przydatne linki</h2>
                <ul style={{ color: '#60a5fa', fontSize: 13, lineHeight: 2, margin: 0, paddingLeft: 20 }}>
                    <li><a href="https://ssl.smsapi.pl/apikey-list" target="_blank" rel="noreferrer">SMSAPI → API Keys (generowanie tokenu)</a></li>
                    <li><a href="https://ssl.smsapi.pl/main#/history" target="_blank" rel="noreferrer">SMSAPI → Historia wysyłek</a></li>
                    <li><a href="https://ssl.smsapi.pl/main#/balance" target="_blank" rel="noreferrer">SMSAPI → Saldo konta</a></li>
                </ul>
            </div>
        </div>
    );
}
