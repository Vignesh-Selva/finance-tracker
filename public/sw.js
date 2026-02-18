const CACHE_NAME = 'personal-finance-cache-v2';

const urlsToCache = [
    './index.html',
    './styles/main.css',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    '../src/index.js',
    '../src/core/appShell.js',
    '../src/ui/features/dashboard.js',
    '../src/ui/features/expenses.js',
    '../src/ui/features/savings.js',
    '../src/ui/features/fixedDeposits.js',
    '../src/ui/features/mutualFunds.js',
    '../src/ui/features/stocks.js',
    '../src/ui/features/crypto.js',
    '../src/ui/features/liabilities.js',
    '../src/ui/forms/formHandler.js',
    '../src/utils/utils.js',
    '../src/utils/formatUtils.js',
    '../src/utils/financeUtils.js',
    '../src/utils/sanitizeUtils.js',
    '../src/utils/dataUtils.js',
    '../src/utils/initialData.js',
    '../src/services/calculator.js',
    '../src/data/dbManager.js',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
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
});