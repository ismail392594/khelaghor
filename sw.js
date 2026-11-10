// খেলাঘর service worker: পেজগুলো ক্যাশে রাখে, যাতে দুর্বল নেটেও দ্রুত খোলে।
// নতুন ভার্সন পাবলিশ করলে VERSION বাড়ান।
const VERSION = 'khelaghor-v160';
const CORE = ['/js/update.js', '/', '/app/', '/games/ludo/', '/games/mosha/', '/games/jam/', '/games/bazar/', '/games/argbra/', '/games/carrom/', '/games/sholo/', '/games/bagh/', '/games/ghuri/', '/games/hadudu/', '/games/callbridge/', '/games/twentynine/', '/games/chess/', '/games/gollachut/', '/games/dariabandha/', '/games/biryani/', '/games/racer/', '/games/loadshed/', '/games/potka/', '/games/interview/', '/games/pitha/', '/games/bariwala/', '/games/delivery/', '/games/comment/', '/games/gas/', '/games/chitkar/', '/games/autorickshaw/', '/games/porikkha/', '/games/chokka/', '/games/jolabaddho/', '/games/haat/', '/games/fuchka/', '/games/metro/', '/games/eidticket/', '/games/rickshaw/', '/games/helper/', '/games/bouchi/', '/games/nouka/', '/games/rumal/', '/games/ekkadokka/', '/games/marble/', '/games/latim/', '/games/dangguli/', '/games/kanamachi/', '/news/', '/js/chess-engine.js', '/js/kh-human.js', '/js/kh-scene.js', '/js/guest.js', '/js/share-card.js', '/js/challenge.js', '/help/', '/live/', '/live/live.js', '/live/insight.js', '/live/anim.js', '/offline.html', '/js/game-info.js', '/js/fun.js', '/js/catalog.js', '/js/hub-plus.js', '/js/more-games.js', '/js/kh-fullscreen.js', '/js/voice.js', '/js/videos.js', '/js/viral.js', '/js/howto.js', '/js/stories.js', '/js/story-split.js', '/js/ludo-engine.js', '/js/vendor/three.module.min.js', '/js/online.js', '/js/firebase-config.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/live/push-config.js', '/live/predict/', '/live/home.js'];

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
  if (url.pathname.startsWith('/api/')) return; // সার্ভারের উত্তর (ভয়েস, গল্প) ব্রাউজার নিজেই ক্যাশ করে
  if (!url.pathname.startsWith('/icons/')) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/offline.html') : undefined)))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
  })));
});

// লাইভ স্কোরের নোটিফিকেশন (প্রিয় দলের খেলা শুরু, উইকেট, গোল, শেষ)। পাঠায় /api/live সার্ভার।
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (er) {}
  const d = p.data || p.notification || p;
  e.waitUntil(self.registration.showNotification(d.title || 'খেলাঘর লাইভ স্কোর', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || '/live/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/live/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
