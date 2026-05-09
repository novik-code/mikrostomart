'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './patient.module.css';
import { demoSanitize, brand } from '@/lib/brandConfig';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';

// Pages that don't need the authenticated layout shell
const PUBLIC_PATHS = [
    '/strefa-pacjenta/login',
    '/strefa-pacjenta/register',
    '/strefa-pacjenta/reset-password',
];

const NAV_LINKS = [
    { href: '/strefa-pacjenta/dashboard', label: 'Panel główny' },
    { href: '/strefa-pacjenta/historia', label: 'Historia wizyt' },
    { href: '/strefa-pacjenta/profil', label: 'Mój profil' },
    { href: '/strefa-pacjenta/wiadomosci', label: '💬 Wiadomości' },
    { href: '/strefa-pacjenta/powiadomienia', label: '🔔 Powiadomienia' },
    { href: '/strefa-pacjenta/ocen-nas', label: '⭐ Oceń nas' },
];

export default function PatientZoneLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Check if current path is a public page (login, register, reset-password)
    const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === '/strefa-pacjenta';

    // For public pages, just render children without the layout shell
    if (isPublicPage) {
        return <>{children}</>;
    }

    // For authenticated pages, wrap with the patient layout
    return <AuthenticatedLayout pathname={pathname}>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children, pathname }: { children: React.ReactNode; pathname: string }) {
    const [patientName, setPatientName] = useState<string | null>(null);
    const [supabaseId, setSupabaseId] = useState<string | null>(null);
    const [accountStatus, setAccountStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pushPopup, setPushPopup] = useState<{ title: string; body: string; time: number } | null>(null);
    const router = useRouter();

    // Listen for push notification events (foreground + click from background)
    useEffect(() => {
        // Check URL params (from service worker notificationclick)
        const params = new URLSearchParams(window.location.search);
        const pushTitle = params.get('pushTitle');
        const pushBody = params.get('pushBody');
        const pushTime = params.get('pushTime');
        if (pushTitle && pushTime) {
            setPushPopup({ title: pushTitle, body: pushBody || '', time: Number(pushTime) });
            // Clean URL without reload
            const url = new URL(window.location.href);
            url.searchParams.delete('pushTitle');
            url.searchParams.delete('pushBody');
            url.searchParams.delete('pushTime');
            window.history.replaceState({}, '', url.pathname + url.search);
        }

        // Listen for foreground push events
        const handlePushEvent = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.title) {
                setPushPopup({ title: detail.title, body: detail.body || '', time: detail.time || Date.now() });
            }
        };
        window.addEventListener('push-notification-received', handlePushEvent);
        return () => window.removeEventListener('push-notification-received', handlePushEvent);
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/patients/logout', { method: 'POST' });
        } catch { /* fallback */ }
        // Also clear legacy client-side data
        document.cookie = 'patient_token=; path=/; max-age=0';
        localStorage.removeItem('patient_data');
        router.push('/strefa-pacjenta/login');
    }, [router]);

    useEffect(() => {
        // With httpOnly cookie, the browser sends it automatically.
        // Also try Authorization header for backward compat with non-httpOnly cookie.
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        const token = tokenCookie ? tokenCookie.split('=')[1] : null;

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        fetch('/api/patients/me', { headers })
            .then(res => { if (!res.ok) throw new Error('Unauthorized'); return res.json(); })
            .then(data => {
                setPatientName(data.firstName || '');
                setSupabaseId(data.supabaseId || null);
                setAccountStatus(data.account_status || null);
            })
            .catch(() => router.push('/strefa-pacjenta/login'))
            .finally(() => setIsLoading(false));
    }, [router]);

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                gap: '1rem',
            }}>
                {/* Skeleton header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '1.5rem 2rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div>
                            <div className={styles.skeleton} style={{ width: '160px', height: '24px', marginBottom: '8px' }} />
                            <div className={styles.skeleton} style={{ width: '120px', height: '16px' }} />
                        </div>
                        <div className={styles.skeleton} style={{ width: '80px', height: '40px' }} />
                    </div>
                    {/* Skeleton nav */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '1rem 2rem',
                        display: 'flex',
                        gap: '1rem',
                    }}>
                        {[120, 100, 80, 110, 80].map((w, i) => (
                            <div key={i} className={styles.skeleton} style={{ width: `${w}px`, height: '40px' }} />
                        ))}
                    </div>
                </div>
                <div style={{ width: '48px', height: '48px', border: '3px solid rgba(var(--color-primary-dark-rgb),0.15)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Ładowanie danych...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'transparent',
        }}>
            {/* Header */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginBottom: '0.25rem',
                    }}>
                        Strefa Pacjenta
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                        {patientName ? `Witaj, ${patientName}! 👋` : 'Moje konto'}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Push notification compact toggle */}
                    {supabaseId && (
                        <PushNotificationPrompt
                            userType="patient"
                            userId={supabaseId}
                            locale="pl"
                            compact
                        />
                    )}
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.5rem',
                            color: '#ef4444',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        Wyloguj
                    </button>
                </div>
            </div>

            {/* Pending Approval Banner */}
            {accountStatus === 'pending_admin_approval' && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-primary-rgb), 0.05))',
                    border: '2px solid rgba(var(--color-primary-rgb), 0.4)',
                    borderLeft: '6px solid var(--color-primary)',
                    padding: '1.5rem 2rem',
                    margin: '0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                        <div style={{ fontSize: '2rem', lineHeight: 1 }}>⏳</div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: 'var(--color-primary)', fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Konto w trakcie weryfikacji
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '0.75rem' }}>
                                Twoje konto oczekuje na zatwierdzenie przez administratora.<br />
                                Weryfikacja potrwa do <strong>48 godzin</strong>.
                            </p>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Otrzymasz powiadomienie email po zatwierdzeniu konta.<br />
                                W razie pytań: 📞 <strong>{brand.phone1}</strong> lub 📧 <strong>{brand.senderEmail}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejected Account Banner */}
            {accountStatus === 'rejected' && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                    border: '2px solid rgba(239, 68, 68, 0.4)',
                    borderLeft: '6px solid #ef4444',
                    padding: '1.5rem 2rem',
                    margin: '0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                        <div style={{ fontSize: '2rem', lineHeight: 1 }}>❌</div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: '#ef4444', fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Rejestracja odrzucona
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '0.75rem' }}>
                                Niestety nie mogliśmy zatwierdzić Twojej rejestracji.
                            </p>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Skontaktuj się z recepcją: 📞 <strong>{brand.phone1}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '1rem 2rem',
                display: 'flex',
                gap: '1rem',
                overflowX: 'auto',
            }}>
                {NAV_LINKS.map(link => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: isActive ? 'rgba(var(--color-primary-rgb), 0.15)' : 'transparent',
                                border: isActive ? '1px solid rgba(var(--color-primary-rgb), 0.3)' : '1px solid transparent',
                                borderRadius: '0.5rem',
                                color: isActive ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.7)',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                fontWeight: isActive ? 'bold' : 'normal',
                                transition: 'all 0.2s',
                            }}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </div>

            {/* Push Notification Popup */}
            {pushPopup && (
                <div
                    onClick={() => setPushPopup(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        animation: 'fadeIn 0.25s ease-out',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                            border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
                            borderRadius: '1rem',
                            padding: '2rem',
                            maxWidth: '450px',
                            width: '100%',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(var(--color-primary-rgb), 0.1)',
                            animation: 'slideUp 0.3s ease-out',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: '1rem',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                            }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    background: 'rgba(var(--color-primary-rgb), 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.4rem',
                                    flexShrink: 0,
                                }}>🔔</div>
                                <div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--color-primary)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '0.15rem',
                                    }}>
                                        Powiadomienie
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'rgba(255,255,255,0.4)',
                                    }}>
                                        {new Date(pushPopup.time).toLocaleTimeString('pl-PL', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setPushPopup(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    color: 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Divider */}
                        <div style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(var(--color-primary-rgb), 0.3), transparent)',
                            margin: '0.75rem 0 1.25rem',
                        }} />

                        {/* Content */}
                        <h3 style={{
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            color: '#fff',
                            margin: '0 0 0.75rem 0',
                            lineHeight: 1.4,
                        }}>
                            {pushPopup.title}
                        </h3>
                        <p style={{
                            fontSize: '0.95rem',
                            color: 'rgba(255, 255, 255, 0.75)',
                            margin: '0 0 1.5rem 0',
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {pushPopup.body}
                        </p>

                        {/* Action button */}
                        <button
                            onClick={() => setPushPopup(null)}
                            style={{
                                width: '100%',
                                padding: '0.85rem',
                                background: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '0.75rem',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.85';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            OK, rozumiem
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            {/* Page Content */}
            {children}
        </div>
    );
}
