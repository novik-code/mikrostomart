/**
 * Firebase Client SDK — browser-side messaging token management.
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
 * This also registers the Firebase service worker.
 */
export async function requestFCMToken(): Promise<string | null> {
    try {
        // Step A: Check config
        const config = getFirebaseConfig();
        console.log('[FCM] Config check:', {
            apiKey: config.apiKey ? '✅ set' : '❌ missing',
            projectId: config.projectId || '❌ missing',
            messagingSenderId: config.messagingSenderId || '❌ missing',
            appId: config.appId || '❌ missing',
        });

        if (!config.apiKey || !config.projectId || !config.messagingSenderId) {
            throw new Error('Firebase config incomplete — check NEXT_PUBLIC_ env vars in Vercel');
        }

        // Step B: Get messaging instance
        console.log('[FCM] Step B: Getting messaging instance...');
        const msg = getFirebaseMessaging();

        // Step C: Check VAPID key
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        console.log('[FCM] VAPID key:', vapidKey ? `✅ set (${vapidKey.substring(0, 10)}...)` : '❌ MISSING');
        if (!vapidKey) {
            throw new Error('VAPID key missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel');
        }

        // Step D: Register service worker (force update to latest version)
        console.log('[FCM] Step D: Registering service worker...');
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            updateViaCache: 'none',
        });
        console.log('[FCM] SW registered:', swRegistration.scope);

        // If SW is installing/waiting, wait a moment for it to activate
        if (!swRegistration.active) {
            console.log('[FCM] Waiting for SW to activate...');
            await new Promise<void>((resolve) => {
                const sw = swRegistration.installing || swRegistration.waiting;
                if (!sw) { resolve(); return; }
                const onStateChange = () => {
                    if (sw.state === 'activated' || sw.state === 'redundant') {
                        sw.removeEventListener('statechange', onStateChange);
                        resolve();
                    }
                };
                sw.addEventListener('statechange', onStateChange);
                // Safety timeout - don't wait forever
                setTimeout(resolve, 5000);
            });
            console.log('[FCM] SW activation complete');
        }

        // Step E: Get token
        console.log('[FCM] Step E: Requesting token...');
        const token = await getToken(msg, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
        });

        if (!token) {
            console.warn('[FCM] No token returned — notifications may be blocked');
            throw new Error('Brak tokenu — upewnij się, że powiadomienia nie są zablokowane w przeglądarce');
        }

        console.log('[FCM] ✅ Token obtained:', token.substring(0, 20) + '...');
        return token;
    } catch (err: any) {
        console.error('[FCM] ❌ Failed to get token:', err);
        // Re-throw with a meaningful message for the UI
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
