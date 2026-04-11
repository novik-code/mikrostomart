/**
 * Firebase Client SDK — browser-side messaging token management.
 *
 * ARCHITECTURE: This project uses @ducanh2912/next-pwa which auto-registers
 * sw.js at scope "/". Firebase SDK by default registers firebase-messaging-sw.js
 * at scope "/firebase-cloud-messaging-push-scope" — a DIFFERENT scope, so no conflict.
 *
 * We let Firebase handle its own SW registration by NOT passing
 * serviceWorkerRegistration to getToken(). Firebase will auto-register
 * /firebase-messaging-sw.js at its own scope.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging as getFBMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFirebaseConfig() {
    return {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    };
}

export function getFirebaseApp(): FirebaseApp {
    if (app) return app;
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(getFirebaseConfig());
    return app;
}

export function getFirebaseMessaging(): Messaging {
    if (messaging) return messaging;
    messaging = getFBMessaging(getFirebaseApp());
    return messaging;
}

/**
 * Request an FCM token for the current browser/device.
 * Lets Firebase SDK handle its own service worker registration.
 */
export async function requestFCMToken(): Promise<string | null> {
    try {
        const config = getFirebaseConfig();
        console.log('[FCM] Config OK');

        if (!config.apiKey || !config.projectId || !config.messagingSenderId) {
            throw new Error('Firebase config incomplete');
        }

        const msg = getFirebaseMessaging();

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            throw new Error('VAPID key missing');
        }
        console.log('[FCM] VAPID OK');

        // Let Firebase handle SW registration at /firebase-cloud-messaging-push-scope
        // DO NOT pass serviceWorkerRegistration — this avoids conflict with next-pwa sw.js
        console.log('[FCM] Calling getToken (Firebase will auto-register its SW)...');
        const token = await getToken(msg, { vapidKey });

        if (!token) {
            throw new Error('Brak tokenu — sprawdź czy powiadomienia nie są zablokowane');
        }

        console.log('[FCM] ✅ Token:', token.substring(0, 20) + '...');
        return token;
    } catch (err: any) {
        console.error('[FCM] ❌ Error:', err);
        throw new Error(err?.message || 'Nieznany błąd Firebase');
    }
}

/**
 * Listen for foreground messages and show a browser notification.
 * Uses ServiceWorker showNotification when available (supports data for click navigation).
 * Falls back to Notification API with onclick handler.
 */
export function listenForForegroundMessages(callback?: (payload: any) => void): () => void {
    const msg = getFirebaseMessaging();
    return onMessage(msg, async (payload) => {
        console.log('[FCM] Foreground message:', payload);

        const title = payload.notification?.title || payload.data?.title || 'Mikrostomart';
        const body = payload.notification?.body || payload.data?.body || '';
        const data = payload.data || {};

        if (title && Notification.permission === 'granted') {
            // Try SW showNotification first — supports data property for notificationclick
            try {
                const swReg = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
                if (swReg) {
                    await swReg.showNotification(title, {
                        body,
                        icon: data.icon || '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: data.tag || 'mikrostomart-fg',
                        data: {
                            url: data.url || '/',
                            title,
                            body,
                        },
                    });
                } else {
                    // Fallback: Notification API with onclick
                    const notif = new Notification(title, {
                        body,
                        icon: '/icon-192x192.png',
                        tag: data.tag || 'mikrostomart-fg',
                    });
                    if (data.url) {
                        notif.onclick = () => {
                            window.focus();
                            window.location.href = data.url;
                        };
                    }
                }
            } catch {
                // Final fallback
                new Notification(title, {
                    body,
                    icon: '/icon-192x192.png',
                    tag: data.tag || 'mikrostomart-fg',
                });
            }
        }

        if (title) {
            window.dispatchEvent(new CustomEvent('push-notification-received', {
                detail: { title, body, url: data.url, time: Date.now() }
            }));
        }

        callback?.(payload);
    });
}
