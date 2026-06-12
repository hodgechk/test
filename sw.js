// Service Worker — 快取所有資源，讓 App 離線也能使用
const CACHE_NAME = 'flashcard-v2';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './questions.js',
  './manifest.json',
  './icon-512.png'
];

// 安裝時快取所有檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 啟動時清除舊快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 攔截網路請求：優先用快取，失敗才走網路
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
