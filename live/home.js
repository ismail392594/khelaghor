// খেলাঘর হোম পেজ: "লাইভ স্কোর" বাটনের নিচে চলমান খেলার ছোট কার্ড (পাশে টেনে দেখা যায়)।
// ডাটা আসে /api/live?f=feed থেকে (CDN-এ জমা থাকে, তাই হোম পেজ খুললেও API-র খরচ বাড়ে না)।
// কিছু না এলে আগের সাধারণ বাটনটাই থাকে।
(() => {
  const box = document.getElementById('lvStrip');
  const cnt = document.getElementById('lvCount');
  if (!box) return;
  const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const css = `
.livebox{background:var(--panel,#161b22);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;overflow:hidden}
.livebox .livebtn{border:0!important;background:none!important;border-radius:0}
.lvc{font-size:.72rem;font-weight:700;color:#ff6b81;white-space:nowrap}
.livebox .lvstrip{display:flex;gap:10px;overflow-x:auto;padding:0 12px 12px 12px!important;scroll-padding-left:12px;scroll-snap-type:x mandatory;scrollbar-width:none}
.lvstrip::-webkit-scrollbar{display:none}
.lvm{flex:0 0 212px;scroll-snap-align:start;display:block;text-decoration:none;color:#e6edf3;background:rgba(255,255,255,.04);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:8px 10px}
.lvm.on{border-color:rgba(255,59,92,.45)}
.lvm .h{display:flex;align-items:center;gap:6px;font-size:.68rem;color:#8b949e;margin-bottom:4px}
.lvm .h span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lvm .p{flex:none;border-radius:99px;padding:1px 7px;font-weight:700;background:rgba(255,255,255,.08);color:#c9d1d9}
.lvm.on .p{background:#ff3b5c;color:#fff}
.lvm .r{display:flex;align-items:center;gap:7px;padding:2px 0;font-size:.86rem}
.lvm .r b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.lvm .r i{font-style:normal;font-weight:800;white-space:nowrap}
.lvm .r i small{font-weight:500;color:#8b949e;font-size:.7rem;margin-left:2px}
.lvm .f{width:20px;height:14px;border-radius:3px;object-fit:cover;flex:none;background:#30363d}
.lvm .mn{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:.55rem;font-weight:800;color:#fff;flex:none}
.lvm .s{font-size:.7rem;color:#8b949e;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lvm.on .s{color:#ffb3c0}
.lvall{flex:0 0 96px;display:grid;place-items:center;text-align:center;text-decoration:none;color:#c9d1d9;font-size:.8rem;font-weight:700;border:1px dashed var(--line,rgba(255,255,255,.15));border-radius:12px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const when = t => {
    const d = new Date(t), n = new Date();
    const day = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
    const h = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
    const per = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
    return (day === 0 ? 'আজ ' : day === 1 ? 'কাল ' : `${bn(d.getDate())}/${bn(d.getMonth() + 1)} `) + per + ' ' + bn(`${h % 12 || 12}:${mm}`);
  };
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
  const card = m => {
    const on = m.state === 'live';
    const pill = on ? (m.sport === 'football' && m.min ? bn(m.min) + "'" : 'লাইভ') : when(m.start);
    const nm = t => esc(t.bn || t.name);
    return `<a class="lvm${on ? ' on' : ''}" href="/live/#m=${encodeURIComponent(m.id)}">
<div class="h"><span>${m.sport === 'cricket' ? '🏏' : '⚽'} ${esc(m.tour || '')}</span><em class="p">${pill}</em></div>
<div class="r">${badge(m.a)}<b>${nm(m.a)}</b><i>${score(m, 'a')}</i></div>
<div class="r">${badge(m.b)}<b>${nm(m.b)}</b><i>${score(m, 'b')}</i></div>
<div class="s">${esc(on ? m.status || '' : '🗳️ কে জিতবে? ভোট দিন')}</div></a>`;
  };

  async function load() {
    try {
      const r = await fetch('/api/live?f=feed');
      if (!r.ok) return;
      const d = await r.json();
      const all = (d.matches || []).filter(m => !m.demo);
      let fav = new Set();
      try { fav = new Set(JSON.parse(localStorage.getItem('kh-live-fav') || '[]')); } catch (e) {}
      // প্রিয় দল আগে, তারপর বড় দল; ক্রিকেট আগে, ফুটবল পরে। দিনের খেলা শেষ হওয়া টেস্ট লাইভে নয়
      const rk = m => (fav.has(m.a.name) || fav.has(m.b.name) ? 100 : 0) + (m.rk || (m.intl ? 2 : 1));
      const sp = m => (m.sport === 'cricket' ? 0 : 1);
      const live = all.filter(m => m.state === 'live' && !m.pause && !/stumps/i.test(m.raw || '') && !/দিন শেষ/.test(m.status || '')).sort((x, y) => sp(x) - sp(y) || rk(y) - rk(x));
      const up = all.filter(m => m.state === 'upcoming' && m.start < Date.now() + 2 * 864e5).sort((x, y) => rk(y) - rk(x) || x.start - y.start);
      const pick = live.slice(0, 6).concat(up.slice(0, Math.max(0, 6 - live.length)));
      if (!pick.length) return;
      if (cnt) cnt.textContent = live.length ? `● ${bn(live.length)}টি খেলা চলছে` : `${bn(up.length)}টি খেলা আসছে`;
      const html = pick.map(card).join('') + '<a class="lvall" href="/live/">সব খেলা<br>দেখুন ›</a>';
      if (html !== box.dataset.h) { box.innerHTML = html; box.dataset.h = html; }
      box.hidden = false;
    } catch (e) {}
  }
  const go = () => load();
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
  setInterval(() => { if (!document.hidden) load(); }, 60000);
})();
