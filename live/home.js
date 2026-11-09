// খেলাঘর হোম পেজের তিনটা অংশ জমজমাট করা:
//  ১. লাইভ স্কোর: চলমান খেলার ছোট কার্ড (স্কোর, জেতার সম্ভাবনার দাগ), আসন্ন খেলায় কাউন্টডাউন
//  ২. প্রেডিকশন: আজ-কালের বড় খেলার পূর্বাভাস আর "অনুমান দিন", সাথে এই সপ্তাহের সেরা ৩ জন
//  ৩. লাইভ খবর: সর্বশেষ ৩টা শিরোনাম (খবরের অংশের নিজের /api/news থেকে, শুধু পড়া)
// ডাটা সব CDN-এ জমা থাকা ঠিকানা থেকে, তাই হোম পেজ খুললেও API-র খরচ বাড়ে না। কিছু না এলে আগের সাধারণ বোতামগুলোই থাকে।
import { winProb } from '/live/insight.js';

const box = document.getElementById('lvStrip');
const cnt = document.getElementById('lvCount');
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const css = `
.livebox,.prdbox,.newsbox{background:var(--panel,#161b22);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;overflow:hidden}
.livebox .livebtn,.prdbox .prdbtn,.newsbox .newsbtn{border:0!important;background:none!important;border-radius:0;box-shadow:none!important}
.lvc{font-size:.72rem;font-weight:700;color:#ff6b81;white-space:nowrap}
.livebox .lvstrip,.prdbox .lvstrip{display:flex;gap:10px;overflow-x:auto;padding:0 12px 12px 12px!important;scroll-padding-left:12px;scroll-snap-type:x mandatory;scrollbar-width:none}
.lvstrip::-webkit-scrollbar{display:none}
.lvm{flex:0 0 220px;scroll-snap-align:start;display:block;text-decoration:none;color:#e6edf3;background:rgba(255,255,255,.04);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:8px 10px}
.lvm.on{border-color:rgba(255,59,92,.45);background:linear-gradient(180deg,rgba(255,59,92,.08),rgba(255,255,255,.03))}
.lvm .h{display:flex;align-items:center;gap:6px;font-size:.68rem;color:#8b949e;margin-bottom:4px}
.lvm .h span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lvm .p{flex:none;font-style:normal;border-radius:99px;padding:1px 7px;font-weight:700;background:rgba(255,255,255,.08);color:#c9d1d9}
.lvm.on .p{background:#ff3b5c;color:#fff}
.lvm .r{display:flex;align-items:center;gap:7px;padding:2px 0;font-size:.86rem}
.lvm .r b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.lvm .r i{font-style:normal;font-weight:800;white-space:nowrap}
.lvm .r i small{font-weight:500;color:#8b949e;font-size:.7rem;margin-left:2px}
.lvm .f{width:20px;height:14px;border-radius:3px;object-fit:cover;flex:none;background:#30363d}
.lvm .mn{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:.55rem;font-weight:800;color:#fff;flex:none}
.lvm .s{font-size:.7rem;color:#8b949e;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lvm.on .s{color:#ffb3c0}
.lvm .wb{display:flex;gap:2px;height:4px;border-radius:99px;overflow:hidden;margin-top:5px;background:rgba(255,255,255,.06)}
.lvm .wb i{display:block}.lvm .wb .a{background:#38bdf8}.lvm .wb .d{background:#64748b}.lvm .wb .b{background:#ffc727}
.lvm .wl{display:flex;justify-content:space-between;font-size:.62rem;color:#8b949e;margin-top:2px}
.lvm .go{display:block;margin-top:6px;text-align:center;border-radius:8px;padding:5px;font-size:.74rem;font-weight:800;background:linear-gradient(135deg,#ffd75a,#f2a900);color:#2b1a00}
.lvall{flex:0 0 96px;display:grid;place-items:center;text-align:center;text-decoration:none;color:#c9d1d9;font-size:.8rem;font-weight:700;border:1px dashed var(--line,rgba(255,255,255,.15));border-radius:12px}
.ptop{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:0 14px 12px;font-size:.74rem;color:#8b949e}
.ptop b{color:#ffc727}.ptop span{background:rgba(255,255,255,.05);border-radius:99px;padding:2px 8px}
.nwl{list-style:none;margin:0;padding:0 12px 10px}
.nwl li{border-top:1px solid var(--line,rgba(255,255,255,.08))}
.nwl a{display:flex;gap:10px;align-items:center;padding:8px 2px;text-decoration:none;color:#e6edf3}
.nwl img{width:54px;height:40px;border-radius:8px;object-fit:cover;flex:none;background:#30363d}
.nwl .t{flex:1;min-width:0;font-size:.84rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nwl small{display:block;font-size:.68rem;color:#8b949e;margin-top:2px}`;
const stEl = document.createElement('style'); stEl.textContent = css; document.head.appendChild(stEl);

const now = () => Date.now();
const when = t => {
  const d = new Date(t), n = new Date();
  const day = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
  const h = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
  const per = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  return (day === 0 ? 'আজ ' : day === 1 ? 'কাল ' : `${bn(d.getDate())}/${bn(d.getMonth() + 1)} `) + per + ' ' + bn(`${h % 12 || 12}:${mm}`);
};
const left = t => { const s = Math.max(0, Math.floor((t - now()) / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return s <= 0 ? 'এখনই শুরু' : h >= 24 ? `${bn(Math.floor(h / 24))} দিন পর` : `শুরু হতে ${h ? bn(h) + 'ঘ ' : ''}${bn(m)}মি`; };
const ago = t => { const m = Math.max(1, Math.round((now() - t) / 60000)); return m < 60 ? `${bn(m)} মিনিট আগে` : m < 1440 ? `${bn(Math.round(m / 60))} ঘণ্টা আগে` : `${bn(Math.round(m / 1440))} দিন আগে`; };
const nm = t => esc(t.bn || t.name);
const badge = t => t.flag
  ? `<img class="f" src="https://flagcdn.com/w40/${esc(t.flag)}.png" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
  : `<span class="mn" style="background:${esc(t.col || '#3b78f0')}">${esc(t.mono || '?')}</span>`;
const score = (m, s) => {
  const t = m[s];
  if (m.sport === 'football') return t.g == null ? '' : bn(t.g);
  const inn = t.inn || [];
  if (!inn.length) return '';
  const l = inn[inn.length - 1];
  return bn(l.w >= 10 ? l.r : `${l.r}/${l.w}`) + (m.test ? '' : `<small>(${bn(l.o)})</small>`);
};
const bar = p => (p ? `<div class="wb"><i class="a" style="flex:${p.a}"></i>${p.d > 0.01 ? `<i class="d" style="flex:${p.d}"></i>` : ''}<i class="b" style="flex:${p.b}"></i></div>` : '');
const paused = m => m.pause || /stumps/i.test(m.raw || '') || /দিন শেষ/.test(m.status || '');
const isLive = m => m.state === 'live' && !paused(m) && !(m.sport === 'cricket' && !(m.inns || []).length && /শুরু হয়নি/.test(m.status || ''));

// লাইভ স্কোরের কার্ড
const liveCard = m => {
  const on = isLive(m);
  const pill = on ? (m.sport === 'football' && m.min ? bn(m.min) + "'" : 'লাইভ') : when(m.start);
  const p = on ? winProb(m) : null;
  return `<a class="lvm${on ? ' on' : ''}" href="/live/#m=${encodeURIComponent(m.id)}">
<div class="h"><span>${m.sport === 'cricket' ? '🏏' : '⚽'} ${esc(m.tour || '')}</span><em class="p">${pill}</em></div>
<div class="r">${badge(m.a)}<b>${nm(m.a)}</b><i>${score(m, 'a')}</i></div>
<div class="r">${badge(m.b)}<b>${nm(m.b)}</b><i>${score(m, 'b')}</i></div>
${bar(p)}<div class="s">${esc(on ? m.status || '' : '⏱ ' + left(m.start))}</div></a>`;
};
// প্রেডিকশনের কার্ড: পূর্বাভাস আর "অনুমান দিন"
const predCard = m => {
  const p = m.pred;
  const pc = x => bn(Math.round(x * 100)) + '%';
  return `<a class="lvm" href="/live/predict/#m=${encodeURIComponent(m.id)}">
<div class="h"><span>${m.sport === 'cricket' ? '🏏' : '⚽'} ${esc(m.tour || '')}</span><em class="p">${when(m.start)}</em></div>
<div class="r">${badge(m.a)}<b>${nm(m.a)}</b></div>
<div class="r">${badge(m.b)}<b>${nm(m.b)}</b></div>
${p ? `${bar(p)}<div class="wl"><span>${pc(p.a)}</span>${p.d > 0.01 ? `<span>ড্র ${pc(p.d)}</span>` : ''}<span>${pc(p.b)}</span></div>` : ''}
<span class="go">🎯 অনুমান দিন</span></a>`;
};

// প্রেডিকশন আর খবরের বোতামের নিচে নতুন জায়গা (বোতামগুলো অন্য অংশের, তাই শুধু পাশে বসাই)
function wrap(btnSel, cls) {
  const btn = document.querySelector(btnSel);
  if (!btn) return null;
  if (btn.parentElement.classList.contains(cls)) return btn.parentElement.querySelector('[data-fill]');
  const sec = document.createElement('section'); sec.className = cls;
  btn.replaceWith(sec); sec.appendChild(btn);
  const fill = document.createElement('div'); fill.dataset.fill = '1'; sec.appendChild(fill);
  return fill;
}
const prdFill = wrap('a.prdbtn', 'prdbox');
const newsFill = wrap('a.newsbtn', 'newsbox');
// লাইভ স্কোর বোতামের নিচের লেখা (প্রেডিকশন এখন আলাদা চ্যানেল)
const sub = document.querySelector('.livebtn small');
if (sub && /ভোট/.test(sub.textContent)) sub.textContent = '🏏 ক্রিকেট · ⚽ ফুটবল · বল-বাই-বল আর জেতার সম্ভাবনা';

const ensurePrd = () => { if (prdFill && !prdFill.querySelector('.ptop')) prdFill.innerHTML = '<div class="lvstrip"></div><div class="ptop"></div>'; };
const setHtml = (el, html) => { if (el && html !== el.dataset.h) { el.innerHTML = html; el.dataset.h = html; } };

async function loadScores() {
  try {
    const r = await fetch('/api/live?f=feed');
    if (!r.ok) return;
    const d = await r.json();
    const all = (d.matches || []).filter(m => !m.demo);
    let fav = new Set();
    try { fav = new Set(JSON.parse(localStorage.getItem('kh-live-fav') || '[]')); } catch (e) {}
    // প্রিয় দল আগে, তারপর বড় দল; ক্রিকেট আগে, ফুটবল পরে
    const rk = m => (fav.has(m.a.name) || fav.has(m.b.name) ? 100 : 0) + (m.rk || (m.intl ? 2 : 1));
    const sp = m => (m.sport === 'cricket' ? 0 : 1);
    const live = all.filter(isLive).sort((x, y) => sp(x) - sp(y) || rk(y) - rk(x));
    const up = all.filter(m => m.state === 'upcoming' && m.start > now() - 3600e3 && m.start < now() + 2 * 864e5).sort((x, y) => rk(y) - rk(x) || x.start - y.start);
    if (box) {
      const pick = live.slice(0, 6).concat(up.slice(0, Math.max(0, 6 - live.length)));
      if (pick.length) {
        if (cnt) cnt.textContent = live.length ? `● ${bn(live.length)}টি খেলা চলছে` : `${bn(up.length)}টি খেলা আসছে`;
        setHtml(box, pick.map(liveCard).join('') + '<a class="lvall" href="/live/">সব খেলা<br>দেখুন ›</a>');
        box.hidden = false;
      }
    }
    if (prdFill) {
      // পূর্বাভাস আছে এমন বড় খেলা আগে, শুরু হয়নি এমন
      const pp = up.filter(m => m.start > now()).sort((x, y) => (!!y.pred - !!x.pred) || rk(y) - rk(x) || x.start - y.start).slice(0, 6);
      if (pp.length) { ensurePrd(); setHtml(prdFill.querySelector('.lvstrip'), pp.map(predCard).join('') + '<a class="lvall" href="/live/predict/">সব খেলা<br>দেখুন ›</a>'); }
    }
  } catch (e) {}
}
async function loadTop() {
  if (!prdFill) return;
  try {
    const d = await (await fetch('/api/live?f=board&p=week')).json();
    const top = (d.list || []).filter(x => x.pts > 0).slice(0, 3);
    ensurePrd();
    const medal = ['🥇', '🥈', '🥉'];
    setHtml(prdFill.querySelector('.ptop'), top.length ? `🏆 এই সপ্তাহের সেরা: ${top.map((x, i) => `<span>${medal[i]} ${esc(x.name)} <b>${bn(x.pts)}</b></span>`).join('')}` : '🏆 এই সপ্তাহের লিডারবোর্ডে প্রথম হোন!');
  } catch (e) {}
}
async function loadNews() {
  if (!newsFill) return;
  try {
    const d = await (await fetch('/api/news')).json();
    const items = (d.items || []).filter(x => x.t && x.u).sort((a, b) => (b.d || 0) - (a.d || 0)).slice(0, 3);
    if (!items.length) return;
    setHtml(newsFill, `<ul class="nwl">${items.map(x => `<li><a href="${esc(x.u)}" target="_blank" rel="noopener">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="t">${esc(x.t)}<small>${esc(x.s || '')}${x.d ? ' · ' + ago(x.d) : ''}</small></span></a></li>`).join('')}</ul>`);
  } catch (e) {}
}

const go = () => { loadScores(); loadTop(); loadNews(); };
if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
setInterval(() => { if (!document.hidden) loadScores(); }, 60000);
setInterval(() => { if (!document.hidden) { loadTop(); loadNews(); } }, 5 * 60000);
