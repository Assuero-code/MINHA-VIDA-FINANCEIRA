// Service Worker - Minha Vida Financeira (funciona 100% offline)
const CACHE = 'mvf-cache-v3';

const LOCAL = ['./', './index.html', './manifest.json'];

const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Arquivos locais
    await Promise.all(LOCAL.map(u => cache.add(u).catch(() => {})));
    // Bibliotecas externas (resposta opaca também pode ser guardada)
    await Promise.all(CDN.map(async (u) => {
      try {
        const res = await fetch(u, { mode: 'no-cors' });
        await cache.put(u, res);
      } catch (e) { /* sem internet agora: tenta de novo na navegação */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Nunca interceptar a API de cotações (precisa de internet de verdade)
  if (url.hostname.includes('alphavantage.co')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: false }) ||
                   (req.mode === 'navigate' ? await cache.match('./index.html') : null);

    const network = fetch(req).then(res => {
      // guarda cópia atualizada (inclui respostas opacas de CDN)
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    // Cache primeiro (rápido e offline); atualiza em segundo plano
    if (cached) { event.waitUntil(network); return cached; }

    const res = await network;
    if (res) return res;
    return new Response('', { status: 504, statusText: 'Offline' });
  })());
});
