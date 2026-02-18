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
    // Check display-mode media query
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    // iOS Safari standalone mode
    if ((navigator as any).standalone === true) return true;
    return false;
}

export default function PushNotificationPrompt({
    userType,
    userId,
    locale = 'pl',
    compact = false,
}: PushNotificationPromptProps) {
    const [status, setStatus] = useState<'loading' | 'unsupported' | 'needs-pwa' | 'can-subscribe' | 'subscribed' | 'denied'>('loading');
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);

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
            setStatus('unsupported');
            return;
        }

        // On iOS Safari (not PWA), PushManager is not available
        if (!hasPushManager) {
            setStatus('needs-pwa');
            return;
        }

        if (Notification.permission === 'denied') {
            setStatus('denied');
            return;
        }

        // Check existing subscription via localStorage (more reliable than browser API)
        const subKey = `push_sub_${userType}_${userId}`;
        const existingSub = localStorage.getItem(subKey);

        if (existingSub) {
            setStatus('subscribed');
        } else {
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
        if (!vapidPublicKey) {
            console.error('[Push] VAPID public key not set');
            return;
        }

        setLoading(true);
        try {
            // Request permission
            console.log('[Push] Requesting permission...');
            const perm = await Notification.requestPermission();
            console.log('[Push] Permission result:', perm);

            if (perm !== 'granted') {
                setStatus('denied');
                setLoading(false);
                return;
            }

            // Wait for SW
            console.log('[Push] Waiting for SW ready...');
            const registration = await navigator.serviceWorker.ready;
            console.log('[Push] SW ready, scope:', registration.scope);

            // Unsubscribe any existing subscription first (clean slate)
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
                console.log('[Push] Removing old subscription...');
                await existingSub.unsubscribe();
            }

            // Subscribe to push
            console.log('[Push] Subscribing...');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 60));

            // Send subscription to server
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
                await fetch('/api/push/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, userType }),
                });
            } catch (e) {
                console.log('[Push] Test push skipped:', e);
            }

        } catch (error) {
            console.error('[Push] Subscribe error:', error);
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
        if (status === 'needs-pwa') return null; // hide compact in Safari
        return (
            <button
                onClick={status === 'subscribed' ? unsubscribe : subscribe}
                disabled={loading || status === 'denied'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: status === 'subscribed'
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${status === 'subscribed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '0.5rem',
                    color: status === 'subscribed' ? '#22c55e' : 'rgba(255,255,255,0.7)',
                    cursor: loading || status === 'denied' ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.5 : 1,
                }}
            >
                {status === 'subscribed' ? '🔔' : '🔕'}
                {loading ? '...' : status === 'subscribed' ? 'Powiadomienia ON' : 'Włącz powiadomienia'}
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
