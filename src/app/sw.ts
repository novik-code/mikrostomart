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

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { opcjeSerwista, PAMIECI_DO_USUNIECIA } from "@/lib/swOpcje";

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

// Reguły cache, precache i ich uzasadnienie: src/lib/swOpcje.ts (wykonywane w teście
// swRegulyApiINigdyZPamieci.test.ts).
const serwist = new Serwist(opcjeSerwista(self.__SW_MANIFEST));

serwist.addEventListeners();

// 2026-09-17: usuń pamięci, których nic już nie używa (odpowiedzi API zapisane przez regułę
// `apis` i `start-url` ze starego next-pwa). Idempotentne — przy każdej aktywacji.
self.addEventListener("activate", (event) => {
    event.waitUntil(Promise.all(PAMIECI_DO_USUNIECIA.map((nazwa) => caches.delete(nazwa))));
});

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
