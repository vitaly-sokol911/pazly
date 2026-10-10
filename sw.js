const CACHE = 'puzzle-cache-v9';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './puzzle.js',
  './storage.js',
  './themes.js',
  './manifest.json',
  './icon-256.png',
  './icon-180.png',
  './og.jpg'
];

self.importScripts('./themes.js');
// Все фото уже лежат локально в images/ — кэшируем их вместе с приложением,
// сетевые запросы во время установки не нужны (раньше это и вызывало тормоза).
const IMAGE_PATHS = THEMES.flatMap((t) => t.images).filter((u) => u.startsWith('images/'));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.concat(IMAGE_PATHS))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Картинки не меняются — берём из кэша (быстро, работает offline).
// Код игры (html/js/css) — сначала из сети, чтобы правки доходили сразу же,
// а без интернета подхватывается сохранённая копия.
function isCode(url) {
  return /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isCode(url)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
