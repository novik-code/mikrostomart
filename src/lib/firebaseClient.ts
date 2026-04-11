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

        // Step D: Register service worker
        console.log('[FCM] Step D: Registering SW...');
        let swRegistration: ServiceWorkerRegistration;

        try {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[FCM] Step D: SW registered, scope:', swRegistration.scope);
        } catch (regErr: any) {
            throw new Error(`SW registration failed: ${regErr?.message}`);
        }

        // Step D2: Wait for SW to be active — critical for getToken()
        // getToken() internally needs an active SW for PushManager.subscribe()
        console.log('[FCM] Step D2: Ensuring SW active...');
        const activeState = swRegistration.active?.state;
        console.log('[FCM] SW state:', activeState || 'no active SW', 
            'installing:', !!swRegistration.installing, 
            'waiting:', !!swRegistration.waiting);

        if (!swRegistration.active || swRegistration.active.state !== 'activated') {
            // SW is not yet active — wait for activation
            await new Promise<void>((resolve) => {
                const checkSW = swRegistration.installing || swRegistration.waiting || swRegistration.active;
                if (!checkSW) {
                    console.log('[FCM] No SW at all, resolving anyway');
                    resolve();
                    return;
                }
                if (checkSW.state === 'activated') {
                    resolve();
                    return;
                }

                const onStateChange = () => {
                    console.log('[FCM] SW state changed to:', checkSW.state);
                    if (checkSW.state === 'activated') {
                        checkSW.removeEventListener('statechange', onStateChange);
                        resolve();
                    }
                    if (checkSW.state === 'redundant') {
                        checkSW.removeEventListener('statechange', onStateChange);
                        resolve(); // resolve anyway, getToken might still work
                    }
                };
                checkSW.addEventListener('statechange', onStateChange);
                // Safety: don't wait forever
                setTimeout(() => {
                    console.log('[FCM] SW activation timeout - proceeding anyway');
                    resolve();
                }, 8000);
            });
        }
        console.log('[FCM] Step D2: SW active state:', swRegistration.active?.state);

        // Step E: Get token — this is where the actual FCM subscription happens
        console.log('[FCM] Step E: Requesting token...');
        const token = await getToken(msg, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
        });

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
