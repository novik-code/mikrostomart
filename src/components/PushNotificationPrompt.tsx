'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationPromptProps {
    userType: 'patient' | 'employee' | 'admin';
    userId: string;
    locale?: string;
    /** Compact mode — just a small toggle, no banner */
    compact?: boolean;
}

export default function PushNotificationPrompt({
    userType,
    userId,
    locale = 'pl',
    compact = false,
}: PushNotificationPromptProps) {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
            setPermission('unsupported');
            return;
        }

        setPermission(Notification.permission);

        // Check if push-sw already registered and subscribed
        navigator.serviceWorker.getRegistration('/push-sw.js').then(reg => {
            if (reg) {
                reg.pushManager.getSubscription().then(sub => {
                    setIsSubscribed(!!sub);
                });
            }
        });

        // Check dismiss storage
        const dismissKey = `push_dismissed_${userType}_${userId}`;
        if (sessionStorage.getItem(dismissKey)) {
            setDismissed(true);
        }
    }, [userType, userId]);

    const subscribe = useCallback(async () => {
        if (!vapidPublicKey) {
            console.error('[Push] VAPID public key not set');
            return;
        }

        setLoading(true);
        try {
            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') {
                setLoading(false);
                return;
            }

            // Register push service worker
            const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;

            // Convert VAPID key
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

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

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

            if (!res.ok) throw new Error('Subscription API failed');
            setIsSubscribed(true);
        } catch (error) {
            console.error('[Push] Subscribe error:', error);
        } finally {
            setLoading(false);
        }
    }, [vapidPublicKey, userType, userId, locale]);

    const unsubscribe = useCallback(async () => {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    // Unsubscribe from browser
                    await sub.unsubscribe();

                    // Remove from server
                    await fetch('/api/push/subscribe', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: sub.endpoint }),
                    });
                }
            }
            setIsSubscribed(false);
        } catch (error) {
            console.error('[Push] Unsubscribe error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const dismiss = () => {
        setDismissed(true);
        const dismissKey = `push_dismissed_${userType}_${userId}`;
        sessionStorage.setItem(dismissKey, '1');
    };

    // Don't render if unsupported, already subscribed in non-compact, or dismissed
    if (permission === 'unsupported') return null;
    if (permission === 'denied' && !compact) return null;
    if (dismissed && !compact && !isSubscribed) return null;

    // Compact toggle mode
    if (compact) {
        return (
            <button
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={loading || permission === 'denied'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: isSubscribed
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isSubscribed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '0.5rem',
                    color: isSubscribed ? '#22c55e' : 'rgba(255,255,255,0.7)',
                    cursor: loading || permission === 'denied' ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.5 : 1,
                }}
            >
                {isSubscribed ? '🔔' : '🔕'}
                {loading ? '...' : isSubscribed ? 'Powiadomienia ON' : 'Włącz powiadomienia'}
            </button>
        );
    }

    // Full banner mode (if not yet subscribed)
    if (isSubscribed) return null;

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
