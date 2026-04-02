// Firebase Messaging Service Worker
// Handles background push notifications via FCM.
// This file MUST be at the root (/firebase-messaging-sw.js) for Firebase to find it.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config — these values are public (safe to hardcode in SW).
// They will be updated during deployment with actual values.
firebase.initializeApp({
    apiKey: '__FIREBASE_API_KEY__',
    authDomain: '__FIREBASE_AUTH_DOMAIN__',
    projectId: '__FIREBASE_PROJECT_ID__',
    messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
    appId: '__FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// Handle background messages (when the app is not in foreground)
messaging.onBackgroundMessage(function (payload) {
    console.log('[FCM SW] Background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Mikrostomart';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.data?.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: payload.data?.tag || 'mikrostomart-notification',
        data: {
            url: payload.data?.url || '/',
        },
        vibrate: [200, 100, 200],
        requireInteraction: payload.data?.requireInteraction === 'true',
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks — navigate to the URL specified in the notification data
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});
