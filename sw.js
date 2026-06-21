// Service Worker — 快取所有資源，讓 App 離線也能使用
const CACHE_NAME = 'flashcard-v4';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-512.png',
  './questions/adjective.js',
  './questions/adverb.js',
  './questions/noun.js',
  './questions/noun_2.js',
  './questions/question.js',
  './questions/verb.js'
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

// 攔截網路請求：優先用快取，失敗則走網路並動態快取新單元
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(response => {
        // 動態快取後續可能新增的單元 JS 檔
        if (response && response.status === 200 && event.request.url.includes('/questions/')) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseCopy);
          });
        }
        return response;
      });
    })
  );
});
