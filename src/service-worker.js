// Proxy to sw.js for build tools; ensure module resolvers pick it up.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
