/* 好奇心ジグソーパズル — Service Worker
   ・HTMLは「ネット優先」（更新がすぐ反映され、古い版で固まらない）
   ・画像などはキャッシュ優先（オフラインでも速く表示）           */
const VERSION = 'v1';
const CACHE = 'kids-puzzle-' + VERSION;

// 起動に必要な最小セット＋軽いサムネイル（メニューがすぐオフライン対応に）
const CORE = ['.', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
for (let i = 1; i <= 50; i++) {
  CORE.push('assets/thumbs/jigsaw-' + String(i).padStart(2, '0') + '.jpg');
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 1枚くらい失敗してもインストールは止めない
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  const isDoc = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isDoc) {
    // HTML：ネット優先 → だめならキャッシュ
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
  } else {
    // 画像など：キャッシュ優先 → なければ取得してキャッシュ
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit))
    );
  }
});
