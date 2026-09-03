const CACHE_NAME = 'financas-v3-ultra';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/lucide@0.344.0/dist/lucide.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// Instalação: Força o cache de todos os arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map(url => {
          return fetch(url).then(response => {
            if (response.ok) return cache.put(url, response);
            throw new Error(`Falha ao baixar: ${url}`);
          }).catch(err => console.log('Erro no cache inicial:', err));
        })
      );
    })
  );
  self.skipWaiting();
});

// Ativação: Remove caches antigos imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

// Estratégia Cache-First: Se está no cache, usa. Não pergunta à internet.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      // Se não estiver no cache, tenta buscar na rede e salvar para a próxima vez
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && event.request.method === 'GET') {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // Se der erro de rede e não tiver cache, o app não abre (comportamento esperado offline)
      });
    })
  );
});