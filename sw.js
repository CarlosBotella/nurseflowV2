const VERSION = 'v18';
const SHELL = `turno-shell-${VERSION}`;
const API = `turno-cima-${VERSION}`;
const OCR = 'turno-ocr-assets-v1';
const PREFIX = 'turno-';
const BASE = new URL('./', self.location.href);
const FILES = ['index.html','manifest.json','styles.css','app.js','db.js','backup-ui.js','backup-data.js','planner-ui.js','holidays-ui.js','holidays-valencia.json','planner-data.js','ucv-catalog.js','calculators.js','clinical-calculators.js','tool-catalog.js','tool-help.js','tools-ui.js','cima.js','api.js','icd.js','case-data.js','cases-ui.js','clinical-reference.js','ocr-ui.js','redaction.js','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
const SHELL_URLS = new Set(FILES.map(file => new URL(file, BASE).href));
const API_LIMIT = 60;

self.addEventListener('install', event => {
  // Do not skipWaiting: an older app may still have unsaved work.
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll([...SHELL_URLS])));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && ![SHELL, API, OCR].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - API_LIMIT))) await cache.delete(key);
}

async function cima(request) {
  const cache = await caches.open(API);
  // MedlinePlus recommends a 12–24 h cache to limit upstream load.
  if (new URL(request.url).pathname === '/medline/search') {
    const stored = await cache.match(request);
    if (stored && Date.now() - Date.parse(stored.headers.get('X-Turno-Fetched-At')) < 12 * 60 * 60 * 1000) {
      const headers = new Headers(stored.headers); headers.set('X-Turno-Offline', '1');
      return new Response(await stored.arrayBuffer(), { status: stored.status, headers });
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.type === 'opaque') throw new Error('Reference unavailable');
    // Preserve explicit errors; never replace 403/429/502 with a stale successful response.
    if (!response.ok) return response;
    const headers = new Headers(response.headers);
    headers.set('X-Turno-Fetched-At', new Date().toISOString());
    const readable = new Response(await response.clone().arrayBuffer(), { status: response.status, headers });
    // A storage failure must not prevent displaying a successful online response.
    try { await cache.put(request, readable.clone()); await trim(cache); } catch {}
    return readable;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-Turno-Offline', '1');
      return new Response(await cached.arrayBuffer(), { status: cached.status, headers });
    }
    return new Response(JSON.stringify({ error: 'No hay una copia local de esta consulta.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  } finally { clearTimeout(timer); }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === 'https://nurseflow-api.carlosb-n.workers.dev' &&
      ['/cima/search','/cima/clinical','/icd/search','/icd/detail','/medline/search'].includes(url.pathname)) {
    event.respondWith(cima(request)); return;
  }
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  if (url.pathname.startsWith(new URL('vendor/ocr/', BASE).pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(OCR); const stored = await cache.match(request);
      if (stored) return stored;
      const response = await fetch(request);
      if (response.ok) { try { await cache.put(request, response.clone()); } catch {} }
      return response;
    })()); return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      // Serve one coherent shell version; updates activate after all old tabs close.
      const cached = await (await caches.open(SHELL)).match(new URL('index.html', BASE));
      return cached || fetch(request);
    })());
  } else if (SHELL_URLS.has(url.href)) {
    event.respondWith((async () => (await (await caches.open(SHELL)).match(request)) || fetch(request))());
  }
});
