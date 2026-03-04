const CACHE_NAME = 'talkie-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './manifest.json'
];

// Installation : on met les fichiers en cache pour que l'app soit rapide
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Intercepter les requêtes pour servir le cache si on est hors-ligne
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
