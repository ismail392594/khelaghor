// নতুন আপডেট এলে জানানো: service worker বদলালে নিচে একটা বোতাম, চাপলেই নতুন সংস্করণ। খেলার মাঝে নিজে থেকে পাতা বদলায় না।
(function () {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller; let shown = false;
  function banner() {
    if (shown || !had) return; shown = true;
    const b = document.createElement('button'); b.type = 'button';
    b.textContent = '🎉 খেলাঘরে নতুন আপডেট এসেছে · চাপুন';
    b.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99999;border:0;border-radius:999px;padding:11px 18px;font:800 .95rem "Baloo Da 2","Noto Sans Bengali",sans-serif;background:#22c55e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.4);cursor:pointer;max-width:92vw';
    b.onclick = () => location.reload(); document.body.appendChild(b);
  }
  navigator.serviceWorker.addEventListener('controllerchange', banner);
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      const check = () => reg.update().catch(() => {});
      check(); setInterval(check, 15 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    }).catch(() => {});
  });
})();
