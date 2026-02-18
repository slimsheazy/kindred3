
const CACHE_NAME = 'kindred-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache POST/PUT/DELETE
  if (request.method !== 'GET') return;

  // Don't cache Supabase/Gemini API calls directly in the static cache
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') return caches.match('/index.html');
          return cached;
        });

      return cached || networked;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-kindred-data') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_FLUSH_REQUIRED' }));
      })
    );
  }
});
