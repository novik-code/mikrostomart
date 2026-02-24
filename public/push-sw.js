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
            renotify: true, // Always show even if same tag — don't silently replace
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

/**
 * pushsubscriptionchange — fires when the browser rotates/expires a push endpoint.
 * Re-subscribes automatically and POSTs the new subscription to the server.
 * NOTE: iOS Safari does NOT support this event (as of iOS 17) — the client-side
 * renewal in PushNotificationPrompt.tsx handles iOS recovery instead.
 */
self.addEventListener('pushsubscriptionchange', function (event) {
    console.log('[PushSW] pushsubscriptionchange — re-subscribing...');

    event.waitUntil(
        (async () => {
            try {
                // Re-subscribe with the same VAPID options as the old subscription
                const options = event.oldSubscription
                    ? event.oldSubscription.options
                    : { userVisibleOnly: true };

                const newSub = await self.registration.pushManager.subscribe(options);
                console.log('[PushSW] Re-subscribed:', newSub.endpoint.substring(0, 60));

                // POST to server — no auth needed since this is called by the SW
                // The server upserts on endpoint conflict so this is idempotent
                await fetch('/api/push/resubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: newSub.toJSON() }),
                });
            } catch (err) {
                console.error('[PushSW] Re-subscribe failed:', err);
            }
        })()
    );
});
