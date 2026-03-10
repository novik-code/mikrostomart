'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, RefreshCw, Settings, Shield } from 'lucide-react';

interface NotifConfig {
    key: string;
    label: string;
    description: string;
    groups: string[];
    enabled: boolean; // global enabled from admin
}

interface PreferencesTabProps {
    isMobile: boolean;
}

export default function PreferencesTab({ isMobile }: PreferencesTabProps) {
    const [configs, setConfigs] = useState<NotifConfig[]>([]);
    const [mutedKeys, setMutedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const fetchPreferences = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/employee/notification-preferences');
            if (!res.ok) throw new Error('Błąd pobierania preferencji');
            const data = await res.json();
            setConfigs(data.configs || []);
            setMutedKeys(data.mutedKeys || []);
        } catch (e: any) {
            setError(e.message || 'Błąd');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    const toggleKey = async (key: string) => {
        const isMuted = mutedKeys.includes(key);
        const newMuted = isMuted
            ? mutedKeys.filter(k => k !== key)
            : [...mutedKeys, key];

        setMutedKeys(newMuted);
        setSaving(key);
        setSaved(false);

        try {
            const res = await fetch('/api/employee/notification-preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mutedKeys: newMuted }),
            });
            if (!res.ok) throw new Error('Błąd zapisu');
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            // Revert on error
            setMutedKeys(mutedKeys);
            setError(e.message);
        } finally {
            setSaving(null);
        }
    };

    const enableAll = async () => {
        setMutedKeys([]);
        setSaving('all');
        try {
            await fetch('/api/employee/notification-preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mutedKeys: [] }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            fetchPreferences();
            setError(e.message);
        } finally {
            setSaving(null);
        }
    };

    const muteAll = async () => {
        const allKeys = configs.map(c => c.key);
        setMutedKeys(allKeys);
        setSaving('all');
        try {
            await fetch('/api/employee/notification-preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mutedKeys: allKeys }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            fetchPreferences();
            setError(e.message);
        } finally {
            setSaving(null);
        }
    };

    // Category grouping
    const categorize = (key: string): string => {
        if (key.startsWith('task-')) return '📋 Zadania';
        if (key.startsWith('appointment-') || key === 'new-reservation') return '📅 Wizyty';
        if (key.startsWith('chat-') || key === 'new-contact-message') return '💬 Wiadomości';
        if (key === 'new-order') return '🛒 Zamówienia';
        if (key === 'new-registration') return '👤 Rejestracja';
        return '🔔 Inne';
    };

    const grouped = configs.reduce<Record<string, NotifConfig[]>>((acc, cfg) => {
        const cat = categorize(cfg.key);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(cfg);
        return acc;
    }, {});

    const enabledCount = configs.filter(c => !mutedKeys.includes(c.key)).length;

    if (loading) {
        return (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <div>Ładowanie preferencji...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '1rem' : '1.5rem 2rem', maxWidth: '700px' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Settings size={20} style={{ color: '#a78bfa' }} />
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#fff' }}>
                        Preferencje powiadomień
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '2rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: enabledCount === configs.length
                            ? 'rgba(34,197,94,0.12)'
                            : enabledCount === 0
                                ? 'rgba(239,68,68,0.12)'
                                : 'rgba(245,158,11,0.12)',
                        color: enabledCount === configs.length
                            ? '#22c55e'
                            : enabledCount === 0
                                ? '#ef4444'
                                : '#f59e0b',
                        border: `1px solid ${enabledCount === configs.length ? 'rgba(34,197,94,0.2)' : enabledCount === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    }}>
                        {enabledCount}/{configs.length} aktywnych
                    </span>
                    {saved && (
                        <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.3rem',
                            fontSize: '0.7rem',
                            background: 'rgba(34,197,94,0.15)',
                            color: '#22c55e',
                            animation: 'fadeIn 0.3s ease-in',
                        }}>
                            ✓ Zapisano
                        </span>
                    )}
                </div>
            </div>

            {/* Info banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.06), rgba(56,189,248,0.04))',
                border: '1px solid rgba(167,139,250,0.12)',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
            }}>
                <Shield size={18} style={{ color: '#a78bfa', flexShrink: 0, marginTop: '0.1rem' }} />
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    Wybierz które powiadomienia push chcesz otrzymywać. Wyłączone powiadomienia nie będą wysyłane na Twoje urządzenie.
                    Administrator może przypisywać Cię do grup i zarządzać typami powiadomień globalnie.
                </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <button
                    onClick={enableAll}
                    disabled={saving !== null}
                    style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(34,197,94,0.2)',
                        background: 'rgba(34,197,94,0.08)',
                        color: '#22c55e',
                        cursor: saving ? 'wait' : 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s',
                    }}
                >
                    <Bell size={14} /> Włącz wszystkie
                </button>
                <button
                    onClick={muteAll}
                    disabled={saving !== null}
                    style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: 'rgba(239,68,68,0.06)',
                        color: '#ef4444',
                        cursor: saving ? 'wait' : 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s',
                    }}
                >
                    <BellOff size={14} /> Wycisz wszystkie
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '0.6rem 0.9rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Notification categories */}
            {Object.entries(grouped).map(([category, items]) => (
                <div key={category} style={{ marginBottom: '1.25rem' }}>
                    <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '0.6rem',
                        paddingLeft: '0.2rem',
                    }}>
                        {category}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {items.map(cfg => {
                            const isMuted = mutedKeys.includes(cfg.key);
                            const isGloballyDisabled = !cfg.enabled;
                            const isSavingThis = saving === cfg.key;

                            return (
                                <div
                                    key={cfg.key}
                                    onClick={() => {
                                        if (!isGloballyDisabled && !saving) toggleKey(cfg.key);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        background: isGloballyDisabled
                                            ? 'rgba(255,255,255,0.015)'
                                            : isMuted
                                                ? 'rgba(255,255,255,0.02)'
                                                : 'linear-gradient(135deg, rgba(34,197,94,0.04), rgba(34,197,94,0.01))',
                                        border: `1px solid ${isGloballyDisabled
                                            ? 'rgba(255,255,255,0.04)'
                                            : isMuted
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(34,197,94,0.12)'}`,
                                        borderRadius: '0.75rem',
                                        cursor: isGloballyDisabled ? 'not-allowed' : saving ? 'wait' : 'pointer',
                                        opacity: isGloballyDisabled ? 0.4 : 1,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {/* Toggle indicator */}
                                    <div style={{
                                        width: '40px',
                                        height: '22px',
                                        borderRadius: '11px',
                                        background: isGloballyDisabled
                                            ? 'rgba(255,255,255,0.1)'
                                            : isMuted
                                                ? 'rgba(255,255,255,0.1)'
                                                : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        position: 'relative',
                                        transition: 'all 0.3s',
                                        flexShrink: 0,
                                    }}>
                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute',
                                            top: '2px',
                                            left: isGloballyDisabled || isMuted ? '2px' : '20px',
                                            transition: 'left 0.3s',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        }} />
                                    </div>

                                    {/* Label + description */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.88rem',
                                            fontWeight: 500,
                                            color: isGloballyDisabled
                                                ? 'rgba(255,255,255,0.3)'
                                                : isMuted
                                                    ? 'rgba(255,255,255,0.5)'
                                                    : '#fff',
                                            marginBottom: '0.1rem',
                                            transition: 'color 0.2s',
                                        }}>
                                            {cfg.label}
                                        </div>
                                        <div style={{
                                            fontSize: '0.72rem',
                                            color: 'rgba(255,255,255,0.35)',
                                            lineHeight: 1.4,
                                        }}>
                                            {cfg.description}
                                            {isGloballyDisabled && (
                                                <span style={{ color: '#ef4444', marginLeft: '0.4rem' }}>
                                                    (wyłączone globalnie przez admina)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    {isSavingThis && (
                                        <RefreshCw size={14} style={{
                                            color: 'rgba(255,255,255,0.4)',
                                            animation: 'spin 1s linear infinite',
                                            flexShrink: 0,
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {configs.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '0.88rem',
                }}>
                    Brak dostępnych typów powiadomień dla Twojego konta.
                </div>
            )}
        </div>
    );
}
