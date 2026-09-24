/* Bump RELEASE for every published build. This cache never contains user records. */
const RELEASE = '2026-09-23-sound-1';
const PREFIX = 'infp-charging-static-';
const CACHE = `${PREFIX}${RELEASE}`;
const ROOT = new URL('./', self.location.href);
const SHELL = new URL('index.html', ROOT).href;

function localStatic(url) {
  return url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname) &&
    !url.search && /\.(?:js|css|png|svg|ico|woff2?|webmanifest)$/.test(url.pathname) &&
    url.pathname !== new URL('sw.js', ROOT).pathname;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch(SHELL, { cache: 'reload' });
    if (!response.ok || response.type !== 'basic') throw new Error('App shell unavailable');
    const html = await response.clone().text();
    const urls = new Set([
      new URL('manifest.webmanifest', ROOT).href,
      new URL('icons/icon-192.png', ROOT).href,
      new URL('icons/icon-512.png', ROOT).href,
    ]);
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const url = new URL(match[1], ROOT);
      if (localStatic(url)) urls.add(url.href);
    }
    // Installation is atomic from the browser's perspective: no successful
    // install until every entry script/style and required static file is cached.
    await Promise.all([...urls].map(async url => {
      const asset = await fetch(url, { cache: 'reload' });
      if (!asset.ok || asset.type !== 'basic') throw new Error('Static asset unavailable');
      await cache.put(url, asset);
    }));
    await cache.put(SHELL, response);
  })());
  // No skipWaiting: existing sessions keep their current worker until closed.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin) return;
  // Audio is cached only on demand, never during shell installation.
  if (/\/audio\/(?:music-garden-(?:day|night)|ambient-(?:river|leaves|birds)-loop|sfx-(?:flower-bloom|tree-grow))\.mp3$/.test(url.pathname) && !url.search) {
    event.respondWith(audioResponse(request));
    return;
  }
  const isShell = request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.pathname === new URL(SHELL).pathname);
  if (!isShell && !localStatic(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Versioned shell is paired with its precached, fingerprinted assets.
    // Public build assets have no user/content negotiation. Module requests
    // carry Origin while install fetches do not; Vite adds Vary: Origin.
    const cached = await cache.match(isShell ? SHELL : request, { ignoreVary: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (!isShell && response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  })());
});

async function audioResponse(request) {
  const cache = await caches.open(CACHE);
  let response = await cache.match(request.url, { ignoreVary: true });
  if (!response) {
    // Fetch a full file so subsequent mobile range requests also work offline.
    response = await fetch(request.url);
    if (response.status !== 200) return response;
    try { await cache.put(request.url, response.clone()); } catch { /* Playback still works if storage is full. */ }
  }
  const range = request.headers.get('Range');
  if (!range) return response;
  const bytes = await response.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
  if (start > end || start >= bytes.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${bytes.byteLength}`, 'Content-Length': String(end - start + 1),
  } });
}
