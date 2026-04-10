// Firebase Messaging Service Worker
// Handles background push notifications via FCM.
// This file MUST be at the root (/firebase-messaging-sw.js) for Firebase to find it.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config — these values are public (safe to hardcode in SW).
firebase.initializeApp({
    apiKey: 'AIzaSyDZUDCx7UBjY48xduhOX3BhS3pdlFoW1i4',
    authDomain: 'mikrostomart-13bf8.firebaseapp.com',
    projectId: 'mikrostomart-13bf8',
    messagingSenderId: '621550915975',
    appId: '1:621550915975:web:c70681465a502042050322',
});

const messaging = firebase.messaging();

// Handle background messages (when the app is not in foreground)
// We use data-only messages (no 'notification' key) so the SDK does NOT
// auto-show a notification. This handler is the SOLE display mechanism.
messaging.onBackgroundMessage(function (payload) {
    console.log('[FCM SW] Background message:', payload);

    const data = payload.data || {};
    const notificationTitle = data.title || 'Mikrostomart';
    const notificationOptions = {
        body: data.body || '',
        icon: data.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: data.tag || 'mikrostomart-notification',
        data: {
            url: data.url || '/',
        },
        vibrate: [200, 100, 200],
        requireInteraction: data.requireInteraction === 'true',
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
