/* XPA · Inspeções — service worker (funcionamento offline)
   Para publicar uma nova versão do app, altere o número em VERSION. */
const VERSION = 'xpa-inspecoes-v2';

const LOCAL = [
  './',
  './index.html',
  './mod-termo.js',
  './mod-checklist.js',
  './mod-se.js',
  './mod-gerador.js',
  './mod-motores.js',
  './mod-spda.js',
  './mod-nr10.js',
  './mod-visita.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isLocal = url.origin === self.location.origin;
  const isCdn = CDN.includes(req.url);
  if (!isLocal && !isCdn) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await c.match(key, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(r => {
      if (r && r.ok) c.put(key, r.clone());
      return r;
    }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    const r = await net;
    return r || new Response('Sem conexão e sem cópia salva deste arquivo.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
