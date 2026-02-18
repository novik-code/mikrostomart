// @ts-nocheck
// Push notification handlers — merged into main Workbox SW by @ducanh2912/next-pwa
// This file is automatically compiled and injected into sw.js

self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body || '',
            icon: data.icon || '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: data.tag || 'mikrostomart-notification',
            data: {
                url: data.url || '/',
            },
            vibrate: [200, 100, 200],
            requireInteraction: data.requireInteraction || false,
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Mikrostomart', options)
        );
    } catch (e) {
        console.error('[SW Push] Failed to parse push data:', e);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus existing tab if one is open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window/tab
            return self.clients.openWindow(url);
        })
    );
});
