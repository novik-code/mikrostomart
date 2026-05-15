/// <reference lib="WebWorker" />
// S6-5 (2026-05-15): Serwist service worker — replaces auto-generated sw.js
// from @ducanh2912/next-pwa. This file is the explicit source for /public/sw.js
// (compiled by @serwist/next at build time via withSerwist({ swSrc: 'src/app/sw.ts' })).
//
// The triple-slash reference above pulls in WebWorker types (ServiceWorkerGlobalScope,
// WindowClient, etc.) without polluting the project-wide tsconfig.json lib setting.
//
// Combines what was previously in:
// - next.config.ts → workboxOptions (skipWaiting, clientsClaim, runtimeCaching, importScripts)
// - worker/index.ts (push + notificationclick handlers, auto-merged by old next-pwa)
//
// Coexistence with other service workers:
// - /firebase-messaging-sw.js → separate scope (/firebase-cloud-messaging-push-scope)
//   handles FCM background messages. Untouched.
// - /push-sw.js → imported via self.importScripts() below for pushsubscriptionchange
//   handler (browser push endpoint rotation). Same SW context — extends our handlers.

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist, ExpirationPlugin } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

// Import supplementary push handlers (pushsubscriptionchange — endpoint rotation).
// Equivalent to old workboxOptions.importScripts: ['/push-sw.js'].
// MUST be top-level (before any await) per service worker spec.
self.importScripts('/push-sw.js');

// Custom runtime caching strategies — preserved 1:1 from old workboxOptions.runtimeCaching.
// The default Serwist cache (defaultCache) handles standard precaching + image/asset
// strategies; we PREPEND custom rules so they match before defaults.
const customRuntimeCaching: RuntimeCaching[] = [
    // Auth API routes: always go to network, never cache.
    {
        matcher: /^https?:\/\/.*\/api\/auth\/.*/i,
        handler: new NetworkOnly(),
    },
    // Supabase auth endpoints: never cache.
    {
        matcher: /^https?:\/\/.*supabase.*\/auth\/.*/i,
        handler: new NetworkOnly(),
    },
    // Login/pracownik/admin page navigations: network first with short timeout,
    // 1-minute cache for failover. Equivalent to old NetworkFirst rule with
    // expiration: { maxEntries: 16, maxAgeSeconds: 60 }, networkTimeoutSeconds: 5.
    {
        matcher: /^https?:\/\/.*\/(pracownik|admin)(\/.*)?$/i,
        handler: new NetworkFirst({
            cacheName: "staff-pages",
            networkTimeoutSeconds: 5,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 16,
                    maxAgeSeconds: 60,
                }),
            ],
        }),
    },
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [...customRuntimeCaching, ...defaultCache],
});

serwist.addEventListeners();

// Push notification handler — moved from old worker/index.ts.
// Handles incoming push events from web-push (subscribe via PushManager).
// Note: FCM background messages go to firebase-messaging-sw.js (separate scope),
// NOT this handler.
self.addEventListener("push", function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options: NotificationOptions = {
            body: data.body || "",
            icon: data.icon || "/icon-192x192.png",
            badge: "/icon-192x192.png",
            tag: data.tag || "mikrostomart-notification",
            data: {
                url: data.url || "/",
            },
            // @ts-expect-error: vibrate is supported but missing from TS NotificationOptions
            vibrate: [200, 100, 200],
            requireInteraction: data.requireInteraction || false,
        };

        event.waitUntil(
            self.registration.showNotification(data.title || "Mikrostomart", options),
        );
    } catch (e) {
        console.error("[SW Push] Failed to parse push data:", e);
    }
});

// Notification click handler — moved from old worker/index.ts.
// Focus existing tab if open, otherwise open new window/tab to data.url.
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = (event.notification.data?.url as string) || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    (client as WindowClient).navigate(url);
                    return (client as WindowClient).focus();
                }
            }
            return self.clients.openWindow(url);
        }),
    );
});
