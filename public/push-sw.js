// Push notification service worker
// Separate from Workbox sw.js — handles push events only

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
        console.error('[PushSW] Failed to parse push data:', e);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus existing tab if one is open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window/tab
            return clients.openWindow(url);
        })
    );
});
