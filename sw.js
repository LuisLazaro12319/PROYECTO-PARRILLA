const CACHE_NAME = 'parrilla-cache-v2';
const assets = [
  './',
  './index.html',
  './styles.css',
  './trabajo_interno.js',
  './fondoprincipal.jpg'
];

// Instalar el Service Worker
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

// Hacer que funcione sin conexión
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});