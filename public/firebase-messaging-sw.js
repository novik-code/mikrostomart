// Firebase Messaging Service Worker — v2
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

// Handle background messages
// With notification+data messages, FCM auto-shows the notification.
// This handler is called AFTER display — we just log for debugging.
// Click handling is done via the 'notificationclick' event below.
messaging.onBackgroundMessage(function (payload) {
    console.log('[FCM SW v2] Background message received:', JSON.stringify(payload));
    // FCM already displayed the notification via the 'notification' key.
    // No need to call showNotification — that would create a duplicate.
});

// Handle notification clicks — navigate to the URL from FCM data
self.addEventListener('notificationclick', function (event) {
    console.log('[FCM SW v2] Notification clicked:', event.notification);
    event.notification.close();

    // FCM puts the link in fcmOptions.link or we fall back to data.url
    const data = event.notification.data || {};
    const fcmData = data.FCM_MSG?.data || {};
    const url = fcmData.url || data.url || event.notification.data?.link || '/strefa-pacjenta/dashboard';
    
    // Encode push content in URL params for the popup
    const pushTitle = fcmData.title || event.notification.title || '';
    const pushBody = fcmData.body || event.notification.body || '';
    const separator = url.includes('?') ? '&' : '?';
    const targetUrl = `${url}${separator}pushTitle=${encodeURIComponent(pushTitle)}&pushBody=${encodeURIComponent(pushBody)}&pushTime=${Date.now()}`;

    console.log('[FCM SW v2] Navigating to:', targetUrl);

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Try to focus an existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Open new window
            return self.clients.openWindow(targetUrl);
        })
    );
});
