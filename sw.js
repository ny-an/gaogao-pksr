// sw.js

// キャッシュバージョンの設定（更新するたびに変更）
importScripts('/gaogao-pksr/js/cache-config.js');

// キャッシュしたいリソースのリスト
const urlsToCache = [
  '/gaogao-pksr/',
  '/gaogao-pksr/index.html',
  '/gaogao-pksr/js/common.js',
  '/gaogao-pksr/js/app.js',
  // 他にも必要なリソースをリストに追加
];

// インストールイベント
self.addEventListener('install', (event) => {
  // キャッシュのインストールとリソースの保存
  event.waitUntil(
    caches.open(CACHE_VER).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティベートイベント - 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_VER) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// フェッチイベント - キャッシュまたはネットワークからリソースを取得
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュが見つかればそれを返し、なければネットワークから取得
      return response || fetch(event.request);
    })
  );
});
