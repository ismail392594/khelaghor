// খেলাঘর লাইভ: খেলার অ্যানিমেশন (মাঠের ছবি)। আসল ভিডিও নয়: আমাদের কাছে আসা ঘটনা (গোল, কার্ড, চার, ছক্কা, আউট) দিয়ে আঁকা।
// ফুটবল: মাঠে বল ঘোরে (যে দলের বল দখল বেশি, বেশিক্ষণ তাদের আক্রমণে), গোল হলে বল জালে, নিচে মিনিটের দাগে সব ঘটনা।
// ক্রিকেট: মাঠ, পিচ, ব্যাটার-বোলার; প্রতিটা নতুন বলে বল ছোটে (চারে সীমানায়, ছক্কায় উড়ে, আউটে স্টাম্প ভাঙে), পাশে এই ওভারের বল।
const BN = '০১২৩৪৫৬৭৮৯';
const bn = v => String(v).replace(/\d/g, d => BN[d]);
const toNum = s => Number(String(s).replace(/[০-৯]/g, d => BN.indexOf(d)));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = (a, b) => a + Math.random() * (b - a);

let cur = null; // { id, sport, el, timers, seen, busy }

function stop() {
  if (!cur) return;
  for (const t of cur.timers) clearInterval(t);
  cur.dead = true;
  cur = null;
}

// live.js প্রতিবার নতুন ডাটা এলে এটা ডাকে। একই ম্যাচ হলে শুধু নতুন ঘটনাটা খেলায়, পুরো ছবি আবার বানায় না।
export function drawAnim(box, m, det, tname) {
  if (!box) return;
  const ok = m && (m.state === 'live' || m.state === 'done');
  if (!ok || (m.sport === 'cricket' && !(m.inns || []).length)) { stop(); box.hidden = true; box.innerHTML = ''; return; }
  if (!cur || cur.id !== m.id || !box.contains(cur.el)) {
    stop();
    box.hidden = false;
    cur = { id: m.id, sport: m.sport, timers: [], seen: null, busy: false, dead: false };
    if (m.sport === 'football') fbBuild(box, m, tname); else crBuild(box, m, tname);
  }
  cur.m = m; cur.det = det; cur.tname = tname;
  if (m.sport === 'football') fbUpdate(); else crUpdate();
}

/* ---------------- ফুটবল ---------------- */
function fbBuild(box, m, tname) {
  box.innerHTML = `<h3>🎬 খেলার অ্যানিমেশন<span>ঘটনা থেকে আঁকা, আসল ভিডিও নয়</span></h3>
<div class="anv"><svg class="pitch" viewBox="0 0 300 180" role="img" aria-label="ফুটবল মাঠ">
<defs><pattern id="stp" width="40" height="180" patternUnits="userSpaceOnUse"><rect width="20" height="180" fill="#1f7a3a"/><rect x="20" width="20" height="180" fill="#23843f"/></pattern>
<linearGradient id="pa" x1="0" x2="1"><stop offset="0" stop-color="#38bdf8" stop-opacity="0"/><stop offset="1" stop-color="#38bdf8" stop-opacity=".35"/></linearGradient>
<linearGradient id="pb" x1="1" x2="0"><stop offset="0" stop-color="#fbbf24" stop-opacity="0"/><stop offset="1" stop-color="#fbbf24" stop-opacity=".35"/></linearGradient></defs>
<rect x="0" y="0" width="300" height="180" rx="10" fill="url(#stp)"/>
<rect class="za" x="150" y="10" width="140" height="160" fill="url(#pa)" opacity="0"/>
<rect class="zb" x="10" y="10" width="140" height="160" fill="url(#pb)" opacity="0"/>
<g fill="none" stroke="#e8fff0" stroke-opacity=".75" stroke-width="1.4">
<rect x="10" y="10" width="280" height="160"/><line x1="150" y1="10" x2="150" y2="170"/><circle cx="150" cy="90" r="22"/>
<rect x="10" y="50" width="38" height="80"/><rect x="252" y="50" width="38" height="80"/><rect x="10" y="72" width="14" height="36"/><rect x="276" y="72" width="14" height="36"/></g>
<rect class="gl gla" x="2" y="76" width="8" height="28" fill="#fff" fill-opacity=".25" stroke="#fff"/><rect class="gl glb" x="290" y="76" width="8" height="28" fill="#fff" fill-opacity=".25" stroke="#fff"/>
<g class="ball"><circle r="5" fill="#fff" stroke="#111" stroke-width="1"/><circle r="1.8" fill="#111"/></g>
</svg>
<div class="side sa">${esc(tname(m.a))} →</div><div class="side sb">← ${esc(tname(m.b))}</div>
<div class="ban" hidden></div></div>
<div class="tl"><div class="tlb"></div><div class="tlm"></div></div>
<div class="anb"><button type="button" class="rp">▶ খেলার সারাংশ দেখুন</button><span class="poss"></span></div>`;
  cur.el = box.querySelector('.anv');
  cur.ball = box.querySelector('.ball');
  place(cur.ball, 150, 90, 0);
  box.querySelector('.rp').onclick = () => fbReplay();
  if (!calm()) cur.timers.push(setInterval(fbIdle, 1700));
}
function place(g, x, y, ms = 1400) {
  g.style.transition = ms ? `transform ${ms}ms cubic-bezier(.45,.05,.3,1)` : 'none';
  g.style.transform = `translate(${x}px,${y}px)`;
  g._x = x; g._y = y;
}
function possOf(det) {
  const st = (det && det.stats) || [];
  const p = st.find(x => x[0] === 'বল দখল');
  if (!p) return null;
  const a = parseFloat(p[1]), b = parseFloat(p[2]);
  return a + b > 0 ? a / (a + b) : null;
}
function fbIdle() {
  if (!cur || cur.busy || cur.m.state !== 'live') return;
  const pa = possOf(cur.det) ?? 0.5;
  const atk = Math.random() < pa ? 'a' : 'b';
  const x = atk === 'a' ? R(165, 265) : R(35, 135);
  place(cur.ball, x, R(28, 152));
  const el = cur.el.closest('.box') || cur.el;
  el.querySelector('.za').setAttribute('opacity', atk === 'a' ? 1 : 0);
  el.querySelector('.zb').setAttribute('opacity', atk === 'b' ? 1 : 0);
}
function fbUpdate() {
  const { m, det } = cur;
  const box = cur.el.closest('.box');
  const gl = ((det && det.gl) || []).filter(x => !(m.pen && x.k === 'P' && /^120\+/.test(String(x.m))));
  // মিনিটের দাগ: উপরে প্রথম দল, নিচে দ্বিতীয় দল
  const mins = gl.map(e => toNum(String(e.m).split('+')[0]) + (String(e.m).includes('+') ? toNum(String(e.m).split('+')[1]) : 0));
  const end = Math.max(90, m.min || 0, ...mins) > 95 ? 120 : 90;
  const now = m.state === 'done' ? end : Math.min(end, m.min || 0);
  box.querySelector('.tlb').style.setProperty('--p', (now / end * 100) + '%');
  box.querySelector('.tlm').innerHTML = gl.map((e, i) => `<i class="${e.s}" style="left:${Math.min(98, mins[i] / end * 100)}%" title="${esc(e.n)} ${bn(e.m)}'">${e.k === 'R' ? '🟥' : '⚽'}</i>`).join('')
    + `<b style="left:0">০'</b><b style="left:50%">৪৫'</b><b style="right:0">${bn(end)}'</b>`;
  const pa = possOf(det);
  box.querySelector('.poss').textContent = pa != null ? `বল দখল ${bn(Math.round(pa * 100))}% - ${bn(Math.round((1 - pa) * 100))}%` : '';
  box.querySelector('.rp').hidden = !gl.length;
  // নতুন গোল/লাল কার্ড এলে খেলাই
  const key = gl.length;
  if (cur.seen == null) { cur.seen = key; if (m.state === 'done') place(cur.ball, 150, 90, 0); return; }
  if (key > cur.seen) { const fresh = gl.slice(cur.seen); cur.seen = key; playFb(fresh); }
}
async function playFb(list) {
  const me = cur;
  while (me.busy) await sleep(300);
  me.busy = true;
  for (const e of list) {
    if (me.dead) return;
    await fbEvent(me, e);
  }
  me.busy = false;
}
async function fbEvent(me, e) {
  const box = me.el.closest('.box');
  const name = e.s === 'a' ? me.tname(me.m.a) : me.tname(me.m.b);
  if (e.k === 'R') {
    banner(me, `🟥 লাল কার্ড! ${esc(e.n)} (${esc(name)}) · ${bn(e.m)}'`, 'red');
    await sleep(2200);
    return;
  }
  // a দল ডান দিকের গোলে মারে, b দল বাঁ দিকের গোলে
  const gx = e.s === 'a' ? 296 : 4, sx = e.s === 'a' ? 225 : 75;
  if (!calm()) {
    place(me.ball, sx, R(55, 125), 700); await sleep(750);
    place(me.ball, gx, R(82, 98), 380); await sleep(420);
    const g = box.querySelector(e.s === 'a' ? '.glb' : '.gla');
    g.classList.remove('shake'); void g.getBBox(); g.classList.add('shake');
  }
  banner(me, `⚽ গোল! ${esc(e.n)} (${esc(name)}) · ${bn(e.m)}'${e.k === 'P' ? ' · পেনাল্টি' : e.k === 'OG' ? ' · আত্মঘাতী' : ''}`, 'goal');
  confetti(me.el);
  await sleep(2400);
  place(me.ball, 150, 90, 600);
  await sleep(700);
}
async function fbReplay() {
  const me = cur;
  if (!me || me.busy) return;
  const gl = ((me.det && me.det.gl) || []).filter(x => !(me.m.pen && x.k === 'P' && /^120\+/.test(String(x.m))));
  if (!gl.length) return;
  banner(me, '▶ সারাংশ: শুরু', '');
  await sleep(1000);
  await playFb(gl);
  if (!me.dead) banner(me, me.m.state === 'done' ? `শেষ: ${bn(me.m.a.g ?? 0)} - ${bn(me.m.b.g ?? 0)}` : `এখন: ${bn(me.m.a.g ?? 0)} - ${bn(me.m.b.g ?? 0)}`, '');
}

/* ---------------- ক্রিকেট ---------------- */
const CX = 150, CY = 100, RX = 132, RY = 86;
function crBuild(box, m) {
  box.innerHTML = `<h3>🎬 খেলার অ্যানিমেশন<span>বলের ফল থেকে আঁকা, আসল ভিডিও নয়</span></h3>
<div class="anv"><svg class="pitch" viewBox="0 0 300 200" role="img" aria-label="ক্রিকেট মাঠ">
<defs><radialGradient id="grd"><stop offset="0" stop-color="#2f9e4f"/><stop offset="1" stop-color="#1c6e35"/></radialGradient></defs>
<ellipse cx="${CX}" cy="${CY}" rx="146" ry="96" fill="url(#grd)"/>
<ellipse cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-dasharray="4 4"/>
<ellipse cx="${CX}" cy="${CY}" rx="62" ry="44" fill="none" stroke="#fff" stroke-opacity=".2"/>
<rect x="143" y="64" width="14" height="72" rx="2" fill="#d8c08a"/>
<g class="stA" fill="#fff"><rect x="146" y="66" width="1.6" height="7"/><rect x="149.2" y="66" width="1.6" height="7"/><rect x="152.4" y="66" width="1.6" height="7"/></g>
<g class="stB" fill="#fff"><rect x="146" y="127" width="1.6" height="7"/><rect x="149.2" y="127" width="1.6" height="7"/><rect x="152.4" y="127" width="1.6" height="7"/></g>
<g class="p bwl"><circle r="4.2" fill="#fbbf24" stroke="#111" stroke-width=".8"/></g>
<g class="p bt1"><circle r="4.2" fill="#38bdf8" stroke="#111" stroke-width=".8"/></g>
<g class="p bt2"><circle r="4.2" fill="#38bdf8" stroke="#111" stroke-width=".8"/></g>
<g class="p kpr"><circle r="3.6" fill="#fbbf24" fill-opacity=".8"/></g>
<g class="ball"><circle r="2.6" fill="#ef4444" stroke="#fff" stroke-width=".6"/></g>
</svg><div class="ban" hidden></div></div>
<div class="ovr"><small>এই ওভার</small><span class="ovb"></span></div>
<div class="anb"><button type="button" class="rp">▶ শেষ ৬ বল আবার দেখুন</button><span class="poss"></span></div>`;
  cur.el = box.querySelector('.anv');
  const q = s => box.querySelector(s);
  cur.ball = q('.ball'); cur.bwl = q('.bwl'); cur.bt1 = q('.bt1'); cur.bt2 = q('.bt2');
  place(q('.kpr'), CX, 146, 0);
  crReset(cur);
  q('.rp').onclick = () => crReplay();
}
function crReset(me) {
  place(me.bwl, CX + 4, 54, 300); place(me.bt1, CX - 7, 124, 300); place(me.bt2, CX + 8, 72, 300); place(me.ball, CX + 4, 58, 0);
  me.ball.style.opacity = 0;
}
const balls = det => ((det && det.comm) || []).filter(c => /^[0-9a-zA-Z]$/.test(c.k) && 'W46r0x'.includes(c.k) && c.o);
function runsOf(c) {
  if (c.k === '4') return 4; if (c.k === '6') return 6; if (c.k === '0' || c.k === 'W') return 0;
  const m = String(c.t).match(/[০-৯0-9]+/);
  return m ? toNum(m[0]) : 1;
}
function chip(c) {
  const t = c.k === 'W' ? 'W' : c.k === 'x' ? 'wd' : c.k === '0' ? '•' : bn(runsOf(c));
  return `<i class="k${c.k}">${t}</i>`;
}
function crUpdate() {
  const me = cur, { m, det } = me;
  const box = me.el.closest('.box');
  const list = balls(det);
  const top = list[0];
  // এই ওভারের বল (পুরনোটা আগে)
  const ov = top ? String(top.o).split('.')[0] : null;
  const same = top ? list.filter(c => String(c.o).split('.')[0] === ov && (c.inn ?? top.inn) === top.inn).slice(0, 10).reverse() : [];
  box.querySelector('.ovb').innerHTML = same.length ? same.map(chip).join('') : '<small>এখনো বলের হিসাব আসেনি</small>';
  box.querySelector('.ovr small').textContent = top ? `${bn(+ov + 1)} নম্বর ওভার` : 'এই ওভার';
  box.querySelector('.rp').hidden = list.length < 2;
  const last = (m.inns || [])[(m.inns || []).length - 1];
  box.querySelector('.poss').textContent = last ? `স্কোর ${bn(last.r)}/${bn(last.w)} (${bn(last.o)} ওভার)` : '';
  const key = top ? top.o + '|' + top.k + '|' + top.t : '';
  if (me.seen == null) { me.seen = key; if (m.state === 'done') banner(me, esc(m.status || 'খেলা শেষ'), ''); return; }
  if (key && key !== me.seen) {
    // আগের দেখা বলের পর যতগুলো নতুন, সব খেলাই (বেশি হলে শেষ ৬টা)
    const idx = list.findIndex(c => c.o + '|' + c.k + '|' + c.t === me.seen);
    const fresh = (idx < 0 ? list.slice(0, 1) : list.slice(0, idx)).slice(0, 6).reverse();
    me.seen = key;
    playCr(fresh);
  }
}
async function playCr(list) {
  const me = cur;
  while (me.busy) await sleep(300);
  me.busy = true;
  for (const c of list) { if (me.dead) return; await crBall(me, c); }
  me.busy = false;
}
async function crBall(me, c) {
  const box = me.el.closest('.box');
  const lbl = { '4': '🏏 চার!', '6': '🚀 ছক্কা!', W: '☝️ আউট!', '0': 'ডট বল', x: 'অতিরিক্ত' }[c.k] || `${bn(runsOf(c))} রান`;
  const txt = `${bn(c.o)} · ${lbl}`;
  if (calm()) { banner(me, txt, c.k === 'W' ? 'red' : c.k === '6' || c.k === '4' ? 'goal' : ''); await sleep(1600); return; }
  crReset(me); await sleep(250);
  // বোলারের দৌড় আর বল ছোড়া
  place(me.bwl, CX + 3, 66, 500); await sleep(520);
  me.ball.style.opacity = 1; place(me.ball, CX + 3, 66, 0); await sleep(30);
  place(me.ball, CX - 2, 122, 420); await sleep(450);
  const ang = R(-Math.PI, Math.PI);
  if (c.k === 'W') {
    place(me.ball, CX, 129, 160); await sleep(180);
    const st = box.querySelector('.stB'); st.classList.remove('fly'); void st.getBBox(); st.classList.add('fly');
    banner(me, txt, 'red');
  } else if (c.k === '4') {
    place(me.ball, CX + RX * Math.cos(ang), CY + RY * Math.sin(ang), 1100); banner(me, txt, 'goal'); await sleep(1100);
  } else if (c.k === '6') {
    const tx = CX + 150 * Math.cos(ang), ty = CY + 100 * Math.sin(ang);
    me.ball.animate([{ transform: `translate(${CX - 2}px,122px) scale(1)` }, { transform: `translate(${(CX + tx) / 2}px,${(122 + ty) / 2 - 30}px) scale(2.6)` }, { transform: `translate(${tx}px,${ty}px) scale(1)` }], { duration: 1200, easing: 'ease-out', fill: 'forwards' });
    banner(me, txt, 'goal'); confetti(me.el); await sleep(1250);
  } else if (c.k === '0') {
    place(me.ball, CX, 144, 300); banner(me, txt, ''); await sleep(400);
  } else {
    const n = Math.min(3, Math.max(1, runsOf(c)));
    place(me.ball, CX + 70 * Math.cos(ang), CY + 48 * Math.sin(ang), 700); banner(me, txt, '');
    for (let i = 0; i < n; i++) {
      const up = i % 2 === 0;
      place(me.bt1, CX - 7, up ? 72 : 124, 520); place(me.bt2, CX + 8, up ? 124 : 72, 520); await sleep(560);
    }
  }
  await sleep(c.k === 'W' ? 1800 : 1100);
  me.ball.getAnimations().forEach(a => a.cancel());
  me.ball.style.opacity = 0;
}
async function crReplay() {
  const me = cur;
  if (!me || me.busy) return;
  await playCr(balls(me.det).slice(0, 6).reverse());
}

/* ---------------- দুই খেলাতেই ---------------- */
function banner(me, html, cls) {
  const b = me.el.querySelector('.ban');
  b.className = 'ban ' + (cls || '');
  b.innerHTML = html;
  b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(me._bt);
  me._bt = setTimeout(() => { if (!me.dead && me.m.state !== 'done') b.hidden = true; }, 2600);
}
function confetti(el) {
  if (calm()) return;
  const cols = ['#fbbf24', '#38bdf8', '#f472b6', '#4ade80', '#fff'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('i');
    s.className = 'cft';
    s.style.left = R(10, 90) + '%';
    s.style.background = cols[i % cols.length];
    s.style.setProperty('--dx', R(-40, 40) + 'px');
    s.style.animationDelay = R(0, 250) + 'ms';
    el.appendChild(s);
    setTimeout(() => s.remove(), 1700);
  }
}
