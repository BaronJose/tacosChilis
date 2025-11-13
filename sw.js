// Service Worker for Tacos Chilis Menu
// Caches menu data and assets for offline viewing

const CACHE_NAME = 'tacos-chilis-menu-v1';
const STATIC_CACHE_NAME = 'tacos-chilis-static-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/main.js',
    '/img/logo.jpeg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
        }).catch((error) => {
            console.error('[Service Worker] Cache install failed:', error);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches that don't match current version
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all pages immediately
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests (except Google Sheets CSV and images)
    if (url.origin !== self.location.origin) {
        // Allow Google Sheets CSV to be cached
        if (url.hostname.includes('docs.google.com') && url.pathname.includes('/pub')) {
            // Use custom handler for CSV that strips cacheBust for cache lookup
            event.respondWith(handleCSVRequest(request, CACHE_NAME));
            return;
        }
        // Allow image caching from same domain or CDN
        if (request.destination === 'image') {
            event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
            return;
        }
        // For other cross-origin requests, just fetch normally
        return;
    }

    // Handle same-origin requests
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
});

/**
 * Handle CSV requests with stale-while-revalidate strategy
 * Serves cached data immediately, then updates cache in background
 * This ensures users see content fast while always checking for updates
 */
async function handleCSVRequest(request, cacheName) {
    const url = new URL(request.url);
    const baseUrl = url.href.split('&cacheBust=')[0];
    const cacheKey = new Request(baseUrl);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(cacheKey);
    
    // Always try to fetch fresh data in the background
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            // Update cache with fresh data
            const responseToCache = networkResponse.clone();
            cache.put(cacheKey, responseToCache).then(() => {
                console.log('[Service Worker] CSV cache updated');
                // Notify all clients that CSV was updated
                self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'CSV_UPDATED',
                            timestamp: Date.now()
                        });
                    });
                });
            }).catch((error) => {
                console.warn('[Service Worker] Failed to update CSV cache:', error);
            });
        }
        return networkResponse;
    }).catch((error) => {
        console.warn('[Service Worker] Background CSV fetch failed:', error);
        // Don't throw - we'll use cached version if available
    });
    
    // If we have cached data, return it immediately (stale-while-revalidate)
    if (cachedResponse) {
        console.log('[Service Worker] Serving CSV from cache, updating in background');
        // Don't wait for fetch - return cached immediately
        // The fetch will update cache for next time
        return cachedResponse;
    }
    
    // No cache available, wait for network response
    try {
        return await fetchPromise;
    } catch (error) {
        console.error('[Service Worker] CSV fetch failed and no cache available:', error);
        throw error;
    }
}

/**
 * Cache-first strategy: try cache, fallback to network
 * @param {Request} request - The request to handle
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>}
 */
async function cacheFirstStrategy(request, cacheName) {
    try {
        // Try cache first
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('[Service Worker] Fetching from network:', request.url);
        const networkResponse = await fetch(request);

        // Cache successful responses (but not errors)
        if (networkResponse && networkResponse.status === 200) {
            // Clone the response because it can only be consumed once
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache).catch((error) => {
                console.warn('[Service Worker] Failed to cache:', request.url, error);
            });
        }

        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', request.url, error);
        
        // If it's a navigation request and we're offline, return cached index.html
        if (request.mode === 'navigate') {
            const cache = await caches.open(STATIC_CACHE_NAME);
            const cachedIndex = await cache.match('/index.html');
            if (cachedIndex) {
                return cachedIndex;
            }
        }
        
        // Return a basic offline page or error
        return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// Message handler for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_CSV') {
        const { url } = event.data;
        if (url) {
            // Remove cacheBust parameter for consistent caching
            const baseUrl = url.split('&cacheBust=')[0];
            const cacheKey = new Request(baseUrl);
            
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(url).then((response) => {
                    if (response.ok) {
                        // Cache with base URL (without cacheBust) for consistent lookups
                        return cache.put(cacheKey, response.clone());
                    }
                });
            }).catch((error) => {
                console.error('[Service Worker] Failed to cache CSV:', error);
            });
        }
    }
});

