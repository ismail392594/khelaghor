/* হাবের বাড়তি সুবিধা (বড় গেম সাইটগুলো দেখে): আজকের বাছাই, মুড অনুযায়ী খোঁজা, প্রিয় গেম (❤️), নতুন ব্যাজ, যেকোনো একটা খেলি (🎲)।
   তালিকা আসে js/catalog.js থেকে; গ্রিড আঁকা হলে index.html থেকে KH.afterGrid ডাকা হয়। */
(() => {
  const CAT = window.KH_CAT || [], MOODS = window.KH_MOODS || [], K = window.KH = window.KH || {};
  const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const host = document.getElementById('hubPlus'); if (!host) return;
  const css = document.createElement('style');
  css.textContent = `.hp-sec{margin:14px 0 6px;display:flex;align-items:baseline;justify-content:space-between;gap:8px}.hp-sec h2{margin:0;font-size:1.05rem}.hp-sec small{opacity:.7;font-size:.72rem}
.hp-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;scroll-snap-type:x mandatory}.hp-row::-webkit-scrollbar{display:none}
.hp-pick{flex:0 0 78%;max-width:300px;aspect-ratio:16/10;border-radius:16px;position:relative;overflow:hidden;background:#1e293b center/cover no-repeat;scroll-snap-align:start;border:0;padding:0;cursor:pointer;color:#fff;text-align:left;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.hp-pick::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,.82))}
.hp-pick b{position:absolute;left:12px;bottom:28px;z-index:1;font-size:1.1rem}.hp-pick span{position:absolute;left:12px;bottom:10px;z-index:1;font-size:.72rem;opacity:.85}
.hp-pick i{position:absolute;right:10px;top:10px;z-index:1;font-style:normal;background:#f59e0b;color:#1c1917;border-radius:8px;padding:2px 8px;font-weight:800;font-size:.7rem}
.hp-moods{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.hp-mood{border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,rgba(255,255,255,.06));color:inherit;border-radius:14px;padding:9px 10px;text-align:left;cursor:pointer;display:flex;gap:8px;align-items:center;font:inherit}
.hp-mood em{font-style:normal;font-size:1.4rem}.hp-mood b{display:block;font-size:.84rem}.hp-mood small{display:block;font-size:.66rem;opacity:.7}
.hp-mood[aria-pressed="true"]{outline:2px solid #22d3ee;background:rgba(34,211,238,.14)}
.hp-mini{flex:0 0 96px;border:0;background:none;color:inherit;padding:0;cursor:pointer;text-align:center;font:inherit}.hp-mini span{display:block;width:96px;height:96px;border-radius:16px;background:#1e293b center/cover no-repeat;margin-bottom:4px}.hp-mini b{font-size:.7rem;display:block;line-height:1.2}
.tile .hp-new{position:absolute;left:8px;top:8px;z-index:3;background:#ef4444;color:#fff;border-radius:7px;padding:1px 7px;font-size:.62rem;font-weight:800;letter-spacing:.3px}
.tile .hp-fav{position:absolute;right:6px;top:6px;z-index:3;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.45);display:grid;place-items:center;font-size:1rem;line-height:1}
.hp-rand{border:0;border-radius:14px;padding:0 14px;font:800 .82rem var(--body,inherit);background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;cursor:pointer;white-space:nowrap}
.hp-srow{display:flex;gap:8px;align-items:stretch}.hp-srow .search{flex:1}`;
  document.head.appendChild(css);
  const go = c => { if (K.tapGame) K.tapGame(c.n, c.u, 'live'); else location.href = c.u; };
  const shot = c => `url(/icons/shots/${c.k}.webp)`;
  const isNew = c => c.d && (Date.now() - new Date(c.d).getTime()) / 864e5 < 21;
  // আজকের বাছাই: তারিখ দেখে প্রতিদিন নতুন ৪টা (সবার জন্য একই)
  const day = Math.floor(Date.now() / 864e5); let seed = day * 9301 + 49297; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const picks = [...CAT].sort(() => rnd() - .5).slice(0, 4);
  const moodName = Object.fromEntries(MOODS.map(m => [m[0], m[2]]));
  host.innerHTML = `<div class="hp-sec"><h2>✨ আজকের বাছাই</h2><small>প্রতিদিন নতুন</small></div><div class="hp-row" id="hpPicks"></div>
    <div id="hpFavBox" hidden><div class="hp-sec"><h2>❤️ আপনার প্রিয় গেম</h2></div><div class="hp-row" id="hpFav"></div></div>
    <div class="hp-sec"><h2>🎭 আজ কী মুডে?</h2><small>চাপলে নিচের তালিকা বদলাবে</small></div><div class="hp-moods" id="hpMoods"></div>`;
  picks.forEach((c, i) => { const b = document.createElement('button'); b.className = 'hp-pick'; b.style.backgroundImage = shot(c); b.innerHTML = `<i>${i === 0 ? 'আজকের সেরা' : isNew(c) ? 'নতুন' : moodName[c.m[0]] || ''}</i><b>${c.n}</b><span>${c.m.map(m => moodName[m]).filter(Boolean).slice(0, 2).join(' · ')}</span>`; b.onclick = () => go(c); host.querySelector('#hpPicks').appendChild(b); });
  // মুড
  let mood = null;
  MOODS.forEach(([k, e, t, s]) => { const b = document.createElement('button'); b.className = 'hp-mood'; b.setAttribute('aria-pressed', 'false'); const n = CAT.filter(c => c.m.includes(k)).length; b.innerHTML = `<em>${e}</em><span><b>${t}</b><small>${s} · ${bn(n)}টা</small></span>`;
    b.onclick = () => { mood = mood === k ? null : k; host.querySelectorAll('.hp-mood').forEach(x => x.setAttribute('aria-pressed', 'false')); if (mood) b.setAttribute('aria-pressed', 'true'); K.mood = mood ? CAT.filter(c => c.m.includes(mood)).map(c => c.n) : null; if (typeof drawGrid === 'function') drawGrid(); const g = document.getElementById('grid'); if (mood && g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    host.querySelector('#hpMoods').appendChild(b); });
  // প্রিয় গেম
  const favs = () => ls.get('kh-fav', []);
  function drawFav() { const f = favs().map(n => CAT.find(c => c.n === n)).filter(Boolean); const box = document.getElementById('hpFavBox'); box.hidden = !f.length; const row = document.getElementById('hpFav'); row.innerHTML = '';
    f.forEach(c => { const b = document.createElement('button'); b.className = 'hp-mini'; b.innerHTML = `<span style="background-image:${shot(c)}"></span><b>${c.n}</b>`; b.onclick = () => go(c); row.appendChild(b); }); }
  function toggleFav(n) { let f = favs(); f = f.includes(n) ? f.filter(x => x !== n) : [n, ...f]; ls.set('kh-fav', f.slice(0, 20)); drawFav(); K.afterGrid(); }
  K.afterGrid = () => { const f = favs(); document.querySelectorAll('#grid .tile[data-name]').forEach(t => { const n = t.dataset.name, c = CAT.find(x => x.n === n); if (!c) return; t.style.position = t.style.position || 'relative';
    if (isNew(c) && !t.querySelector('.hp-new')) { const s = document.createElement('span'); s.className = 'hp-new'; s.textContent = 'নতুন'; t.appendChild(s); }
    let h = t.querySelector('.hp-fav'); if (!h) { h = document.createElement('span'); h.className = 'hp-fav'; h.setAttribute('role', 'button'); h.onclick = e => { e.stopPropagation(); toggleFav(n); }; t.appendChild(h); }
    h.textContent = f.includes(n) ? '❤️' : '🤍'; h.setAttribute('aria-label', f.includes(n) ? 'প্রিয় থেকে সরান' : 'প্রিয়তে রাখুন'); }); };
  // যেকোনো একটা খেলি
  const sr = document.querySelector('label.search'); if (sr) { const wrap = document.createElement('div'); wrap.className = 'hp-srow'; sr.parentNode.insertBefore(wrap, sr); wrap.appendChild(sr); const r = document.createElement('button'); r.className = 'hp-rand'; r.type = 'button'; r.textContent = '🎲 যেকোনো একটা'; r.onclick = () => { const pool = K.mood ? CAT.filter(c => K.mood.includes(c.n)) : CAT; go(pool[Math.floor(Math.random() * pool.length)]); }; wrap.appendChild(r); }
  drawFav(); if (typeof drawGrid === 'function') drawGrid(); else K.afterGrid();
})();
