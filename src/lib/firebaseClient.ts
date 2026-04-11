/**
 * Firebase Client SDK — browser-side messaging token management.
 *
 * ARCHITECTURE: This project uses @ducanh2912/next-pwa which generates sw.js
 * with Workbox. That SW is auto-registered at scope "/" and handles push/notificationclick
 * via push-sw.js. We MUST use that existing SW registration for getToken() — registering
 * a separate firebase-messaging-sw.js would conflict and cause hangs.
 *
 * Environment variables (public — exposed to client):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY   (FCM VAPID key from Firebase Console → Cloud Messaging)
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
 * Uses the existing next-pwa service worker (sw.js) — NOT a separate Firebase SW.
 */
export async function requestFCMToken(): Promise<string | null> {
    try {
        // Step A: Check config
        const config = getFirebaseConfig();
        console.log('[FCM] Step A: Config check');

        if (!config.apiKey || !config.projectId || !config.messagingSenderId) {
            throw new Error('Firebase config incomplete — check NEXT_PUBLIC_ env vars');
        }

        // Step B: Get messaging instance
        console.log('[FCM] Step B: Getting messaging');
        const msg = getFirebaseMessaging();

        // Step C: Check VAPID key
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            throw new Error('VAPID key missing');
        }
        console.log('[FCM] Step C: VAPID OK');

        // Step D: Get the EXISTING service worker registration (from next-pwa sw.js)
        // DO NOT register a new SW — next-pwa already registers sw.js at scope "/"
        // Registering firebase-messaging-sw.js would conflict and cause hangs.
        console.log('[FCM] Step D: Getting existing SW registration...');

        let swRegistration: ServiceWorkerRegistration | undefined;

        // Wait for the next-pwa SW to be ready (with timeout)
        try {
            swRegistration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<ServiceWorkerRegistration>((_, reject) =>
                    setTimeout(() => reject(new Error('SW ready timeout')), 10000)
                ),
            ]);
            console.log('[FCM] Step D: Got SW registration, scope:', swRegistration.scope);
        } catch (readyErr) {
            // Fallback: try to get any existing registration
            console.log('[FCM] Step D: ready timed out, trying getRegistrations...');
            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length > 0) {
                swRegistration = regs[0];
                console.log('[FCM] Step D: Using first registration, scope:', swRegistration.scope);
            }
        }

        // Step E: Get token
        console.log('[FCM] Step E: Requesting token...');
        const tokenOptions: any = { vapidKey };
        if (swRegistration) {
            tokenOptions.serviceWorkerRegistration = swRegistration;
        }

        const token = await getToken(msg, tokenOptions);

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
 */
export function listenForForegroundMessages(callback?: (payload: any) => void): () => void {
    const msg = getFirebaseMessaging();
    return onMessage(msg, (payload) => {
        console.log('[FCM] Foreground message:', payload);

        const title = payload.notification?.title || payload.data?.title;
        const body = payload.notification?.body || payload.data?.body;
        const data = payload.data || {};

        if (title && Notification.permission === 'granted') {
            new Notification(title, {
                body: body || '',
                icon: '/icon-192x192.png',
                tag: data.tag || 'mikrostomart-fg',
            });
        }

        // Dispatch event for popup in patient zone layout
        if (title) {
            window.dispatchEvent(new CustomEvent('push-notification-received', {
                detail: { title, body, url: data.url, time: Date.now() }
            }));
        }

        callback?.(payload);
    });
}
