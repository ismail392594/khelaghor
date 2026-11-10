/* মোবাইলে খেলা শুরুর বোতাম চাপলেই পুরো পর্দা (ব্রাউজারের ঠিকানার দাগ লুকায়)। হাইওয়ে রাজার মতো গাড়ির খেলায় পর্দা আড়াআড়িও হয়।
   ব্রাউজার না দিলে (যেমন আইফোনের সাফারি) কিছুই হয় না, খেলা আগের মতোই চলে। কেউ নিজে পুরো পর্দা থেকে বের হলে আর জোর করা হয় না। */
(() => {
  const d = document, el = d.documentElement;
  const mobile = matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 900;
  if (!mobile || !(el.requestFullscreen || el.webkitRequestFullscreen)) return;
  const LAND = ['/games/racer/'], land = LAND.some(u => location.pathname.startsWith(u));
  let userLeft = false, asked = false;
  const isFs = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  d.addEventListener('fullscreenchange', () => { if (!isFs() && asked) userLeft = true; });
  async function go() { if (isFs() || userLeft) return; asked = true; try { await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' }); if (land && screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
  d.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button, .gbtn, [data-lv]'); if (!b) return; if (b.closest('.over, .lvl, #startO, #endO, .ctl, .menu, .start')) go(); }, true);
})();
