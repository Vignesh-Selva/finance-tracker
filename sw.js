const CACHE_NAME = 'personal-finance-cache-v4';
const SYNC_TAG = 'finance-sync';

// Derive URLs relative to the service worker scope so it works on GitHub Pages or sub-path hosting.
const ASSET_PATHS = [
    './',
    './index.html',
    './styles/main.css',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './src/main.js',
    './src/firebase.js',
    './src/auth.js',
    './src/crypto.js',
    './src/sync.js',
    './src/indexeddb.js',
    './src/core/appShell.js',
    './src/ui/features/dashboard.js',
    './src/ui/features/expenses.js',
    './src/ui/features/savings.js',
    './src/ui/features/fixedDeposits.js',
    './src/ui/features/mutualFunds.js',
    './src/ui/features/stocks.js',
    './src/ui/features/crypto.js',
    './src/ui/features/liabilities.js',
    './src/ui/features/budgets.js',
    './src/ui/forms/formHandler.js',
    './src/utils/utils.js',
    './src/utils/formatUtils.js',
    './src/utils/financeUtils.js',
    './src/utils/sanitizeUtils.js',
    './src/utils/dataUtils.js',
    './src/utils/initialData.js',
    './src/services/calculator.js',
    './src/data/dbManager.js',
];

const STATIC_ASSETS = ASSET_PATHS.map(asset => new URL(asset, self.registration.scope).href);
const STATIC_ASSET_SET = new Set(STATIC_ASSETS);

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const { request } = event;

    // For navigation/page requests, use cache-first then network fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(new URL('./index.html', self.registration.scope).href).then(cached => {
                return cached || fetch(request);
            })
        );
        return;
    }

    // For static assets, serve from cache, then update cache from network.
    const requestHref = new URL(request.url).href;
    if (STATIC_ASSET_SET.has(requestHref)) {
        event.respondWith(
            caches.match(request).then(cached => {
                const networkFetch = fetch(request)
                    .then(response => {
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                        }
                        return response;
                    })
                    .catch(() => cached);

                return cached || networkFetch;
            })
        );
        return;
    }

    // Default: network-first with cache fallback for other GET requests.
    if (request.method === 'GET') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
    );
    self.clients.claim();
});

// Background Sync: ask clients to run sync logic when connectivity returns.
self.addEventListener('sync', event => {
    if (event.tag === SYNC_TAG) {
        event.waitUntil(
            self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
                clients.forEach(client => client.postMessage({ type: 'trigger-sync' }));
            })
        );
    }
});