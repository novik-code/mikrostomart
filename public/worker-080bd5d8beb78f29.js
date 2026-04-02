// This service worker was replaced by Firebase Cloud Messaging.
// It self-unregisters to clean up from the old VAPID push system.
self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function () {
    self.registration.unregister();
});