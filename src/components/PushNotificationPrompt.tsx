'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationPromptProps {
    userType: 'patient' | 'employee' | 'admin';
    userId: string;
    locale?: string;
    /** Compact mode — just a small toggle, no banner */
    compact?: boolean;
}

/**
 * Detect if running as installed PWA (standalone or fullscreen)
 */
function isRunningAsPWA(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if ((navigator as any).standalone === true) return true;
    return false;
}

export default function PushNotificationPrompt({
    userType,
    userId,
    locale = 'pl',
    compact = false,
}: PushNotificationPromptProps) {
    const [status, setStatus] = useState<'loading' | 'unsupported' | 'needs-pwa' | 'can-subscribe' | 'subscribed' | 'denied' | 'error'>('loading');
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    useEffect(() => {
        if (typeof window === 'undefined') {
            setStatus('unsupported');
            return;
        }

        const hasSW = 'serviceWorker' in navigator;
        const hasNotification = 'Notification' in window;
        const hasPushManager = 'PushManager' in window;
        const isPWA = isRunningAsPWA();

        console.log('[Push] Check:', { hasSW, hasNotification, hasPushManager, isPWA, vapidKey: !!vapidPublicKey });

        if (!hasSW || !hasNotification) {
            console.log('[Push] → unsupported (no SW or no Notification API)');
            setStatus('unsupported');
            return;
        }

        // On iOS Safari (not installed as PWA), PushManager is not available
        if (!hasPushManager) {
            console.log('[Push] → needs-pwa (no PushManager, isPWA:', isPWA, ')');
            setStatus('needs-pwa');
            return;
        }

        if (Notification.permission === 'denied') {
            console.log('[Push] → denied (user previously denied)');
            setStatus('denied');
            return;
        }

        // Check existing subscription
        const subKey = `push_sub_${userType}_${userId}`;
        const existingSub = localStorage.getItem(subKey);

        if (existingSub) {
            // Verify the subscription is still valid
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        console.log('[Push] → subscribed (verified, endpoint:', sub.endpoint.substring(0, 50), ')');
                        setStatus('subscribed');
                    } else {
                        // Subscription expired or was removed
                        console.log('[Push] → can-subscribe (localStorage says subscribed but no active subscription)');
                        localStorage.removeItem(subKey);
                        setStatus('can-subscribe');
                    }
                }).catch(() => {
                    setStatus('can-subscribe');
                });
            }).catch(() => {
                setStatus('can-subscribe');
            });
        } else {
            console.log('[Push] → can-subscribe');
            setStatus('can-subscribe');
        }

        // Check dismiss storage
        const dismissKey = `push_dismissed_${userType}_${userId}`;
        if (sessionStorage.getItem(dismissKey)) {
            setDismissed(true);
        }
    }, [userType, userId, vapidPublicKey]);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribe = useCallback(async () => {
        setErrorMessage('');

        if (!vapidPublicKey) {
            console.error('[Push] VAPID public key not set');
            setErrorMessage('Brak klucza VAPID — skontaktuj się z administratorem');
            setStatus('error');
            return;
        }

        setLoading(true);
        try {
            // Step 1: Request permission
            console.log('[Push] Step 1: Requesting permission...');
            const perm = await Notification.requestPermission();
            console.log('[Push] Permission result:', perm);

            if (perm !== 'granted') {
                setStatus('denied');
                setLoading(false);
                return;
            }

            // Step 2: Register service worker if not ready
            console.log('[Push] Step 2: Waiting for SW ready...');
            let registration: ServiceWorkerRegistration;
            try {
                registration = await navigator.serviceWorker.ready;
                console.log('[Push] SW ready, scope:', registration.scope);
            } catch (swError) {
                console.error('[Push] SW not ready:', swError);
                // Try to register it manually
                try {
                    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                    console.log('[Push] Manually registered SW, scope:', registration.scope);
                    // Wait for it to activate
                    await new Promise<void>((resolve) => {
                        if (registration.active) {
                            resolve();
                        } else {
                            const sw = registration.installing || registration.waiting;
                            if (sw) {
                                sw.addEventListener('statechange', function handler() {
                                    if (sw.state === 'activated') {
                                        sw.removeEventListener('statechange', handler);
                                        resolve();
                                    }
                                });
                            } else {
                                resolve();
                            }
                        }
                    });
                } catch (regError) {
                    console.error('[Push] Failed to register SW:', regError);
                    setErrorMessage('Nie udało się zarejestrować Service Workera');
                    setStatus('error');
                    setLoading(false);
                    return;
                }
            }

            // Step 3: Unsubscribe any existing subscription
            try {
                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) {
                    console.log('[Push] Step 3: Removing old subscription...');
                    await existingSub.unsubscribe();
                }
            } catch (e) {
                console.log('[Push] Step 3: No existing subscription to remove');
            }

            // Step 4: Subscribe to push
            console.log('[Push] Step 4: Subscribing to push...');
            let subscription: PushSubscription;
            try {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });
                console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 60));
            } catch (subError: any) {
                console.error('[Push] Subscribe error:', subError);
                if (subError?.message?.includes('applicationServerKey')) {
                    setErrorMessage('Nieprawidłowy klucz VAPID');
                } else {
                    setErrorMessage(`Błąd subskrypcji: ${subError?.message || 'Nieznany błąd'}`);
                }
                setStatus('error');
                setLoading(false);
                return;
            }

            // Step 5: Send subscription to server
            console.log('[Push] Step 5: Sending subscription to server...');
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userType,
                    userId,
                    locale,
                }),
            });

            const resData = await res.json();
            console.log('[Push] Subscribe API response:', res.status, resData);

            if (!res.ok) {
                throw new Error(`API error: ${JSON.stringify(resData)}`);
            }

            // Track in localStorage
            const subKey = `push_sub_${userType}_${userId}`;
            localStorage.setItem(subKey, 'true');

            setStatus('subscribed');

            // Send a test push
            try {
                console.log('[Push] Step 6: Sending test push...');
                await fetch('/api/push/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, userType }),
                });
            } catch (e) {
                console.log('[Push] Test push skipped:', e);
            }

        } catch (error: any) {
            console.error('[Push] Subscribe error:', error);
            setErrorMessage(error?.message || 'Wystąpił nieznany błąd');
            setStatus('error');
        } finally {
            setLoading(false);
        }
    }, [vapidPublicKey, userType, userId, locale]);

    const unsubscribe = useCallback(async () => {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await sub.unsubscribe();
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
            }
            const subKey = `push_sub_${userType}_${userId}`;
            localStorage.removeItem(subKey);
            setStatus('can-subscribe');
        } catch (error) {
            console.error('[Push] Unsubscribe error:', error);
        } finally {
            setLoading(false);
        }
    }, [userType, userId]);

    const dismiss = () => {
        setDismissed(true);
        const dismissKey = `push_dismissed_${userType}_${userId}`;
        sessionStorage.setItem(dismissKey, '1');
    };

    // --- Render ---

    if (status === 'loading' || status === 'unsupported') return null;

    // Compact toggle mode
    if (compact) {
        // In compact mode, show "needs-pwa" as a hint instead of hiding
        if (status === 'needs-pwa') {
            return (
                <button
                    onClick={() => {
                        alert('📱 Aby włączyć powiadomienia push:\n\n1. Dodaj stronę do ekranu głównego:\n   Safari → Udostępnij ⬆️ → Dodaj do ekranu początkowego\n\n2. Otwórz aplikację z ekranu głównego\n\n3. Włącz powiadomienia ponownie');
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.75rem',
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        borderRadius: '0.5rem',
                        color: '#fbbf24',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        maxWidth: '150px',
                        overflow: 'hidden',
                    }}
                >
                    📱 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Dodaj do ekranu</span>
                </button>
            );
        }


        if (status === 'denied') {
            return (
                <button
                    disabled
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.5rem',
                        color: '#ef4444',
                        cursor: 'not-allowed',
                        fontSize: '0.85rem',
                        opacity: 0.6,
                    }}
                    title="Powiadomienia zostały zablokowane. Zmień uprawnienia w ustawieniach przeglądarki/urządzenia."
                >
                    🔕 Zablokowane
                </button>
            );
        }

        if (status === 'error') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button
                        onClick={subscribe}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.5rem',
                            color: '#ef4444',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s',
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        ⚠️ {loading ? '...' : 'Spróbuj ponownie'}
                    </button>
                    {errorMessage && (
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', maxWidth: '200px', lineHeight: '1.3' }}>
                            {errorMessage}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <button
                onClick={status === 'subscribed' ? unsubscribe : subscribe}
                disabled={loading}
                title={status === 'subscribed' ? 'Wyłącz powiadomienia push' : 'Włącz powiadomienia push'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.75rem',
                    background: status === 'subscribed'
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${status === 'subscribed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '0.5rem',
                    color: status === 'subscribed' ? '#22c55e' : 'rgba(255,255,255,0.7)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.5 : 1,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    maxWidth: '160px',
                    overflow: 'hidden',
                }}
            >
                {status === 'subscribed' ? '🔔' : '🔕'}
                {loading ? '...' : status === 'subscribed' ? ' ON' : ' Push'}
            </button>
        );
    }

    // Banner: already subscribed or denied — hide
    if (status === 'subscribed' || status === 'denied') return null;
    if (dismissed) return null;

    // "Add to home screen" prompt for iOS Safari
    if (status === 'needs-pwa') {
        const pwaLabels: Record<string, { title: string; body: string; dismiss: string }> = {
            pl: {
                title: '📱 Dodaj do ekranu głównego',
                body: 'Aby otrzymywać powiadomienia push, dodaj tę stronę do ekranu głównego: Safari → Udostępnij ⬆️ → Dodaj do ekranu początkowego',
                dismiss: 'Rozumiem',
            },
            en: {
                title: '📱 Add to Home Screen',
                body: 'To receive push notifications, add this page to your home screen: Safari → Share ⬆️ → Add to Home Screen',
                dismiss: 'Got it',
            },
            de: {
                title: '📱 Zum Startbildschirm hinzufügen',
                body: 'Um Push-Benachrichtigungen zu erhalten, fügen Sie diese Seite zum Startbildschirm hinzu: Safari → Teilen ⬆️ → Zum Home-Bildschirm',
                dismiss: 'Verstanden',
            },
            ua: {
                title: '📱 Додати на головний екран',
                body: 'Щоб отримувати push-сповіщення, додайте цю сторінку на головний екран: Safari → Поділитися ⬆️ → На Початковий екран',
                dismiss: 'Зрозуміло',
            },
        };

        const pl = pwaLabels[locale] || pwaLabels.pl;

        return (
            <div style={{
                margin: '1rem',
                padding: '1rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.08))',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        color: '#fff',
                        margin: '0 0 0.25rem 0',
                    }}>
                        {pl.title}
                    </p>
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.6)',
                        margin: 0,
                        lineHeight: '1.4',
                    }}>
                        {pl.body}
                    </p>
                </div>
                <button
                    onClick={dismiss}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        flexShrink: 0,
                    }}
                >
                    {pl.dismiss}
                </button>
            </div>
        );
    }

    // Error banner
    if (status === 'error') {
        return (
            <div style={{
                margin: '1rem',
                padding: '1rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.08))',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        color: '#ef4444',
                        margin: '0 0 0.25rem 0',
                    }}>
                        ⚠️ Błąd powiadomień push
                    </p>
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.6)',
                        margin: 0,
                        lineHeight: '1.4',
                    }}>
                        {errorMessage || 'Nieznany błąd. Spróbuj ponownie.'}
                    </p>
                </div>
                <button
                    onClick={subscribe}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? '...' : 'Spróbuj ponownie'}
                </button>
            </div>
        );
    }

    // Normal "Enable push" banner
    const labels: Record<string, { title: string; body: string; btn: string; dismiss: string }> = {
        pl: {
            title: '🔔 Włącz powiadomienia push',
            body: 'Otrzymuj powiadomienia o wiadomościach, wizytach i nowościach — za darmo!',
            btn: 'Włącz powiadomienia',
            dismiss: 'Nie teraz',
        },
        en: {
            title: '🔔 Enable push notifications',
            body: 'Get notified about messages, appointments, and news — for free!',
            btn: 'Enable notifications',
            dismiss: 'Not now',
        },
        de: {
            title: '🔔 Push-Benachrichtigungen aktivieren',
            body: 'Erhalten Sie Benachrichtigungen über Nachrichten, Termine und Neuigkeiten — kostenlos!',
            btn: 'Benachrichtigungen aktivieren',
            dismiss: 'Nicht jetzt',
        },
        ua: {
            title: '🔔 Увімкнути push-сповіщення',
            body: 'Отримуйте сповіщення про повідомлення, візити та новини — безкоштовно!',
            btn: 'Увімкнути сповіщення',
            dismiss: 'Не зараз',
        },
    };

    const l = labels[locale] || labels.pl;

    return (
        <div style={{
            margin: '1rem',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(168, 85, 247, 0.08))',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
        }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    color: '#fff',
                    margin: '0 0 0.25rem 0',
                }}>
                    {l.title}
                </p>
                <p style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.6)',
                    margin: 0,
                }}>
                    {l.body}
                </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                    onClick={dismiss}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                    }}
                >
                    {l.dismiss}
                </button>
                <button
                    onClick={subscribe}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? '...' : l.btn}
                </button>
            </div>
        </div>
    );
}
