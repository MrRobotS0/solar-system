// Hélios — service worker
// • HTML (navegação): network-first → a versão nova aparece já no 1º carregamento, com offline garantido
// • restante (three.js, fontes, texturas, ícones): cache-first com preenchimento em segundo plano
const CACHE = 'helios-v2';
const LOCAL = ['./', './index.html', './versao-2d.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('api.nasa.gov')) return; // dados vivos: sempre rede

  // navegação (o próprio documento): rede primeiro, cache como rede de segurança
  const isNav = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // demais recursos: cache primeiro, atualizando em segundo plano
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
