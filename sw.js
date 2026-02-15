// Service Worker — cache-first for app shell, network-first for map tiles
const CACHE_NAME = 'tokyo-trip-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/leaflet-override.css',
  './js/app.js',
  './js/db.js',
  './js/utils/date.js',
  './js/utils/geo.js',
  './js/components/NavBar.js',
  './js/components/ActivityCard.js',
  './js/components/ActivityModal.js',
  './js/components/ItineraryView.js',
  './js/components/WishlistView.js',
  './js/components/NearbyView.js',
  './js/components/DontMissView.js',
  './js/components/ProfileView.js',
  './data/attractions.json',
  './data/restaurants.json',
  './data/mt-fuji.json',
  './data/neighborhoods.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

const CDN_URLS = [
  'https://unpkg.com/vue@3/dist/vue.global.prod.js',
  'https://unpkg.com/dexie@3/dist/dexie.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/sortablejs@1.15.0/Sortable.min.js'
];

// Install: cache app shell + CDN dependencies
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([...APP_SHELL, ...CDN_URLS]);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Map tiles: network-first, don't cache (too many)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful responses for CDN resources
        if (response.ok && (url.hostname === 'unpkg.com')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
