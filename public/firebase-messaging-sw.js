// Firebase Messaging Service Worker
// Handles background push notifications via FCM.
// This file MUST be at the root (/firebase-messaging-sw.js) for Firebase to find it.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// CRITICAL: Skip waiting and claim clients immediately.
// Without this, the SW stays in "waiting" state after install and never
// activates until ALL tabs/PWA windows are closed. Firebase's getToken()
// needs an ACTIVE SW — without skipWaiting it hangs forever.
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) { event.waitUntil(self.clients.claim()); });

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
messaging.onBackgroundMessage(function (payload) {
    console.log('[FCM SW] Background message:', payload);

    // Read from both notification and data keys
    const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'Mikrostomart';
    const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';
    var dataObj = payload.data || {};

    var notificationOptions = {
        body: body,
        icon: dataObj.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: dataObj.tag || 'mikrostomart-notification',
        data: {
            url: dataObj.url || '/',
            title: title,
            body: body,
        },
        vibrate: [200, 100, 200],
    };

    // Only show if FCM didn't auto-show (data-only messages)
    if (!payload.notification) {
        return self.registration.showNotification(title, notificationOptions);
    }
});

// Handle notification clicks — navigate to the URL specified in the notification data
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    var notifData = event.notification.data || {};
    var url = notifData.url || '/';

    // Build absolute URL
    var baseUrl = self.location.origin;
    var absoluteUrl = url.startsWith('http') ? url : baseUrl + url;

    // Append push context params
    var pushTitle = notifData.title || event.notification.title || '';
    var pushBody = notifData.body || event.notification.body || '';
    var sep = absoluteUrl.indexOf('?') >= 0 ? '&' : '?';
    var targetUrl = absoluteUrl + sep + 'pushTitle=' + encodeURIComponent(pushTitle) + '&pushBody=' + encodeURIComponent(pushBody) + '&pushTime=' + Date.now();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Try to find an existing window and navigate it
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.indexOf(baseUrl) >= 0 && 'navigate' in client) {
                    // client.navigate() works when this SW controls the client.
                    // For uncontrolled clients (different scope), it may fail — catch and fallback.
                    try {
                        return client.navigate(targetUrl).then(function(c) {
                            if (c) return c.focus();
                            return self.clients.openWindow(targetUrl);
                        }).catch(function() {
                            return self.clients.openWindow(targetUrl);
                        });
                    } catch (e) {
                        // Synchronous error — fallback
                        return self.clients.openWindow(targetUrl);
                    }
                }
            }
            // No existing window — open new
            return self.clients.openWindow(targetUrl);
        })
    );
});
