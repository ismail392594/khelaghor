/* গেমের শেষ পর্দায় "আরো খেলুন": একই মুডের ৪টা গেম ছবিসহ (বড় গেম সাইটগুলোর মতো)। যেকোনো গেমে
   <script src="/js/catalog.js"></script><script src="/js/more-games.js"></script> দিলেই #endO .card-এ যোগ হয়। */
(() => {
  const CAT = window.KH_CAT || []; if (!CAT.length) return;
  const here = location.pathname.replace(/index\.html$/, ''), me = CAT.find(c => here.startsWith(c.u));
  try { if (me) { const r = JSON.parse(localStorage.getItem('kh-recent') || '[]').filter(x => x !== me.n); r.unshift(me.n); localStorage.setItem('kh-recent', JSON.stringify(r.slice(0, 5))); } } catch (e) {}
  const css = document.createElement('style');
  css.textContent = `.mg{margin-top:12px;text-align:left}.mg h3{margin:0 0 6px;font-size:.9rem}.mg-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.mg a{display:block;color:inherit;text-decoration:none;font-size:.62rem;font-weight:700;line-height:1.2;text-align:center}.mg a span{display:block;aspect-ratio:1;border-radius:12px;background:#1e293b center/cover no-repeat;margin-bottom:3px;box-shadow:0 3px 8px rgba(0,0,0,.35)}`;
  document.head.appendChild(css);
  function pick() { const pool = CAT.filter(c => c !== me); const score = c => (me ? c.m.filter(m => me.m.includes(m)).length : 0) + Math.random() * .9; return pool.map(c => [c, score(c)]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]); }
  function add() { const card = document.querySelector('#endO .card'); if (!card || card.querySelector('.mg')) return; const box = document.createElement('div'); box.className = 'mg';
    box.innerHTML = '<h3>🎮 আরো খেলুন</h3><div class="mg-row">' + pick().map(c => `<a href="${c.u}"><span style="background-image:url(/icons/shots/${c.k}.webp)"></span>${c.n}</a>`).join('') + '</div>';
    const lb = card.querySelector('.lb:last-of-type, #lb2'); if (lb) card.insertBefore(box, lb); else card.appendChild(box); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
