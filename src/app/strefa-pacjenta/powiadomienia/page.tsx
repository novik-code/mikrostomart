'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from '@/hooks/usePatientAuth';

interface PushNotification {
    id: string;
    title: string;
    body: string;
    url: string | null;
    tag: string | null;
    sent_at: string;
}

export default function PatientNotificationsPage() {
    const { patient, isLoading: authLoading } = usePatientAuth();
    const [notifications, setNotifications] = useState<PushNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cookies = document.cookie.split('; ');
            const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
            const token = tokenCookie ? tokenCookie.split('=')[1] : null;

            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/patients/push/history', { headers });
            if (!res.ok) throw new Error('Błąd serwera');
            const data = await res.json();
            setNotifications(data.notifications || []);
        } catch (e: any) {
            setError(e?.message || 'Błąd pobierania powiadomień');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && patient) {
            fetchNotifications();
        }
    }, [authLoading, patient, fetchNotifications]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Teraz';
        if (diffMin < 60) return `${diffMin} min temu`;
        if (diffHours < 24) return `${diffHours} godz. temu`;
        if (diffDays < 7) return `${diffDays} dni temu`;
        return date.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTagIcon = (tag: string | null) => {
        if (!tag) return '🔔';
        if (tag.includes('reminder')) return '📅';
        if (tag.includes('visit') || tag.includes('appointment')) return '🏥';
        if (tag.includes('message') || tag.includes('chat')) return '💬';
        if (tag.includes('action')) return '✅';
        return '🔔';
    };

    if (authLoading) {
        return (
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '2rem',
            }}>
                <div style={{
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.5)',
                }}>
                    Ładowanie...
                </div>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '2rem',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
            }}>
                <div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginBottom: '0.25rem',
                    }}>
                        🔔 Powiadomienia
                    </h2>
                    <p style={{
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.5)',
                    }}>
                        Historia powiadomień push z ostatnich 90 dni
                    </p>
                </div>
                <button
                    onClick={fetchNotifications}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(var(--color-primary-rgb), 0.15)',
                        border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
                        borderRadius: '0.5rem',
                        color: 'var(--color-primary)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: loading ? 0.5 : 1,
                        transition: 'all 0.2s',
                    }}
                >
                    🔄 Odśwież
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#ef4444',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'rgba(255,255,255,0.5)',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(var(--color-primary-rgb), 0.15)',
                        borderTop: '3px solid var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 1rem',
                    }} />
                    Ładowanie powiadomień...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Empty state */}
            {!loading && notifications.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    color: 'rgba(255,255,255,0.4)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔕</div>
                    <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                        Brak powiadomień
                    </p>
                    <p style={{ fontSize: '0.85rem' }}>
                        Tutaj pojawią się powiadomienia wysłane do Ciebie z kliniki.
                    </p>
                </div>
            )}

            {/* Notifications list */}
            {!loading && notifications.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '0.75rem',
                                padding: '1rem 1.25rem',
                                transition: 'all 0.2s',
                                cursor: notif.url ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                                if (notif.url && !notif.url.includes('powiadomienia')) {
                                    window.location.href = notif.url;
                                }
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                            }}>
                                {/* Icon */}
                                <div style={{
                                    fontSize: '1.5rem',
                                    lineHeight: 1,
                                    flexShrink: 0,
                                    marginTop: '0.1rem',
                                }}>
                                    {getTagIcon(notif.tag)}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.5rem',
                                        marginBottom: '0.25rem',
                                    }}>
                                        <h3 style={{
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            color: '#fff',
                                            margin: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {notif.title || 'Powiadomienie'}
                                        </h3>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255,255,255,0.4)',
                                            flexShrink: 0,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {formatDate(notif.sent_at)}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        margin: 0,
                                        lineHeight: 1.5,
                                    }}>
                                        {notif.body || ''}
                                    </p>
                                    {notif.url && !notif.url.includes('powiadomienia') && (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            fontSize: '0.78rem',
                                            color: 'var(--color-primary)',
                                            opacity: 0.7,
                                        }}>
                                            Kliknij aby otworzyć →
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer info */}
            {!loading && notifications.length > 0 && (
                <div style={{
                    marginTop: '1.5rem',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.3)',
                }}>
                    Wyświetlono {notifications.length} powiadomień
                </div>
            )}
        </div>
    );
}
