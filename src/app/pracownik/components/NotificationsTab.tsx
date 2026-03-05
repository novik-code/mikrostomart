'use client';

import { RefreshCw, Bell } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
export interface PushNotification {
    id: string;
    title: string;
    body: string;
    url: string | null;
    tag: string | null;
    sent_at: string;
}

interface NotificationsTabProps {
    pushNotifications: PushNotification[];
    pushNotifLoading: boolean;
    pushNotifError: string | null;
    fetchPushNotifications: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────
function fmtRelative(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'przed chwilą';
    if (diff < 3600) return `${Math.floor(diff / 60)} min temu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} godz. temu`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'wczoraj';
    return `${days} dni temu`;
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string) {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const nd = new Date(d); nd.setHours(0, 0, 0, 0);
    if (nd.getTime() === today.getTime()) return 'Dziś';
    if (nd.getTime() === yest.getTime()) return 'Wczoraj';
    return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function tagIcon(tag: string | null) {
    if (!tag) return '🔔';
    if (tag.startsWith('task')) return '📋';
    if (tag.startsWith('appointment')) return '📅';
    if (tag.startsWith('assistant')) return '🤖';
    if (tag.startsWith('manual')) return '📣';
    return '🔔';
}

// ─── Component ────────────────────────────────────────────────
export default function NotificationsTab({
    pushNotifications,
    pushNotifLoading,
    pushNotifError,
    fetchPushNotifications,
}: NotificationsTabProps) {
    // Group by day
    const byDay: Record<string, PushNotification[]> = {};
    for (const n of pushNotifications) {
        const key = fmtDay(n.sent_at);
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(n);
    }

    return (
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                        🔔 Historia powiadomień
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
                        Ostatnie 7 dni • Pokazujesz tylko swoje powiadomienia
                    </p>
                </div>
                <button
                    onClick={fetchPushNotifications}
                    disabled={pushNotifLoading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '0.5rem', color: '#38bdf8',
                        fontSize: '0.8rem', cursor: pushNotifLoading ? 'not-allowed' : 'pointer',
                        opacity: pushNotifLoading ? 0.5 : 1, transition: 'all 0.2s',
                    }}
                >
                    <RefreshCw size={13} style={{ animation: pushNotifLoading ? 'spin 1s linear infinite' : 'none' }} />
                    Odśwież
                </button>
            </div>

            {/* Error */}
            {pushNotifError && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    ⚠️ {pushNotifError}
                </div>
            )}

            {/* Loading skeleton */}
            {pushNotifLoading && pushNotifications.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ height: '64px', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!pushNotifLoading && pushNotifications.length === 0 && !pushNotifError && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', color: 'rgba(255,255,255,0.35)' }}>
                    <Bell size={48} style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: '1rem', margin: 0 }}>Brak powiadomień z ostatnich 7 dni</p>
                    <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.7 }}>Powiadomienia będą się tu pojawiać automatycznie</p>
                </div>
            )}

            {/* Grouped notification list */}
            {!pushNotifLoading && Object.entries(byDay).map(([day, items]) => (
                <div key={day} style={{ marginBottom: '1.5rem' }}>
                    {/* Day header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{day}</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    </div>

                    {/* Notification rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {items.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => notif.url && window.open(notif.url, '_self')}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '0.9rem',
                                    padding: '0.85rem 1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '0.75rem',
                                    cursor: notif.url ? 'pointer' : 'default',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { if (notif.url) (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,189,248,0.05)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                            >
                                {/* Icon */}
                                <div style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>{tagIcon(notif.tag)}</div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</p>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{notif.body}</p>
                                </div>

                                {/* Timestamp */}
                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{fmtTime(notif.sent_at)}</p>
                                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>{fmtRelative(notif.sent_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
