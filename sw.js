// sw.js

// キャッシュバージョンの設定（更新するたびに変更）
importScripts('/gaogao-pksr/js/cache-config.js');

// 拡張子による画像判定用の正規表現
const IMAGE_REGEX = /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i;

// キャッシュしたいリソースのリスト
const urlsToCache = [
  // '/gaogao-pksr/',
  // '/gaogao-pksr/index.html',
  // '/gaogao-pksr/calendar.html',
  // '/gaogao-pksr/stock.html',
  // '/gaogao-pksr/js/common.js',
  // '/gaogao-pksr/js/app.js',
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
  const requestUrl = event.request.url;

  if (IMAGE_REGEX.test(requestUrl)) {
    // 画像リクエストの場合：キャッシュファースト
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((networkResponse) => {
          // ネットワークから取得した画像をキャッシュに保存して返す
          return caches.open(CACHE_VER).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // 画像以外は毎回ネットワークからロード（失敗時のみキャッシュ参照）
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

