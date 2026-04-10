"use client";
import { useState } from "react";
import SmsRemindersTab from "./SmsRemindersTab";
import PostVisitSmsTab from "./PostVisitSmsTab";
import WeekAfterVisitSmsTab from "./WeekAfterVisitSmsTab";

type SubTab = 'reminders' | 'post-visit' | 'week-after' | 'delivery-log';

export default function PatientCommunicationTab() {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('reminders');
    const [deliveryLog, setDeliveryLog] = useState<any[]>([]);
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'push' | 'sms' | 'push+sms' | 'none'>('all');

    const subTabs: { id: SubTab; label: string; icon: string }[] = [
        { id: 'reminders', label: 'Przypomnienia', icon: '📋' },
        { id: 'post-visit', label: 'Po wizycie', icon: '✉️' },
        { id: 'week-after', label: 'Tydzień po', icon: '📱' },
        { id: 'delivery-log', label: 'Log dostarczeń', icon: '📊' },
    ];

    const loadDeliveryLog = async () => {
        setDeliveryLoading(true);
        try {
            const res = await fetch('/api/admin/sms-reminders?limit=100');
            if (res.ok) {
                const data = await res.json();
                setDeliveryLog(data.reminders || []);
            }
        } catch (err) {
            console.error('Failed to load delivery log:', err);
        }
        setDeliveryLoading(false);
    };

    const channelBadge = (channel: string | null, pushSent: boolean, pushError: string | null) => {
        const ch = channel || 'sms';
        const styles: Record<string, { bg: string; border: string; color: string; label: string; icon: string }> = {
            'push': { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', color: '#a78bfa', label: 'Push', icon: '🔔' },
            'sms': { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', color: '#38bdf8', label: 'SMS', icon: '📱' },
            'push+sms': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#f59e0b', label: 'Push+SMS', icon: '🔄' },
            'pending': { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)', color: '#9ca3af', label: 'Oczekuje', icon: '⏳' },
            'none': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#ef4444', label: 'Brak', icon: '❌' },
        };
        const s = styles[ch] || styles['sms'];
        return (
            <span
                title={pushError ? `Push error: ${pushError}` : (pushSent ? 'Push wysłany pomyślnie' : 'Brak FCM tokenu')}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.68rem',
                    fontWeight: 'bold', background: s.bg, color: s.color,
                    border: `1px solid ${s.border}`, cursor: pushError ? 'help' : 'default',
                }}
            >
                {s.icon} {s.label}
            </span>
        );
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            sent: '#22c55e', failed: '#ef4444', draft: '#f59e0b',
            cancelled: '#6b7280', push_sent: '#a78bfa'
        };
        const labels: Record<string, string> = {
            sent: 'Wysłane', failed: 'Błąd', draft: 'Szkic',
            cancelled: 'Anulowane', push_sent: 'Push OK'
        };
        const c = colors[status] || '#888';
        return (
            <span style={{
                padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.68rem',
                fontWeight: 'bold', background: `${c}22`, color: c,
                border: `1px solid ${c}44`
            }}>
                {labels[status] || status}
            </span>
        );
    };

    const smsTypeName = (type: string) => {
        const names: Record<string, string> = {
            reminder: '📋 Przypomnienie',
            post_visit: '✉️ Po wizycie',
            week_after_visit: '📱 Tydzień po',
        };
        return names[type] || type;
    };

    const filteredLog = deliveryLog.filter(item => {
        if (deliveryFilter === 'all') return true;
        return (item.delivery_channel || 'sms') === deliveryFilter;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(56,189,248,0.08))',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '1rem', padding: '1.5rem'
            }}>
                <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.3rem' }}>
                    📨 Komunikacja z Pacjentem
                </h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
                    System potwierdzania wizyt i komunikacji — Push-first + SMS fallback
                </p>
            </div>

            {/* Sub-tabs navigation */}
            <div style={{
                display: 'flex', gap: '0.5rem', borderBottom: '2px solid rgba(255,255,255,0.08)',
                paddingBottom: '0.5rem', overflowX: 'auto'
            }}>
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveSubTab(tab.id);
                            if (tab.id === 'delivery-log' && deliveryLog.length === 0) {
                                loadDeliveryLog();
                            }
                        }}
                        style={{
                            padding: '0.6rem 1.2rem',
                            background: activeSubTab === tab.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                            border: `1px solid ${activeSubTab === tab.id ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '0.5rem',
                            color: activeSubTab === tab.id ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', fontSize: '0.88rem',
                            fontWeight: activeSubTab === tab.id ? 'bold' : 'normal',
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab content */}
            {activeSubTab === 'reminders' && <SmsRemindersTab />}
            {activeSubTab === 'post-visit' && <PostVisitSmsTab />}
            {activeSubTab === 'week-after' && <WeekAfterVisitSmsTab />}

            {/* Delivery Log Tab */}
            {activeSubTab === 'delivery-log' && (
                <div>
                    {/* Filter bar */}
                    <div style={{
                        display: 'flex', gap: '0.5rem', marginBottom: '1rem',
                        flexWrap: 'wrap', alignItems: 'center'
                    }}>
                        <button onClick={loadDeliveryLog} disabled={deliveryLoading}
                            style={{
                                padding: '0.5rem 1rem', background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem',
                                color: 'white', cursor: deliveryLoading ? 'wait' : 'pointer',
                                fontSize: '0.83rem'
                            }}>
                            {deliveryLoading ? '⏳ Ładowanie...' : '🔄 Odśwież'}
                        </button>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {(['all', 'push', 'sms', 'push+sms', 'none'] as const).map(f => (
                                <button key={f} onClick={() => setDeliveryFilter(f)}
                                    style={{
                                        padding: '0.35rem 0.8rem', fontSize: '0.75rem',
                                        background: deliveryFilter === f ? 'rgba(139,92,246,0.15)' : 'transparent',
                                        border: `1px solid ${deliveryFilter === f ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '1rem',
                                        color: deliveryFilter === f ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                    }}>
                                    {f === 'all' ? 'Wszystkie' : f === 'none' ? 'Niedostarczone' : f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                            {filteredLog.length} / {deliveryLog.length} wpisów
                        </span>
                    </div>

                    {/* Delivery stats */}
                    <div style={{
                        display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap'
                    }}>
                        {[
                            { label: 'Push', count: deliveryLog.filter(d => d.delivery_channel === 'push').length, color: '#a78bfa' },
                            { label: 'SMS', count: deliveryLog.filter(d => !d.delivery_channel || d.delivery_channel === 'sms').length, color: '#38bdf8' },
                            { label: 'Push+SMS', count: deliveryLog.filter(d => d.delivery_channel === 'push+sms').length, color: '#f59e0b' },
                            { label: 'Z kontem', count: deliveryLog.filter(d => d.patient_has_account).length, color: '#22c55e' },
                            { label: 'Z push', count: deliveryLog.filter(d => d.patient_has_push).length, color: '#a78bfa' },
                        ].map(stat => (
                            <div key={stat.label} style={{
                                padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.6rem',
                                textAlign: 'center', minWidth: '80px',
                            }}>
                                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: stat.color }}>
                                    {stat.count}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Log table */}
                    {deliveryLoading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>⏳ Ładowanie...</p>}
                    {!deliveryLoading && filteredLog.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                            Brak wpisów — kliknij &ldquo;Odśwież&rdquo; aby załadować dane.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {filteredLog.map((item: any) => (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem',
                                fontSize: '0.8rem', flexWrap: 'wrap',
                            }}>
                                {/* Channel badge */}
                                <div style={{ minWidth: '95px' }}>
                                    {channelBadge(item.delivery_channel, item.push_sent, item.push_error)}
                                </div>

                                {/* Status */}
                                <div style={{ minWidth: '75px' }}>
                                    {statusBadge(item.status)}
                                </div>

                                {/* Type */}
                                <div style={{ minWidth: '120px', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>
                                    {smsTypeName(item.sms_type)}
                                </div>

                                {/* Patient */}
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <span style={{ fontWeight: 'bold', color: 'white' }}>{item.patient_name}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{item.phone}</span>
                                </div>

                                {/* Doctor + date */}
                                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', minWidth: '150px' }}>
                                    Dr. {item.doctor_name}
                                    {item.appointment_date && (
                                        <> · {new Date(item.appointment_date).toLocaleDateString('pl-PL')}</>
                                    )}
                                </div>

                                {/* Push info tooltip */}
                                {item.push_error && (
                                    <div style={{
                                        fontSize: '0.65rem', color: '#f59e0b',
                                        padding: '0.1rem 0.4rem', borderRadius: '0.3rem',
                                        background: 'rgba(245,158,11,0.1)',
                                        maxWidth: '200px', overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }} title={item.push_error}>
                                        ⚠ {item.push_error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
