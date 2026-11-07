// খেলাঘর service worker: পেজগুলো ক্যাশে রাখে, যাতে দুর্বল নেটেও দ্রুত খোলে।
// নতুন ভার্সন পাবলিশ করলে VERSION বাড়ান।
const VERSION = 'khelaghor-v2';
const CORE = ['/', '/index.html', '/games/ludo/', '/games/ludo/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// আইকন: আগে ক্যাশ। বাকি সব (পেজ, কোড): আগে নেট থেকে নতুনটা, নেট না থাকলে ক্যাশ।
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.startsWith('/icons/')) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
  })));
});
