// খেলাঘর লাইভ স্কোর: পাতার সব কাজ। ডাটা আসে শুধু আমাদের সার্ভার (/api/live) থেকে, সরাসরি কোনো API থেকে নয়।
import { winProb, rates, overUnder, fbOutlook, overProb, crOutlook } from '/live/insight.js';
import { VAPID_KEY } from '/live/push-config.js';
import { drawAnim } from '/live/anim.js';
const API = '/api/live';
// একই কোড দুই পাতায়: লাইভ স্কোর (/live/) আর আলাদা প্রেডিকশন চ্যানেল (/live/predict/)। দুটোর মধ্যে কোনো মিশ্রণ নেই
const PRED = document.body.dataset.mode === 'predict';
const BASE = PRED ? '/live/predict/' : '/live/';
const $ = id => document.getElementById(id);
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const S = { slip: [], comboOn: false, feed: null, sport: 'all', filter: null, day: null, user: null, me: null, open: null, det: null, tab: null, seen: new Set(), pts: 10, exact: 20, fav: new Set(), draft: null, period: 'week' };
try { S.fav = new Set(JSON.parse(localStorage.getItem('kh-live-fav') || '[]')); } catch (e) {}
try { S.slip = JSON.parse(localStorage.getItem('kh-live-slip') || '[]').filter(l => l && l.id); } catch (e) {}
const isFav = m => S.fav.has(m.a.name) || S.fav.has(m.b.name);
// টেস্টে দিনের খেলা শেষ (pause) হলে লাইভে না রেখে "আসন্ন"-তে দেখাই; পরদিন খেলা শুরু হলে আবার লাইভে আসবে
// পুরোনো ডাটায় pause না থাকলেও লেখা দেখে চিনে নিই ("Stumps" / "দিন শেষ")
const paused = m => m.state === 'live' && (m.pause || /stumps/i.test(m.raw || '') || /দিন শেষ/.test(m.status || ''));
const vstate = m => (paused(m) ? 'upcoming' : m.state);
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function dayName(t) {
  const d = new Date(t), n = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
  return diff === 0 ? 'আজ' : diff === 1 ? 'আগামীকাল' : diff === -1 ? 'গতকাল' : `${bn(d.getDate())} ${MON[d.getMonth()]}`;
}
try { const v = localStorage.getItem('kh-live-sport'); if (['all', 'cricket', 'football'].includes(v)) S.sport = v; } catch (e) {}

/* ---------- ছোট সাহায্যকারী ---------- */
function toast(t) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}
async function get(q, auth) {
  const h = {};
  if (auth) { const t = await token(); if (!t) throw new Error('লগইন'); h.authorization = 'Bearer ' + t; }
  const r = await fetch(API + '?' + q, { headers: h });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'সংযোগে সমস্যা');
  return j;
}
const tname = t => t.bn || t.name;
function badge(t, big) {
  const mono = `<span class="mn" style="background:${esc(t.col || '#3b78f0')}" aria-hidden="true">${esc(t.mono || '?')}</span>`;
  if (!t.flag) return mono;
  return `<img class="fl" src="https://flagcdn.com/w${big ? 160 : 80}/${esc(t.flag)}.png" alt="" loading="lazy" decoding="async" data-mono="${esc(t.mono || '?')}" data-col="${esc(t.col || '#3b78f0')}">`;
}
// পতাকা না এলে নামের আদ্যক্ষর
document.addEventListener('error', e => {
  const im = e.target;
  if (!(im instanceof HTMLImageElement) || !im.classList.contains('fl')) return;
  const s = document.createElement('span'); s.className = 'mn'; s.style.background = im.dataset.col; s.textContent = im.dataset.mono; im.replaceWith(s);
}, true);

function when(t) {
  const d = new Date(t), n = new Date();
  const day0 = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(d) - day0(n)) / 864e5);
  const h = d.getHours();
  const per = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  const day = diff === 0 ? 'আজ' : diff === 1 ? 'আগামীকাল' : diff === -1 ? 'গতকাল' : `${bn(d.getDate())} ${MON[d.getMonth()]}`;
  return `${day} ${per} ${bn(h % 12 || 12)}:${bn(pad(d.getMinutes()))}`;
}
function cdText(ms) {
  if (ms <= 0) return 'এখনই, স্কোর আসছে…';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  if (d >= 1) return `${bn(d)} দিন ${bn(h)} ঘণ্টা`;
  return bn(`${pad(h)}:${pad(m)}:${pad(s % 60)}`);
}

/* ---------- স্কোর লেখা ---------- */
const ov = o => bn(String(o));
function innTxt(inns, limited) {
  if (!inns || !inns.length) return '';
  const parts = inns.map(x => bn(x.w >= 10 ? x.r : `${x.r}/${x.w}`));
  const last = inns[inns.length - 1];
  return parts.join(' & ') + (limited || inns.length === 1 ? `<small>(${ov(last.o)})</small>` : '');
}
function batSide(m) {
  if (m.sport !== 'cricket' || m.state !== 'live' || paused(m) || !m.inns || !m.inns.length) return null;
  return m.inns[m.inns.length - 1].side;
}
function scoreOf(m, side) {
  const t = m[side];
  if (m.sport === 'cricket') return innTxt(t.inn, !m.test);
  if (t.g == null) return '';
  const pen = m.pen ? ` <span class="pen">(${bn(m.pen[side === 'a' ? 0 : 1])})</span>` : '';
  return bn(t.g) + pen;
}
const kindIcon = { G: '⚽', Y: '🟨', R: '🟥', S: '🔁', V: '📺', x: '❌', P: '🎯', i: '⏱' };

/* ---------- তালিকা ---------- */
async function loadFeed() {
  try {
    S.feed = await get('f=feed');
    S.pts = S.feed.points || 10; S.exact = S.feed.exact || 20; S.combo = S.feed.combo || { 2: 30, 3: 60, 4: 100, 5: 150, 6: 220 };
    pruneSlip();
    renderList();
    if (S.open) syncOpen();
  } catch (e) {
    if (!S.feed) $('list').innerHTML = `<div class="empty"><span class="em">📡</span>স্কোর আনা যায়নি। ইন্টারনেট দেখে একটু পরে আবার চেষ্টা করুন।<br><br><button class="chip" type="button" onclick="location.reload()">আবার চেষ্টা</button></div>`;
  }
}

function matchesFor(sport) { return (S.feed ? S.feed.matches : []).filter(m => sport === 'all' || m.sport === sport); }

function renderList() {
  const all = matchesFor(S.sport);
  const by = { live: [], upcoming: [], done: [] };
  for (const m of all) (by[vstate(m)] || by.upcoming).push(m);
  $('nLive').textContent = bn(by.live.length); $('nUp').textContent = bn(by.upcoming.length); $('nDone').textContent = bn(by.done.length);
  if (PRED) { // প্রেডিকশনে শুধু আসন্ন খেলা (অনুমান দেওয়ার) আর শেষ খেলা (ফল দেখার)
    by.upcoming = by.upcoming.filter(m => !paused(m) && m.state === 'upcoming'); by.live = [];
    if (S.filter === 'live' || !S.filter) S.filter = 'upcoming';
  }
  if (!S.filter || (!by[S.filter].length && S.autoFilter)) { S.filter = by.live.length ? 'live' : by.upcoming.length ? 'upcoming' : 'done'; S.autoFilter = true; }
  document.querySelectorAll('.chip[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === S.filter));
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === S.sport));
  let list = by[S.filter].slice();
  const q = (S.q || '').trim().toLowerCase();
  if (q) list = list.filter(m => (m.a.name + ' ' + m.b.name + ' ' + (m.a.bn || '') + ' ' + (m.b.bn || '') + ' ' + (m.tour || '') + ' ' + (m.tourEn || '')).toLowerCase().includes(q));
  // তারিখের বোতাম (আসন্ন আর শেষ খেলায়)
  const daysEl = $('days');
  if (S.filter !== 'live') {
    const keys = [...new Map(list.slice().sort((x, y) => S.filter === 'done' ? y.start - x.start : x.start - y.start).map(m => [dayKey(m.start), m.start])).entries()].slice(0, 8);
    if (S.day && !keys.some(([k]) => k === S.day)) S.day = null;
    daysEl.innerHTML = keys.length > 1 ? `<button type="button" class="day" data-day="" aria-pressed="${!S.day}">সব দিন</button>` + keys.map(([k, t]) => `<button type="button" class="day" data-day="${k}" aria-pressed="${S.day === k}">${dayName(t)}</button>`).join('') : '';
    daysEl.hidden = keys.length < 2;
    if (S.day) list = list.filter(m => dayKey(m.start) === S.day);
  } else { daysEl.hidden = true; daysEl.innerHTML = ''; }
  const rk = m => (isFav(m) ? 100 : 0) + (m.rk || (m.intl ? 2 : 1)) + (paused(m) ? 50 : 0);
  // প্রিয় দল আর বড় দলের খেলা আগে (বাংলাদেশ সবার আগে), তারপর সময় অনুযায়ী
  list.sort((x, y) => (rk(y) - rk(x)) || (S.filter === 'done' ? y.start - x.start : x.start - y.start));
  const demoN = all.filter(m => m.demo).length;
  const note = $('demoNote');
  if (demoN) {
    note.hidden = false;
    note.textContent = '"নমুনা" লেখা ম্যাচগুলো কাল্পনিক, পাতা কেমন দেখাবে বোঝানোর জন্য।';
  } else note.hidden = true;
  if (!list.length) {
    const msg = { live: 'এই মুহূর্তে কোনো খেলা চলছে না', upcoming: 'সামনে কোনো খেলা নেই', done: 'সাম্প্রতিক শেষ হওয়া খেলা নেই' }[S.filter];
    $('list').innerHTML = `<div class="empty"><span class="em"></span>${msg}${S.filter === 'live' && by.upcoming.length ? '<br><br><button class="chip" type="button" data-go="upcoming">আসন্ন খেলা দেখুন ›</button>' : ''}</div>`;
    return;
  }
  // আগে ক্রিকেট, তার নিচে ফুটবল; প্রতিটার ভেতরে টুর্নামেন্ট অনুযায়ী
  let html = '';
  for (const sp of ['cricket', 'football']) {
    const part = list.filter(m => m.sport === sp);
    if (!part.length) continue;
    if (S.sport === 'all') html += `<div class="sec ${sp}"><span>${sp === 'cricket' ? '🏏' : '⚽'}</span><b>${sp === 'cricket' ? 'ক্রিকেট' : 'ফুটবল'}</b><em>${bn(part.length)}টি খেলা</em></div>`;
    let lastG = null;
    // ছোট লিগ অনেক থাকলে ভাঁজ করে রাখা (চাপলে খোলে)
    let minor = [];
    if (!q && part.length > 25 && !S.showMinor) { minor = part.filter(m => (m.rk || 1) < 2 && !isFav(m) && !paused(m)); }
    const mset = new Set(minor);
    for (const m of part) {
      if (mset.has(m)) continue;
      const g = paused(m) ? '__pause' : (isFav(m) ? '__fav' : '') + m.tour;
      if (g !== lastG) {
        const title = paused(m) ? '⏸ আজকের খেলা শেষ, পরের দিন আবার শুরু' : (isFav(m) ? '⭐ ' : '') + (m.tour || (sp === 'cricket' ? 'ক্রিকেট' : 'ফুটবল'));
        html += `<div class="grp">${esc(title)}</div>`; lastG = g;
      }
      html += cardHtml(m);
    }
    if (minor.length) html += `<button type="button" class="more" data-minor>▾ আরও ${bn(minor.length)}টি খেলা (ছোট লিগ) দেখুন</button>`;
  }
  if (PRED && S.filter === 'upcoming' && !q) html = freeComboHtml() + html;
  if (!PRED && !q && S.filter !== 'done') html = bigHtml(all) + html;
  $('list').innerHTML = html;
}

function voteChip(m) {
  if (!PRED) return '';
  const p = S.me && S.me.picks && S.me.picks[m.id];
  if (!p) return m.state === 'upcoming' ? '<span class="vt">ভোট দিন</span>' : '';
  const pn = p === 'd' ? 'ড্র' : tname(m[p]);
  if (m.state === 'done' && m.result) {
    if (m.result === 'void') return '<span class="vt lose">বাতিল</span>';
    const sc = S.me.scores && S.me.scores[m.id];
    const ex = sc && m.sport === 'football' && sc[0] === m.a.g && sc[1] === m.b.g;
    return m.result === p ? `<span class="vt win">+${bn(S.pts + (ex ? S.exact : 0))}</span>` : '<span class="vt lose">মেলেনি</span>';
  }
  return `<span class="vt mine">✓ ${esc(pn)}</span>`;
}

function cardHtml(m) {
  const bs = batSide(m);
  const dimOf = s => m.state === 'done' && m.result && m.result !== 'void' && m.result !== 'd' && m.result !== s;
  const row = s => `<div class="tm${dimOf(s) ? ' dim' : ''}">${badge(m[s])}<span class="nm">${esc(tname(m[s]))}${S.fav.has(m[s].name) ? ' <i class="star">★</i>' : ''}${bs === s ? '<span class="bat" title="ব্যাট করছে"></span>' : ''}</span><span class="sc">${scoreOf(m, s)}</span></div>`;
  let pill, foot;
  if (paused(m)) {
    pill = '<span class="pill pause">দিনের খেলা শেষ</span>';
    foot = `<span class="st">${esc(m.status || '')}</span>`;
  } else if (m.state === 'live') {
    pill = `<span class="pill live">${m.sport === 'football' && m.min ? bn(liveMin(m)) + "'" : 'লাইভ'}</span>`;
    foot = `<span class="st hot">${esc(m.status || '')}</span>${m.upd && !halted(m) && Date.now() - m.upd > 5 * 60000 ? `<span class="st old">${bn(Math.floor((Date.now() - m.upd) / 60000))} মিনিট আগের</span>` : ''}`;
  } else if (m.state === 'upcoming') {
    pill = `<span class="pill">${when(m.start)}</span>`;
    foot = m.start - Date.now() < 864e5 ? `<span class="st">শুরু হতে <span class="cd" data-cd="${m.start}">${cdText(m.start - Date.now())}</span></span>` : `<span class="st">${esc(m.status && m.status !== 'খেলা এখনো শুরু হয়নি' && m.status !== 'শুরু হয়নি' ? m.status : 'খেলা শুরু ' + when(m.start))}</span>`;
  } else {
    pill = '<span class="pill done">শেষ</span>';
    foot = `<span class="st">${esc(m.status || '')}</span>`;
  }
  return `<button type="button" class="card ${m.state}" data-id="${esc(m.id)}" aria-label="${esc(tname(m.a))} বনাম ${esc(tname(m.b))}">
<div class="chead"><span class="lb">${esc(m.label || '')}</span>${m.demo ? '<span class="demo">নমুনা</span>' : ''}${pill}</div>
${row('a')}${row('b')}
${probBar(m)}${PRED && m.state === 'upcoming' ? opinions(m) : ''}<div class="cfoot">${foot}${voteChip(m)}</div></button>`;
}
// কার্ডের নিচে জেতার সম্ভাবনার সরু দাগ
// তিন মত: খেলাঘরের হিসাব, দর্শকের ভোট, সেরা অনুমানকারীদের ভোট (প্রতিটায় কে এগিয়ে, কত %)
function opinions(m, big) {
  const top = (arr, n) => { const t = arr[0] + arr[1] + arr[2]; if (!t || t < n) return null; const i = arr.indexOf(Math.max(...arr)); return [['a', 'b', 'd'][i], arr[i] / t]; };
  const lab = k => k === 'd' ? 'ড্র' : esc(tname(m[k]));
  const out = [];
  if (m.pred && m.pred.a != null) { const r = top([m.pred.a, m.pred.b, m.pred.d || 0], 0); if (r) out.push(['', 'খেলাঘর', r]); }
  if (m.fan) { const r = top(m.fan, 3); if (r) out.push(['', 'দর্শক', r]); }
  if (m.exv) { const r = top(m.exv, 2); if (r) out.push(['', 'সেরা অনুমানকারী', r]); }
  if (out.length < 2) return ''; // শুধু হিসাব থাকলে জেতার দাগেই দেখা যায়
  return `<div class="ops${big ? ' big' : ''}">${out.map(([ic, t, [k, v]]) => `<span title="${t}"><small>${t}</small> ${big ? `<b>${lab(k)}</b> ` : `<b class="s${k}">${k === 'd' ? 'ড্র' : esc((m[k].bn || m[k].name || '').slice(0, 10))}</b> `}${bn(Math.round(v * 100))}%</span>`).join('')}</div>`;
}
function probBar(m, big) {
  // খেলা চললে চলমান হিসাব, না চললে আগের পূর্বাভাস
  const p = winProb(m) || (m.state === 'upcoming' && m.pred ? m.pred : null);
  if (!p) return '';
  const pc = x => Math.round(x * 100);
  const seg = `<i class="pa" style="flex:${p.a}"></i>${p.d > 0.01 ? `<i class="pd" style="flex:${p.d}"></i>` : ''}<i class="pb" style="flex:${p.b}"></i>`;
  if (!big) return `<div class="wp" title="জেতার আনুমানিক সম্ভাবনা"><span>${bn(pc(p.a))}%</span><div class="wbar">${seg}</div><span>${bn(pc(p.b))}%</span></div>`;
  return `<div class="wpl"><span>${esc(tname(m.a))} <b>${bn(pc(p.a))}%</b></span>${p.d > 0.01 ? `<span>ড্র <b>${bn(pc(p.d))}%</b></span>` : ''}<span>${esc(tname(m.b))} <b>${bn(pc(p.b))}%</b></span></div><div class="wbar big">${seg}</div>`;
}

/* ---------- বিস্তারিত ---------- */
let detTimer = null;
function openMatch(id, push = true) {
  S.open = id; S.det = null; S.tab = null; S.seen = new Set();
  const m = S.feed && S.feed.matches.find(x => x.id === id);
  $('pane').hidden = false; document.body.style.overflow = 'hidden'; $('pane').scrollTop = 0;
  if (push) history.pushState({ m: id }, '', '#m=' + id);
  if (m) renderDetail(m, null, null);
  else { $('pHero').innerHTML = '<div class="skel" style="margin-top:14px"></div>'; $('vBox').innerHTML = ''; $('pTabs').innerHTML = ''; $('pBody').innerHTML = ''; }
  loadDetail();
}
function closeMatch() {
  S.open = null; $('pane').hidden = true; document.body.style.overflow = ''; clearTimeout(detTimer);
}
async function loadDetail() {
  clearTimeout(detTimer);
  const id = S.open; if (!id) return;
  try {
    const d = await get('f=match&id=' + encodeURIComponent(id));
    if (S.open !== id) return;
    if (d.redirect && d.redirect !== id) {
      // একই ম্যাচ এখন দ্রুত উৎস থেকে আসছে: নতুন ঠিকানায় চলে যাই, আগের ভোটও দেখাই
      if (S.me && S.me.picks && S.me.picks[id] && !S.me.picks[d.redirect]) S.me.picks[d.redirect] = S.me.picks[id];
      S.open = d.redirect; S.seen = new Set();
      try { history.replaceState(history.state && history.state.m ? { m: d.redirect } : null, '', '#m=' + d.redirect); } catch (e) {}
      return loadDetail();
    }
    const prevTop = S.det && S.det.id === id && S.det.det && S.det.det.comm && S.det.det.comm[0];
    d.id = id;
    S.det = d;
    if (!PRED) burstFor(prevTop, d.det && d.det.comm && d.det.comm[0]);
    renderDetail(d.m, d.det, d.votes);
  } catch (e) {
    if (!S.det && S.open === id) $('pBody').innerHTML = `<div class="empty"><span class="em">📡</span>${esc(e.message)}</div>`;
  }
  const m = S.det && S.det.m;
  detTimer = setTimeout(() => { if (!document.hidden) loadDetail(); else detTimer = setTimeout(loadDetail, 5000); }, m && m.state === 'live' ? 15000 : 60000);
}
// তালিকা নতুন হলে খোলা ম্যাচের হেডারও মিলিয়ে নেওয়া
function syncOpen() {
  const m = S.feed.matches.find(x => x.id === S.open);
  if (m && S.det && m.state !== S.det.m.state) loadDetail();
}

function heroScore(m, s) {
  if (m.sport !== 'cricket') return '';
  const t = m[s];
  if (!t.inn || !t.inn.length) return '<span class="s" style="font-size:1rem;color:var(--faint)">–</span>';
  const parts = t.inn.map(x => bn(x.w >= 10 ? x.r : `${x.r}/${x.w}`)).join(' & ');
  return `<span class="s">${parts}<small>${bn(t.inn[t.inn.length - 1].o)} ওভার</small></span>`;
}

function renderDetail(m, det, votes) {
  $('pTitle').textContent = `${tname(m.a)} বনাম ${tname(m.b)}`;
  const bs = batSide(m);
  let mid;
  if (m.sport === 'football' && m.state !== 'upcoming') mid = `<div class="g">${bn(m.a.g ?? 0)} - ${bn(m.b.g ?? 0)}</div>${m.pen ? `<div class="v">টাইব্রেকার ${bn(m.pen[0])}-${bn(m.pen[1])}</div>` : ''}`;
  else mid = '<div class="v">বনাম</div>';
  // পুরনো জমা তথ্যে টাইব্রেকারের শট গোলের তালিকায় থাকতে পারে: টাইব্রেকার হলে ১২০ মিনিটের পরের পেনাল্টি বাদ
  const gl = ((det && det.gl) || []).filter(x => !(m.pen && x.k === 'P' && /^120\+/.test(String(x.m))));
  const goals = s => { const g = gl.filter(x => x.s === s); return g.length ? `<div class="gls">${g.map(x => `<span>${x.k === 'R' ? '🟥' : '⚽'} ${esc(x.n)} ${bn(x.m)}'${x.k === 'P' ? ' (পে.)' : x.k === 'OG' ? ' (আত্মঘাতী)' : ''}</span>`).join('')}</div>` : ''; };
  const team = s => `<div class="t big">${badge(m[s], true)}<b>${esc(tname(m[s]))}${bs === s ? ' <i class="bat" title="ব্যাট করছে"></i>' : ''}</b>${heroScore(m, s)}${goals(s)}<button type="button" class="fav" data-fav="${esc(m[s].name)}" aria-pressed="${S.fav.has(m[s].name)}">${S.fav.has(m[s].name) ? '★ প্রিয়' : '☆ প্রিয়'}</button></div>`;
  let st;
  if (paused(m)) st = `<div class="hst">⏸ ${esc(m.status)}</div>`;
  else if (m.state === 'live') st = `<div class="hst hot">${m.sport === 'football' ? esc(m.status) + (m.min ? ` · ${bn(liveMin(m))}'` : '') : esc(m.status)}</div>`;
  else if (m.state === 'upcoming' && m.start <= Date.now()) st = `<div class="hst hot">খেলা শুরুর সময় হয়ে গেছে (${when(m.start)})</div><div class="hsub">স্কোর কয়েক মিনিটের মধ্যে চলে আসবে, পাতা নিজে থেকেই আপডেট হবে</div>`;
  else if (m.state === 'upcoming') st = `<div class="hst">খেলা শুরু ${when(m.start)}</div><div class="hcd" data-hcd="${m.start}">${hcd(m.start)}</div><button type="button" class="ics" data-ics="${esc(m.id)}">ক্যালেন্ডারে রাখুন</button>`;
  else st = `<div class="hst">${esc(m.status)}</div>`;
  const sub = [m.label, m.toss, m.venue].filter(Boolean).map(esc).join(' · ');
  $('pHero').innerHTML = `<div class="hsub" style="padding-top:12px">${esc(m.tour)}${m.demo ? ' <span class="demo">নমুনা</span>' : ''}</div>
<div class="vs">${team('a')}<div class="mid">${mid}</div>${team('b')}</div>${st}<div class="hsub">${sub}</div>${fresh(m)}${det && det.mom && m.state === 'done' ? `<div class="mom">ম্যান অব দ্য ম্যাচ: <b>${esc(det.mom)}</b></div>` : ''}`;
  renderInsight(m);
  if (!PRED) drawAnim($('aBox'), m, det, tname);
  if (PRED) { renderVote(m, votes); $('pTabs').innerHTML = ''; $('pBody').innerHTML = ''; return; }
  renderFun(m, S.det && S.det.id === m.id ? S.det.react : null);
  const tabs = m.sport === 'cricket' ? [['c', 'বল-বাই-বল'], ['s', 'স্কোরকার্ড']] : [['c', 'ঘটনা'], ['s', 'পরিসংখ্যান']];
  if (m.sport === 'football' && det && det.lu && det.lu.length) tabs.push(['l', 'একাদশ']);
  if (m.sport === 'football' && m.lg && m.season && !m.demo) tabs.push(['t', 'টেবিল']);
  if (m.sport === 'cricket' && m.sid && !m.demo) tabs.push(['t', 'টেবিল']);
  if (!S.tab) S.tab = 'c';
  $('pTabs').innerHTML = tabs.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${t}</button>`).join('');
  if (S.tab === 't') { tableHtml(m); return; }
  if (S.tab === 'l') { $('pBody').innerHTML = luHtml(det); return; }
  $('pBody').innerHTML = det === null && !S.det ? '<div class="skel" style="margin-top:12px"></div>' : (S.tab === 'c' ? commHtml(m, det) : (m.sport === 'cricket' ? cardTbl(det) : statsHtml(det)));
}
// বৃষ্টি বা বিরতিতে খেলা থেমে আছে: তখন স্কোর না বদলানোই স্বাভাবিক, "পুরনো" লেখা দেখাই না
const halted = m => paused(m) || /বৃষ্টি|দেরি|বন্ধ|বিরতি/.test(m.status || '');
// ফুটবলের ঘড়ি: শেষবার জানা মিনিট থেকে নিজে নিজে চলে (সব স্কোর অ্যাপ যেমন করে), তবে ১৫ মিনিটের বেশি আন্দাজ নয়
function liveMin(m) {
  if (!m.min || !m.upd || ['HT', 'BT', 'P', 'SUSP', 'INT'].includes(m.per)) return m.min;
  const add = Math.min(15, Math.floor((Date.now() - m.upd) / 60000));
  const cap = m.per === '1H' ? 45 : m.per === '2H' ? 90 : m.per === 'ET' ? 120 : m.min;
  return Math.max(m.min, Math.min(cap, m.min + add));
}
// স্কোর কতক্ষণ আগের: ৩ মিনিটের বেশি পুরনো হলে সৎভাবে জানিয়ে দিই
function fresh(m) {
  if (m.state !== 'live' || !m.upd || halted(m)) return '';
  const mins = Math.floor((Date.now() - m.upd) / 60000);
  if (mins < 3) return '';
  return `<div class="stale">এই স্কোর ${bn(mins)} মিনিট আগের${m.id[0] === 'c' ? '। এই খেলার তথ্য ধীরে আসে, মাঠে এর মধ্যে আরও কিছু হয়ে থাকতে পারে' : ''}</div>`;
}
// খেলার হিসাব: জেতার সম্ভাবনা আর রান রেট
function renderInsight(m) {
  const box = $('iBox');
  const p = probBar(m, true), r = rates(m), ou = overUnder(m);
  const x = S.det && S.det.id === m.id ? S.det.x : null;
  const v = S.det && S.det.id === m.id ? S.det.votes : null;
  const vt = v ? v.a + v.b + v.d : 0;
  let html = '';
  // এখন মাঠে (ক্রিকেট, চলমান খেলা)
  const dd = S.det && S.det.id === m.id ? S.det.det : null;
  const cur = dd && dd.cur;
  if (!PRED && m.sport === 'cricket' && m.state === 'live' && cur && (cur.bat.length || cur.bowl.length)) {
    html += `<div class="wpt">এখন মাঠে</div><table class="onf"><tbody>${cur.bat.map(b => `<tr><td>${esc(b[0])}</td><td class="r">${bn(b[1])}<small> (${bn(b[2])} বল)</small></td><td><small>৪×${bn(b[3])} ৬×${bn(b[4])}</small></td></tr>`).join('')}${cur.bowl.map(b => `<tr class="bw"><td>${esc(b[0])}</td><td class="r">${bn(b[3])}/${bn(b[2])}</td><td><small>${bn(b[1])} ওভার</small></td></tr>`).join('')}</tbody></table>
<div class="onm">${cur.part != null ? `<span>জুটি <b>${bn(cur.part)}</b></span>` : ''}${cur.last ? `<span>শেষ উইকেট: ${esc(cur.last[0])} ${bn(cur.last[1])}${cur.last[2] != null ? ` (দলের রান ${bn(cur.last[2])})` : ''}</span>` : ''}</div>`;
  }
  if (p) html += `<div class="wpt">${m.state === 'upcoming' ? 'কে জিততে পারে (খেলাঘরের পূর্বাভাস)' : 'জেতার সম্ভাবনা'}</div>${p}`;
  if (m.state === 'upcoming' && m.pred) html += `<div class="why">${why(m)}</div>`;
  if (m.state === 'upcoming') { const op = opinions(m, true); if (op) html += `<div class="sub2">কে কী বলছে</div>${op}`; }
  if (m.state === 'upcoming' && vt >= 3) html += `<div class="wpt" style="margin-top:8px">জনতার ভোট: ${esc(tname(m.a))} ${bn(Math.round(v.a / vt * 100))}%${m.sport === 'football' || m.test ? ` · ড্র ${bn(Math.round(v.d / vt * 100))}%` : ''} · ${esc(tname(m.b))} ${bn(Math.round(v.b / vt * 100))}%</div>`;
  const chips = r.concat(ou.map(([k, val]) => [k, bn(val) + '%']));
  if (chips.length) html += `<div class="rts">${chips.map(([k, val]) => `<div><small>${k}</small><b>${val}</b></div>`).join('')}</div>`;
  if (x) {
    const fm = s2 => [...(s2 || '')].map(c => `<i class="fm f${c}">${{ W: 'জ', D: 'ড্র', L: 'হা' }[c] || c}</i>`).join('');
    if (x.form && (x.form.a || x.form.b)) html += `<div class="sub2">শেষ ৫ খেলার ফর্ম</div><div class="frm"><span>${esc(tname(m.a))}</span><span>${fm(x.form.a)}</span></div><div class="frm"><span>${esc(tname(m.b))}</span><span>${fm(x.form.b)}</span></div>`;
    if (x.cmp && x.cmp.length) html += `<div class="sub2">দুই দলের তুলনা</div>` + x.cmp.map(([l, a, b]) => `<div class="stat"><div class="l"><b>${bn(Math.round(a))}%</b><span>${esc(l)}</span><b>${bn(Math.round(b))}%</b></div><div class="b"><i style="flex:${a || 0.001}"></i><i style="flex:${b || 0.001}"></i></div></div>`).join('');
    if (x.h2h && x.h2h.length) html += `<div class="sub2">আগের মুখোমুখি</div><ul class="h2h">${x.h2h.map(h => `<li><small>${h.t ? bn(new Date(h.t).getFullYear()) : ''}</small><span>${esc(h.h)}</span><b>${bn(h.hg)} - ${bn(h.ag)}</b><span>${esc(h.a)}</span></li>`).join('')}</ul>`;
  }
  const ol = fbOutlook(m);
  if (ol) html += outlookHtml(m, ol);
  const co = crOutlook(m);
  if (co) html += crOutlookHtml(m, co);
  html += `<div id="wx"></div>`;
  if (!p && !chips.length && !x && !m.city && !ol && !co) { box.hidden = true; return; }
  if (S.feed && S.feed.ai && !m.demo) html += aiBox(m);
  box.hidden = false;
  // নতুন ডাটা এলে বাক্স আবার আঁকা হয়: AI প্রশ্নে যা লেখা হচ্ছিল তা হারাতে দিই না
  const inp = box.querySelector('[data-aiform] input'), typed = inp ? inp.value : '', foc = inp && document.activeElement === inp;
  box.innerHTML = `<h3>খেলার বিশ্লেষণ</h3>${html}`;
  const inp2 = box.querySelector('[data-aiform] input');
  if (inp2 && typed && !(S.ai && S.ai.busy)) inp2.value = typed;
  if (inp2 && foc) inp2.focus();
  weather(m);
}
// ফুটবল: কখন কী হতে পারে
function outlookHtml(m, o) {
  const pc = v => bn(Math.round(v * 100)) + '%';
  const A = esc(tname(m.a)), B = esc(tname(m.b));
  let h = `<div class="sub2">কখন কী হতে পারে${o.live ? ' (এখন থেকে শেষ পর্যন্ত)' : ''}</div><div class="olk">`;
  h += `<div class="olr"><span>${o.live ? 'পরের গোল' : 'প্রথম গোল'}</span><div class="olbar"><i style="flex:${o.next.a}" class="a"></i><i style="flex:${o.next.none}" class="n"></i><i style="flex:${o.next.b}" class="b"></i></div><small>${A} ${pc(o.next.a)} · ${o.live ? 'আর গোল নয়' : 'কোনো গোল নয়'} ${pc(o.next.none)} · ${B} ${pc(o.next.b)}</small></div>`;
  h += `<div class="olc">`;
  h += `<div><small>দুই দলই গোল করবে</small><b>${pc(o.btts)}</b></div>`;
  if (o.half != null) h += `<div><small>প্রথমার্ধে${o.live ? ' আরও' : ''} গোল</small><b>${pc(o.half)}</b></div>`;
  const op = !o.live ? overProb(m, 2) : null;
  if (op != null) h += `<div><small>৩ বা বেশি গোল</small><b>${pc(op)}</b></div>`;
  h += `</div>`;
  if (o.slots.length) {
    const mx = Math.max(...o.slots.map(x => x[1]));
    h += `<div class="sub3">কোন সময়ে গোলের সম্ভাবনা বেশি</div><div class="slots">${o.slots.map(([t, v]) => `<div class="${v === mx ? 'hi' : ''}"><i style="height:${Math.round(18 + v / mx * 42)}px"></i><b>${pc(v)}</b><small>${t}'</small></div>`).join('')}</div>`;
  }
  h += `<div class="sub3">সবচেয়ে সম্ভাব্য ফল</div><div class="scs">${o.scores.map(([x, y, q]) => `<span><b>${bn(x)} - ${bn(y)}</b><small>${pc(q)}</small></span>`).join('')}</div>`;
  if (o.n != null && o.n < 3) h += `<div class="olw">এই দলগুলোর সাম্প্রতিক খেলার তথ্য কম, তাই সংখ্যাগুলো মোটামুটি ধারণা মাত্র।</div>`;
  return h + '</div>';
}
// খেলাঘর AI: ম্যাচ নিয়ে প্রশ্ন (উত্তর আসে ম্যাচের তথ্য থেকে)
function aiBox(m) {
  const sug = m.state === 'upcoming' ? ['কে জিততে পারে, কেন?', m.sport === 'football' ? 'কত গোল হতে পারে?' : 'কত রান হতে পারে?', 'দুই দলের ফর্ম কেমন?']
    : m.state === 'live' ? ['এখন কে এগিয়ে, কেন?', 'খেলা কোন দিকে যাচ্ছে?', 'এখন পর্যন্ত সেরা কে?'] : ['খেলাটা কীভাবে শেষ হলো?', 'কে সেরা খেললো?', 'মূল মুহূর্ত কী ছিল?'];
  const last = S.ai && S.ai.id === m.id ? S.ai : null;
  return `<div class="aib"><div class="sub2">এই খেলা নিয়ে প্রশ্ন করুন</div>
<div class="aisg">${sug.map(q => `<button type="button" data-aiq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
<form class="aif" data-aiform><input name="q" maxlength="300" placeholder="এই খেলা নিয়ে যেকোনো প্রশ্ন…" autocomplete="off"><button type="submit">➤</button></form>
<div class="aia" id="aiAns">${last ? `<p class="aiq">${esc(last.q)}</p>${last.busy ? '<p class="ait">ভাবছে…</p>' : `<p class="ait">${esc(last.a).replace(/\n/g, '<br>')}</p>${last.left != null ? `<small>আজ আরও ${bn(last.left)}টা প্রশ্ন করা যাবে</small>` : ''}`}` : '<small>উত্তর দেওয়া হয় এই খেলার তথ্য দেখে।</small>'}</div></div>`;
}
async function askAi(q) {
  const m = S.open && S.feed && (S.feed.matches.find(x => x.id === S.open) || (S.det && S.det.m));
  if (!m || !q) return;
  if (!S.user && !(await login())) return;
  S.ai = { id: m.id, q, busy: true }; renderInsight(m);
  try {
    const t = await token();
    const r = await fetch(API + '?f=ask', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ id: m.id, q }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'উত্তর আসেনি');
    S.ai = { id: m.id, q, a: j.a, left: j.left };
  } catch (e) { S.ai = { id: m.id, q, a: '' + e.message }; }
  renderInsight(m);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-aiq]'); if (b) askAi(b.dataset.aiq); });
document.addEventListener('submit', e => { const f = e.target.closest('[data-aiform]'); if (!f) return; e.preventDefault(); askAi(String(new FormData(f).get('q') || '').trim()); });
// ক্রিকেট: কখন কী হতে পারে
function crOutlookHtml(m, o) {
  const pc = v => bn(Math.round(v * 100)) + '%';
  if (o.up) return o.par ? `<div class="sub2">কী আশা করা যায়</div><div class="olc"><div><small>প্রথম ইনিংসে সাধারণ স্কোর</small><b>${bn(o.par[1])}-${bn(o.par[2])}</b></div><div><small>গড় স্কোর (${bn(o.mo)} ওভারের খেলা)</small><b>${bn(o.par[0])}</b></div></div><div class="olw" style="color:var(--faint)">মাঠ, পিচ আর আবহাওয়া অনুযায়ী এর চেয়ে কম-বেশি হতে পারে। টস জিতে কে কী নেয়, খেলার শুরুতে এখানে দেখাবে।</div>` : '';
  let h = `<div class="sub2">কখন কী হতে পারে <small style="font-weight:500">· এখন ${o.phase}</small></div><div class="olc">`;
  h += `<div><small>পরের ওভারে আনুমানিক রান</small><b>${bn(Math.max(0, Math.floor(o.nextOver - 1)))}-${bn(Math.ceil(o.nextOver + 2))}</b></div>`;
  h += `<div><small>পরের ওভারে উইকেট পড়ার সম্ভাবনা</small><b>${pc(o.wOver)}</b></div>`;
  if (o.mile) h += `<div><small>${bn(o.mile[0])} রান হতে পারে</small><b>${bn(o.mile[1])} ওভারে</b></div>`;
  if (o.proj) h += `<div><small>ইনিংস শেষে সম্ভাব্য স্কোর</small><b>${bn(o.proj[0])}-${bn(o.proj[1])}</b></div>`;
  return h + '</div>';
}
// লাইভ পাতার ওপরে "আজকের বড় খেলা" (বড় প্রতিযোগিতা বা দেশের দলের খেলা, চলমান বা ২৪ ঘণ্টার মধ্যে)
function bigHtml(all) {
  const now = Date.now();
  const L = all.filter(m => !m.demo && !paused(m) && (m.rk || 1) >= 3 && (m.state === 'live' || (m.state === 'upcoming' && m.start < now + 24 * 3600e3)))
    .sort((x, y) => (y.state === 'live') - (x.state === 'live') || (isFav(y) - isFav(x)) || x.start - y.start).slice(0, 8);
  if (L.length < 2) return '';
  const sc = (m, s) => m.sport === 'football' ? bn(m[s].g ?? 0) : (m[s].inn && m[s].inn.length ? bn(m[s].inn[m[s].inn.length - 1].r + '/' + m[s].inn[m[s].inn.length - 1].w) : '');
  return `<div class="bigs"><div class="bigh">আজকের বড় খেলা</div><div class="bigr">${L.map(m => `<button type="button" class="bigm${m.state === 'live' ? ' on' : ''}" data-open="${esc(m.id)}"><small>${m.state === 'live' ? `● লাইভ${m.sport === 'football' && m.min ? ' ' + bn(liveMin(m)) + "'" : ''}` : when(m.start)}</small><span>${badge(m.a)}<b>${esc(tname(m.a))}</b>${m.state === 'live' ? `<i>${sc(m, 'a')}</i>` : ''}</span><span>${badge(m.b)}<b>${esc(tname(m.b))}</b>${m.state === 'live' ? `<i>${sc(m, 'b')}</i>` : ''}</span></button>`).join('')}</div></div>`;
}
// প্রেডিকশন পাতা: খেলাঘরের হিসাবে আজকের ফ্রি কম্বো (শুধু পয়েন্টের খেলা)
function freeCombos() {
  const now = Date.now(), c = [];
  for (const m of (S.feed && S.feed.matches) || []) {
    // ক্রিকেট: দেশের দলের শক্তির তালিকায় একদল বেশ এগিয়ে থাকলে (টেস্ট বাদ)
    if (m.sport === 'cricket' && m.state === 'upcoming' && !m.demo && !m.test && m.pred && m.pred.src === 'rating' && m.start > now + 15 * 60000 && m.start < now + 30 * 3600e3) {
      const pick = m.pred.a >= m.pred.b ? 'a' : 'b', pp = m.pred[pick];
      if (pp >= 0.62) c.push({ m, mk: 'w', pick, p: pp + 0.01 });
      continue;
    }
    if (m.sport !== 'football' || m.state !== 'upcoming' || m.demo || !m.pred || m.pred.la == null) continue;
    if (m.start < now + 15 * 60000 || m.start > now + 30 * 3600e3 || (m.pred.n ?? 9) < 3) continue;
    const opts = [['w', 'a', m.pred.a], ['w', 'b', m.pred.b]];
    const ov = m.oul ? overProb(m, Math.floor(m.oul)) : null;
    if (ov != null) opts.push(['ou', 'o', ov], ['ou', 'u', 1 - ov]);
    const [mk, pick, p] = opts.sort((x, y) => y[2] - x[2])[0];
    c.push({ m, mk, pick, p: p + (m.rk || 1) * 0.01 });
  }
  c.sort((x, y) => y.p - x.p);
  const safe = c.filter(x => x.p >= 0.6).slice(0, 2), big = c.filter(x => x.p >= 0.55).slice(0, 4);
  return { safe: safe.length === 2 ? safe : null, big: big.length >= 3 ? big : null };
}
function freeComboHtml() {
  const { safe, big } = freeCombos();
  S.free = { safe, big };
  const ac = S.feed && S.feed.acc;
  const accLine = ac && ac.t >= 20 ? `<p class="fca">খেলাঘরের পূর্বাভাস গত ৭ দিনে <b>${bn(Math.round(ac.h / ac.t * 100))}%</b> মিলেছে (${bn(ac.t)}টা খেলায়, যেখানে একদল স্পষ্ট এগিয়ে ছিল)</p>` : '';
  if (!safe && !big) return ''; // নিশ্চিত খেলা না থাকলে বাক্সই দেখাই না
  const pc = v => bn(Math.round(Math.min(0.99, v) * 100)) + '%';
  const leg = l => `<li><span>${esc(tname(l.m.a))} বনাম ${esc(tname(l.m.b))}<small>${when(l.m.start)}</small></span><b>${l.mk === 'ou' ? `${l.pick === 'o' ? 'বেশি' : 'কম'} গোল (${bn(l.m.oul)})` : `${esc(tname(l.m[l.pick]))} জিতবে`}<small>${pc(l.p)}</small></b></li>`;
  const card = (k, t, L) => L ? `<div class="fc"><div class="fch"><b>${t}</b><span>সব মিললে +${bn((S.combo || {})[L.length] || 0)} পয়েন্ট · সম্ভাবনা ${pc(L.reduce((x, l) => x * Math.min(0.99, l.p), 1))}</span></div><ul>${L.map(leg).join('')}</ul><button type="button" class="fcgo" data-free="${k}">এই কম্বো স্লিপে নিন</button></div>` : '';
  return `<div class="fcb"><h3>আজকের কম্বো <span>খেলাঘর বিশ্লেষণ</span></h3>${card('safe', 'নিরাপদ কম্বো · ২টা খেলা', safe)}${card('big', 'বড় কম্বো', big)}${accLine}<p class="fcn">এটা শুধু খেলাঘরের পয়েন্টের খেলা, টাকার বাজির জন্য নয়। আন্দাজ ভুলও হতে পারে।</p></div>`;
}
// পূর্বাভাসের কারণ সহজ ভাষায়
function why(m) {
  const p = m.pred, x = S.det && S.det.id === m.id ? S.det.x : null;
  const fav = p.a >= p.b ? m.a : m.b, other = fav === m.a ? m.b : m.a, gap = Math.abs(p.a - p.b);
  const parts = [];
  if (gap < 0.08) parts.push('দুই দল প্রায় সমান, খেলা যেকোনো দিকে যেতে পারে');
  else parts.push(`${esc(tname(fav))} ${gap > 0.3 ? 'বেশ' : 'একটু'} এগিয়ে`);
  if (p.src === 'rating') {
    const host = (String(m.tour || '').match(/tour of ([A-Za-z ]+?)(?:,|\s\d|$)/i) || [])[1];
    if (host) parts.push(`খেলা ${esc(host)}-এ, তাই স্বাগতিকরা নিজের মাঠের সুবিধা পাবে`);
    parts.push('হিসাবটা দলের সাম্প্রতিক শক্তির উপর');
  }
  if (x && x.form) {
    const w = s2 => [...(s2 || '')].filter(c => c === 'W').length;
    if (x.form.a || x.form.b) parts.push(`শেষ ৫ খেলায় ${esc(tname(m.a))} ${bn(w(x.form.a))}টা আর ${esc(tname(m.b))} ${bn(w(x.form.b))}টা জিতেছে`);
  }
  if (x && x.h2h && x.h2h.length) {
    let wa = 0, wb = 0;
    for (const h of x.h2h) { const win = h.hg > h.ag ? h.h : h.ag > h.hg ? h.a : null; if (win === m.a.name) wa++; else if (win === m.b.name) wb++; }
    parts.push(`আগের ${bn(x.h2h.length)} মুখোমুখিতে ${esc(tname(m.a))} ${bn(wa)}, ${esc(tname(m.b))} ${bn(wb)} জয়`);
  }
  if (p.d > 0.25) parts.push('ড্রয়ের সম্ভাবনাও ভালো');
  return parts.join('। ') + '। মনে রাখবেন, এটা আন্দাজ, নিশ্চিত নয়।';
}
// আবহাওয়া: Open-Meteo (ফ্রি, key লাগে না), মাঠের শহর থেকে
const wxCache = {};
const WX = c => c === 0 ? ['☀️', 'রোদ'] : c <= 3 ? ['⛅', 'আংশিক মেঘলা'] : c <= 48 ? ['🌫️', 'কুয়াশা'] : c <= 67 ? ['🌧️', 'বৃষ্টি'] : c <= 77 ? ['❄️', 'তুষার'] : c <= 82 ? ['🌦️', 'থেমে থেমে বৃষ্টি'] : ['⛈️', 'ঝড়বৃষ্টি'];
async function weather(m) {
  const city = String(m.city || '').trim();
  if (!city || m.state === 'done' || m.start > Date.now() + 6 * 864e5) return;
  try {
    let w = wxCache[city];
    if (!w) {
      const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(city)}`)).json();
      const loc = g.results && g.results[0];
      if (!loc) return;
      const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=UTC&forecast_days=7`)).json();
      w = wxCache[city] = { f, name: loc.name };
    }
    const h = w.f.hourly; if (!h) return;
    const t = m.state === 'live' ? Date.now() : m.start;
    let k = 0, best = Infinity;
    h.time.forEach((s2, i) => { const d = Math.abs(Date.parse(s2 + 'Z') - t); if (d < best) { best = d; k = i; } });
    const [ic, txt] = WX(h.weather_code[k]);
    const el = $('wx'); if (!el || S.open !== m.id) return;
    el.innerHTML = `<div class="sub2">${m.state === 'live' ? 'এখন মাঠের আবহাওয়া' : 'খেলার সময়ের আবহাওয়া'} (${esc(w.name)})</div><div class="wxr"><b>${ic} ${bn(Math.round(h.temperature_2m[k]))}°</b><span>${txt}</span><span>☔ বৃষ্টি ${bn(h.precipitation_probability[k] ?? 0)}%</span><span>💨 ${bn(Math.round(h.wind_speed_10m[k]))} কিমি/ঘ</span></div>`;
  } catch (e) {}
}
// ফুটবল লিগের পয়েন্ট টেবিল
const tblCache = {};
async function tableHtml(m) {
  const cr = m.sport === 'cricket';
  const key = cr ? 'c' + m.sid : m.lg + '_' + m.season;
  const draw = d => {
    if (S.tab !== 't' || !S.open) return;
    const g = (d && d.groups) || [];
    if (!g.length) { $('pBody').innerHTML = '<div class="empty"><span class="em">📋</span>এই প্রতিযোগিতার টেবিল নেই</div>'; return; }
    const hi = n => n === m.a.name || n === m.b.name;
    if (cr) {
      $('pBody').innerHTML = g.map(x => `${g.length > 1 && x.name ? `<div class="grp">${esc(x.name)}</div>` : ''}<table class="lt"><thead><tr><th>#</th><th>দল</th><th>খে</th><th>জ</th><th>হা</th><th>ফ.নে.</th><th>নেট রান রেট</th><th>পয়েন্ট</th></tr></thead><tbody>${x.rows.map(r => `<tr class="${hi(r[1]) ? 'hi' : ''}"><td>${bn(r[0])}</td><td>${esc(r[1])}</td><td>${bn(r[2])}</td><td>${bn(r[3])}</td><td>${bn(r[4])}</td><td>${bn(r[5])}</td><td>${r[6] == null ? '-' : (r[6] > 0 ? '+' : '') + bn(r[6].toFixed(3))}</td><td class="r">${bn(r[7])}</td></tr>`).join('')}</tbody></table>`).join('');
      return;
    }
    $('pBody').innerHTML = g.map(x => `${g.length > 1 ? `<div class="grp">${esc(x.name)}</div>` : ''}<table class="lt"><thead><tr><th>#</th><th>দল</th><th>খে</th><th>জ</th><th>ড্র</th><th>হা</th><th>গো.পা.</th><th>পয়েন্ট</th></tr></thead><tbody>${x.rows.map(r => `<tr class="${hi(r[1]) ? 'hi' : ''}"><td>${bn(r[0])}</td><td>${esc(r[1])}</td><td>${bn(r[2])}</td><td>${bn(r[3])}</td><td>${bn(r[4])}</td><td>${bn(r[5])}</td><td>${r[6] > 0 ? '+' : ''}${bn(r[6])}</td><td class="r">${bn(r[7])}</td></tr>`).join('')}</tbody></table>`).join('');
  };
  if (tblCache[key]) return draw(tblCache[key]);
  $('pBody').innerHTML = '<div class="skel" style="margin-top:12px"></div>';
  try { tblCache[key] = await get(cr ? `f=ctable&sid=${m.sid}` : `f=table&lg=${m.lg}&season=${m.season}`); draw(tblCache[key]); }
  catch (e) { $('pBody').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function hcd(start) {
  const ms = Math.max(0, start - Date.now()), s = Math.floor(ms / 1000);
  const v = [[Math.floor(s / 86400), 'দিন'], [Math.floor(s % 86400 / 3600), 'ঘণ্টা'], [Math.floor(s % 3600 / 60), 'মিনিট'], [s % 60, 'সেকেন্ড']];
  return v.map(([n, l]) => `<div><b>${bn(pad(n))}</b><span>${l}</span></div>`).join('');
}

function ballLabel(x) {
  if (x.k === '4') return '৪'; if (x.k === '6') return '৬'; if (x.k === 'W') return 'W'; if (x.k === '0') return '•';
  const d = (String(x.t).match(/^[^০-৯]*([০-৯]+)/) || [])[1];
  if (x.k === 'x') return '+' + (d || '১');
  if (x.k === 'r') return d || '১';
  return '';
}
function commHtml(m, det) {
  const comm = (det && det.comm) || [];
  if (!comm.length) {
    const t = m.state === 'upcoming' ? `খেলা শুরু হলে এখানে বাংলায় ${m.sport === 'cricket' ? 'বল-বাই-বল' : 'গোল, কার্ড আর বদলির'} খবর আসবে`
      : m.state === 'live' ? 'খবর আসছে… কিছুক্ষণ পর আবার দেখুন' : (m.sport === 'cricket' ? 'এই ম্যাচের বল-বাই-বল নেই, স্কোরকার্ড দেখুন' : 'কোনো ঘটনা নেই');
    return `<div class="empty"><span class="em"></span>${t}</div>`;
  }
  let html = '';
  if (m.sport === 'cricket') {
    const first = comm.find(x => x.k !== 'i');
    if (first && m.state === 'live') {
      const ovN = String(first.o).split('.')[0];
      const balls = [];
      for (const x of comm) { // উপর থেকে একটানা একই ওভারের বলগুলো
        if (x.k === 'i') continue;
        if (String(x.o).split('.')[0] !== ovN || !String(x.o).includes('.')) break;
        balls.unshift(x);
      }
      if (balls.length) html += `<div class="over"><small>${bn(+ovN + 1)} নম্বর ওভার:</small>${balls.map(x => `<span class="bl k${x.k}">${ballLabel(x)}</span>`).join('')}</div>`;
    }
  }
  const fresh = S.seen.size > 0;
  html += '<ul class="cm">' + comm.map(x => {
    const key = x.o + '|' + x.t;
    const isNew = fresh && !S.seen.has(key);
    const bub = m.sport === 'cricket' ? (x.k === 'i' ? '<span class="bl ki">✦</span>' : `<span class="bl k${x.k}">${ballLabel(x)}</span>`) : `<span class="bl k${x.k}">${kindIcon[x.k] || '•'}</span>`;
    return `<li class="k${x.k}${isNew ? ' new' : ''}"><div class="o">${bub}${x.o ? bn(x.o) : ''}</div><p>${esc(x.t)}</p></li>`;
  }).join('') + '</ul>';
  comm.forEach(x => S.seen.add(x.o + '|' + x.t));
  return html;
}
// ফুটবলের একাদশ
function luHtml(det) {
  const lu = (det && det.lu) || [];
  if (!lu.length) return '<div class="empty"><span class="em">👕</span>একাদশ এখনো ঘোষণা হয়নি</div>';
  const P = { G: 'গোলকিপার', D: 'ডিফেন্ডার', M: 'মিডফিল্ডার', F: 'ফরোয়ার্ড' };
  return '<div class="lus">' + lu.map(l => `<div class="lu"><h4>${esc(l.t)}${l.f ? ` <span>${esc(l.f)}</span>` : ''}</h4>
<ol>${l.xi.map(p => `<li><b>${p[0] != null ? bn(p[0]) : ''}</b>${esc(p[1] || '')}<small>${P[p[2]] || ''}</small></li>`).join('')}</ol>
${l.sub && l.sub.length ? `<div class="sub2">বদলি</div><ol class="sb">${l.sub.map(p => `<li><b>${p[0] != null ? bn(p[0]) : ''}</b>${esc(p[1] || '')}</li>`).join('')}</ol>` : ''}
${l.coach ? `<div class="sub2">কোচ: ${esc(l.coach)}</div>` : ''}</div>`).join('') + '</div>';
}
// ক্রিকেট: ওভার প্রতি রানের গ্রাফ (লাল দাগ = সেই ওভারে উইকেট)
function ovChart(det) {
  const ov = (det && det.ov) || [];
  if (!ov.length) return '';
  const max = Math.max(12, ...ov.flatMap(x => x.o.map(o => o[0])));
  return ov.map(x => {
    const n = x.o.length, W = 320, H = 110, bw = Math.max(2, Math.min(14, W / Math.max(n, 1) - 2));
    const bars = x.o.map((o, i) => { const h = Math.max(1, o[0] / max * (H - 18)), xx = i * (W / n) + 1;
      return `<rect x="${xx.toFixed(1)}" y="${(H - 14 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${o[0] >= 12 ? '#a78bfa' : '#38bdf8'}"/>${o[1] ? `<circle cx="${(xx + bw / 2).toFixed(1)}" cy="${(H - 18 - h).toFixed(1)}" r="3" fill="#ff3b5c"/>` : ''}`; }).join('');
    const tot = x.o.reduce((t, o) => t + o[0], 0);
    return `<div class="ovc"><div class="sub2">${esc(x.t)} · ওভার প্রতি রান (মোট ${bn(tot)})</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="ওভার প্রতি রানের গ্রাফ">${bars}<text x="0" y="${H - 2}" fill="#737bb3" font-size="9">১</text><text x="${W - 14}" y="${H - 2}" fill="#737bb3" font-size="9">${bn(n)}</text></svg></div>`;
  }).join('');
}
// খেলার সময় ফোনের ক্যালেন্ডারে (.ics ফাইল, সব ফোনে খোলে; ৩০ মিনিট আগে মনে করায়)
function icsFor(m) {
  const t = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const dur = m.sport === 'football' ? 2 * 3600e3 : m.test ? 8 * 3600e3 : 4 * 3600e3;
  const name = `${tname(m.a)} বনাম ${tname(m.b)}`;
  const url = `https://khelaghorbd.online/live/m/${encodeURIComponent(m.id)}`;
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Khelaghor//Live//BN', 'BEGIN:VEVENT', `UID:${m.id}@khelaghorbd.online`, `DTSTAMP:${t(Date.now())}`, `DTSTART:${t(m.start)}`, `DTEND:${t(m.start + dur)}`,
    `SUMMARY:${m.sport === 'cricket' ? '🏏' : '⚽'} ${name}`, `DESCRIPTION:${(m.tour || '').replace(/[,;]/g, ' ')} · লাইভ স্কোর: ${url}`, `URL:${url}`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${name} ৩০ মিনিট পরে`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar;charset=utf-8' }));
  a.download = `khelaghor-${m.id}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('ক্যালেন্ডারের ফাইল নামানো হলো, খুললেই যোগ হবে');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ics]'); if (!b) return;
  const m = S.feed && S.feed.matches.find(x => x.id === b.dataset.ics); if (m) icsFor(m);
});
// ক্রিকেট "ওয়ার্ম": দুই ইনিংসের রান ওভার ধরে পাশাপাশি (কে কখন এগিয়ে ছিল)
function wormChart(det) {
  const ov = ((det && det.ov) || []).slice(0, 2);
  if (ov.length < 2 || ov[0].o.length < 2) return '';
  const cum = x => { let t = 0; return x.o.map(o => (t += o[0])); };
  const A = cum(ov[0]), B = cum(ov[1]);
  const n = Math.max(A.length, B.length), max = Math.max(...A, ...B, 10);
  const W = 320, H = 130, X = i => 6 + (i + 1) / n * (W - 12), Y = v => H - 16 - v / max * (H - 26);
  const line = (arr, col) => `<polyline fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" points="6,${H - 16} ${arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`;
  const dots = (x, arr, col) => x.o.map((o, i) => o[1] ? `<circle cx="${X(i).toFixed(1)}" cy="${Y(arr[i]).toFixed(1)}" r="3.2" fill="${col}" stroke="#fff" stroke-width="1"/>` : '').join('');
  return `<div class="ovc"><div class="sub2">রানের দৌড় <small>ওভার ধরে মোট রান, বিন্দু মানে উইকেট</small></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="দুই ইনিংসের রানের তুলনা">${line(A, '#38bdf8')}${line(B, '#fbbf24')}${dots(ov[0], A, '#38bdf8')}${dots(ov[1], B, '#fbbf24')}<text x="0" y="${H - 2}" fill="#737bb3" font-size="9">০</text><text x="${W - 14}" y="${H - 2}" fill="#737bb3" font-size="9">${bn(n)}</text></svg><div class="wlg"><span><i style="background:#38bdf8"></i>${esc(ov[0].t)}</span><span><i style="background:#fbbf24"></i>${esc(ov[1].t)}</span></div></div>`;
}
function cardTbl(det) {
  const card = (det && det.card) || [];
  if (!card.length) return '<div class="empty"><span class="em">📋</span>খেলা শুরু হলে স্কোরকার্ড দেখা যাবে</div>';
  return wormChart(det) + ovChart(det) + card.map((inn, i) => `<details class="inn"${i === card.length - 1 ? ' open' : ''}><summary><span>${esc(inn.t)}</span><b>${inn.tot ? bn(`${inn.tot.r}/${inn.tot.w}`) + ` <small style="font-size:.75rem;color:var(--dim)">(${bn(inn.tot.o)})</small>` : ''}</b></summary>
<table><thead><tr><th>ব্যাটার</th><th>রান</th><th>বল</th><th>৪</th><th>৬</th></tr></thead><tbody>
${inn.bat.map(b => `<tr><td>${esc(b[0])}<small>${esc(b[1])}</small></td><td class="r">${bn(b[2])}</td><td>${bn(b[3])}</td><td>${bn(b[4])}</td><td>${bn(b[5])}</td></tr>`).join('')}
</tbody></table>${inn.ext != null ? `<div class="ext">অতিরিক্ত: ${bn(inn.ext)}</div>` : ''}
<table><thead><tr><th>বোলার</th><th>ওভার</th><th>মেডেন</th><th>রান</th><th>উইকেট</th></tr></thead><tbody>
${inn.bowl.map(b => `<tr><td>${esc(b[0])}</td><td>${bn(b[1])}</td><td>${bn(b[2])}</td><td>${bn(b[3])}</td><td class="r">${bn(b[4])}</td></tr>`).join('')}
</tbody></table></details>`).join('');
}
function statsHtml(det) {
  const st = (det && det.stats) || [];
  if (!st.length) return '<div class="empty"><span class="em">📊</span>খেলা শুরু হলে পরিসংখ্যান দেখা যাবে</div>';
  const num = v => parseFloat(String(v)) || 0;
  return st.map(([l, a, b]) => {
    const x = num(a), y = num(b), t = x + y || 1;
    return `<div class="stat"><div class="l"><b>${bn(a)}</b><span>${esc(l)}</span><b>${bn(b)}</b></div><div class="b"><i style="flex:${x / t || 0.001}"></i><i style="flex:${y / t || 0.001}"></i></div></div>`;
  }).join('');
}

/* ---------- মজার অংশ: ইমোজি প্রতিক্রিয়া, হাইলাইটস, টিভি ---------- */
const RX = [['fire', '🔥'], ['wow', '😱'], ['clap', '👏'], ['sad', '😭'], ['love', '❤️']];
const rxLocal = {}; let rxQueue = {}, rxTimer = null;
function renderFun(m, react) {
  const r = Object.assign({}, react || {});
  for (const [k] of RX) r[k] = (r[k] || 0) + ((rxLocal[m.id] || {})[k] || 0);
  const q = encodeURIComponent;
  const names = `${m.a.name} vs ${m.b.name}`;
  const hl = `https://www.youtube.com/results?search_query=${q(names + ' highlights ' + (m.tour || ''))}`;
  const tv = `https://www.google.com/search?q=${q(names + ' live TV channel Bangladesh')}`;
  $('fBox').innerHTML = `<h3>দর্শকদের প্রতিক্রিয়া<span>চাপ দিন!</span></h3>
<div class="rx">${RX.map(([k, e]) => `<button type="button" data-rx="${k}" aria-label="${e}">${e}<small>${bn(r[k] || 0)}</small></button>`).join('')}</div>
<div class="lnk">${m.state === 'done' ? `<a href="${hl}" target="_blank" rel="noopener">▶ অফিসিয়াল হাইলাইটস</a>` : `<a class="tv" href="${tv}" target="_blank" rel="noopener">টিভিতে কোথায় দেখাচ্ছে</a>`}</div>`;
}
function sendRx() {
  const q = rxQueue; rxQueue = {}; rxTimer = null;
  for (const [key, n] of Object.entries(q)) {
    const [id, e] = key.split('|');
    fetch(API + '?f=react', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, e, n: Math.min(10, n) }) })
      .then(r => { if (r.ok && S.det && S.det.id === id) { S.det.react = S.det.react || {}; S.det.react[e] = (S.det.react[e] || 0) + n; if (rxLocal[id]) rxLocal[id][e] = Math.max(0, (rxLocal[id][e] || 0) - n); } }).catch(() => {});
  }
}
function flyEmoji(e, x, y) {
  const d = document.createElement('div'); d.className = 'fly'; d.textContent = e;
  d.style.left = (x - 16 + (Math.random() * 30 - 15)) + 'px'; d.style.top = (y - 30) + 'px';
  document.body.appendChild(d); setTimeout(() => d.remove(), 1500);
}
// নতুন চার/ছক্কা/আউট/গোল এলে পর্দা জুড়ে বড় লেখা
function burstFor(prev, top) {
  if (!top || !prev || (prev.o === top.o && prev.t === top.t)) return;
  const txt = { '4': 'চার! 🏏', '6': 'ছক্কা! 🚀', W: 'আউট! ☝️', G: 'গোওওল! ⚽' }[top.k];
  if (!txt) return;
  const b = $('burst'); b.innerHTML = `<b class="k${top.k}">${txt}</b>`; b.hidden = false;
  try { navigator.vibrate && navigator.vibrate(top.k === 'W' || top.k === 'G' ? [80, 60, 80] : 60); } catch (e) {}
  clearTimeout(burstFor.t); burstFor.t = setTimeout(() => { b.hidden = true; }, 1900);
}

/* ---------- ফোনে নোটিফিকেশন (প্রিয় দলের খেলা শুরু, উইকেট, গোল, শেষ) ---------- */
const pushOk = () => !!VAPID_KEY && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
const pushTok = () => { try { return localStorage.getItem('kh-live-push') || ''; } catch (e) { return ''; } };
async function pushSync(token) {
  await fetch(API + '?f=push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, teams: [...S.fav] }) }).catch(() => {});
}
async function enablePush() {
  if (!pushOk()) { toast('এই ফোন বা ব্রাউজারে নোটিফিকেশন চলে না'); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('নোটিফিকেশনের অনুমতি দেওয়া হয়নি'); return false; }
  try {
    const [app, ms, cfg] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js'),
      import('/js/firebase-config.js')
    ]);
    const fa = app.getApps()[0] || app.initializeApp(cfg.firebaseConfig);
    const reg = await navigator.serviceWorker.register('/sw.js');
    const token = await ms.getToken(ms.getMessaging(fa), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) throw new Error('no token');
    try { localStorage.setItem('kh-live-push', token); } catch (e) {}
    await pushSync(token);
    toast('চালু হলো! প্রিয় দলের খেলা শুরু, উইকেট আর গোলের খবর ফোনে পাবেন');
    return true;
  } catch (e) { toast('নোটিফিকেশন চালু করা গেল না, একটু পরে আবার চেষ্টা করুন'); return false; }
}
function pushAfterFav(added) {
  if (!pushOk()) return;
  const t = pushTok();
  if (t && Notification.permission === 'granted') { pushSync(t); return; }
  if (added && Notification.permission === 'default') {
    setTimeout(() => { if (confirm('এই দলের খেলা শুরু, উইকেট আর গোলের খবর ফোনে পেতে চান?')) enablePush(); }, 400);
  }
}

/* ---------- কম্বো (কয়েকটা ম্যাচের অনুমান একসাথে, সব মিললে বোনাস পয়েন্ট) ---------- */
const saveSlip = () => { try { localStorage.setItem('kh-live-slip', JSON.stringify(S.slip)); } catch (e) {} renderSlip(); };
function pruneSlip() {
  const ok = id => { const m = S.feed && S.feed.matches.find(x => x.id === id); return m && m.state === 'upcoming' && m.start > Date.now() && !m.demo; };
  const n = S.slip.length; S.slip = S.slip.filter(l => ok(l.id));
  if (n !== S.slip.length) saveSlip(); else renderSlip();
}
function legText(l) {
  const m = S.feed && S.feed.matches.find(x => x.id === l.id);
  if (!m) return '';
  const what = l.mk === 'ou' ? `${m.sport === 'football' ? 'মোট গোল' : 'মোট রান'} ${bn(m.oul)}-এর ${l.pick === 'o' ? 'বেশি' : 'কম'}` : (l.pick === 'd' ? 'ড্র' : `${tname(m[l.pick])} জিতবে`);
  return { vs: `${tname(m.a)} বনাম ${tname(m.b)}`, what };
}
function addLeg(m, mk, pick) {
  const i = S.slip.findIndex(l => l.id === m.id);
  if (i >= 0 && S.slip[i].mk === mk && S.slip[i].pick === pick) { S.slip.splice(i, 1); toast('কম্বো থেকে বাদ দেওয়া হলো'); }
  else {
    if (i < 0 && S.slip.length >= 6) { toast('কম্বোতে সর্বোচ্চ ৬টা ম্যাচ'); return; }
    if (i >= 0) S.slip.splice(i, 1);
    S.slip.push({ id: m.id, mk, pick });
    toast(i >= 0 ? 'এই ম্যাচের অনুমান বদলানো হলো (কম্বোতে একটা ম্যাচ একবারই)' : `কম্বোতে যোগ হলো (${bn(S.slip.length)}টা)`);
  }
  saveSlip(); renderVote(m, S.det && S.det.votes);
}
function renderSlip() {
  const bar = $('slip'); if (!bar || !PRED) return;
  const n = S.slip.length;
  if (!n) { bar.hidden = true; return; }
  bar.hidden = false;
  const bonus = (S.combo || {})[n];
  bar.innerHTML = `<button type="button" class="slipb" data-slip-open>কম্বো: ${bn(n)}টা ম্যাচ <small>${n >= 2 ? `সব মিললে +${bn(bonus)}` : 'আরও অন্তত ১টা যোগ করুন'}</small></button>`;
}
function openSlip() {
  const n = S.slip.length, bonus = (S.combo || {})[n];
  $('slipList').innerHTML = S.slip.map((l, i) => { const t = legText(l); return `<li><div><b>${esc(t.vs)}</b><small>${esc(t.what)}</small></div><button type="button" class="ib" data-rm="${i}" aria-label="বাদ দিন">✕</button></li>`; }).join('') || '<div class="empty">কম্বো খালি</div>';
  $('slipInfo').innerHTML = n >= 2 ? `সব ${bn(n)}টা মিললে <b>+${bn(bonus)}</b> পয়েন্ট। একটাও না মিললে কিছুই নেই। খেলা বাতিল হলে সেটা বাদ দিয়ে হিসাব।` : 'কম্বো বানাতে অন্তত ২টা আলাদা ম্যাচ লাগবে।';
  $('slipGo').disabled = n < 2;
  $('slipSheet').hidden = false;
}
async function sendSlip() {
  if (!S.user && !(await login())) { toast('কম্বো জমা দিতে Gmail দিয়ে লগইন করুন'); return; }
  $('slipGo').disabled = true;
  try {
    const t = await token();
    const r = await fetch(API + '?f=combo', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ legs: S.slip }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'কম্বো জমা হয়নি');
    S.slip = []; S.comboOn = false; saveSlip(); $('slipSheet').hidden = true;
    toast(`কম্বো জমা হলো! সব মিললে +${bn(j.bonus)} পয়েন্ট`);
    loadMe();
  } catch (e) { toast(e.message); $('slipGo').disabled = S.slip.length < 2; }
}

/* ---------- কে জিতবে? ভোট ---------- */
function renderVote(m, votes) {
  const v = votes || { a: 0, b: 0, d: 0 };
  const opts = [['a', m.a]];
  if (m.sport === 'football' || m.test) opts.push(['d', null]);
  opts.push(['b', m.b]);
  const mine = S.me && S.me.picks && S.me.picks[m.id];
  const myScore = S.me && S.me.scores && S.me.scores[m.id];
  const open = m.state === 'upcoming' && m.start > Date.now();
  const total = v.a + v.b + v.d;
  const sel = mine || (S.draft && S.draft.id === m.id ? S.draft.pick : null);
  const btn = ([k, t]) => `<button type="button" data-vote="${k}" aria-pressed="${sel === k}" ${!open || mine ? 'disabled' : ''}>${t ? badge(t) : '<span class="mn" style="background:#475569">ড্র</span>'}<span>${t ? esc(tname(t)) : 'ড্র'}</span></button>`;
  const fb = m.sport === 'football';
  let html = `<h3>কে জিতবে?<span>সঠিক হলে +${bn(S.pts)}${fb ? `, সঠিক স্কোরে আরও +${bn(S.exact)}` : ''}</span></h3><div class="vbtns">${opts.map(btn).join('')}</div>`;
  // ফুটবল: দল বাছাইয়ের পর সঠিক স্কোর আন্দাজ (ইচ্ছা হলে)
  if (fb && open && !mine && S.draft && S.draft.id === m.id) {
    const d = S.draft;
    const step = (k, val) => `<div class="stp"><button type="button" data-st="${k}-" aria-label="কমান">−</button><b>${bn(val)}</b><button type="button" data-st="${k}+" aria-label="বাড়ান">+</button></div>`;
    html += `<div class="sbox2"><div class="sl">সঠিক স্কোরও আন্দাজ করুন (ইচ্ছা হলে, +${bn(S.exact)} বোনাস)</div>
<div class="srow"><span title="${esc(tname(m.a))}">${badge(m.a)}</span>${step('a', d.ga)}<em>-</em>${step('b', d.gb)}<span title="${esc(tname(m.b))}">${badge(m.b)}</span></div>
<div class="sact"><button type="button" class="cbtn" data-send="score">✓ স্কোরসহ ভোট দিন</button><button type="button" class="lbtn" data-send="pick">শুধু বিজয়ী</button></div></div>`;
  }
  // বেশি/কম অনুমান (ফুটবলে মোট গোল, ক্রিকেটে মোট রান)
  if (m.oul) {
    const myOu = S.me && S.me.ou && S.me.ou[m.id];
    const what = m.sport === 'football' ? `মোট গোল ${bn(m.oul)}` : `দুই দল মিলে মোট রান ${bn(m.oul)}`;
    const inSlip = S.slip.find(l => l.id === m.id && l.mk === 'ou');
    html += `<div class="ouq">${what}-এর বেশি না কম?</div><div class="vbtns ou">
<button type="button" data-ou="o" aria-pressed="${(myOu && myOu.side === 'o') || (S.comboOn && inSlip && inSlip.pick === 'o')}" ${!open || (myOu && !S.comboOn) ? 'disabled' : ''}>⬆️ <span>বেশি</span></button>
<button type="button" data-ou="u" aria-pressed="${(myOu && myOu.side === 'u') || (S.comboOn && inSlip && inSlip.pick === 'u')}" ${!open || (myOu && !S.comboOn) ? 'disabled' : ''}>⬇️ <span>কম</span></button></div>`;
    if (myOu) html += `<div class="vmsg ok">আপনার অনুমান: ${myOu.side === 'o' ? 'বেশি' : 'কম'} (${bn(myOu.line)})</div>`;
  }
  if (open && !m.demo) html += `<label class="ctog"><input type="checkbox" id="comboOn" ${S.comboOn ? 'checked' : ''}> কম্বো মোড: এখানে চাপলে ভোট নয়, কম্বোতে যোগ হবে</label>`;
  if (mine || !open) {
    if (total) {
      const col = { a: 'var(--cyan)', d: '#64748b', b: 'var(--gold)' };
      html += `<div class="vbar">${opts.map(([k]) => `<i style="width:${(v[k] / total * 100).toFixed(1)}%;background:${col[k]}"></i>`).join('')}</div>`;
      html += `<div class="vleg">${opts.map(([k, t]) => `<span>${t ? esc(tname(t)) : 'ড্র'} ${bn(Math.round(v[k] / total * 100))}%</span>`).join('')}</div>`;
    }
  }
  let msg = '', cls = '';
  const scTxt = myScore ? ` (স্কোর ${bn(myScore[0])}-${bn(myScore[1])})` : '';
  if (mine && m.state === 'done' && m.result) {
    const ex = myScore && fb && myScore[0] === m.a.g && myScore[1] === m.b.g;
    if (m.result === 'void') msg = 'ম্যাচের ফল হয়নি, তাই পয়েন্ট নেই';
    else if (m.result === mine) {
      const cl = !ex && myScore && fb && (myScore[0] - myScore[1]) === ((m.a.g || 0) - (m.b.g || 0));
      msg = m.demo ? 'আপনার অনুমান মিলেছে! (নমুনা ম্যাচ, পয়েন্ট যোগ হয় না)' : `আপনার অনুমান মিলেছে! +${bn(S.pts + (ex ? S.exact : 0) + (cl ? 5 : 0))} পয়েন্ট${ex ? ' (একদম সঠিক স্কোর!)' : cl ? ' (স্কোরও কাছাকাছি!)' : ''}`; cls = 'ok';
    }
    else msg = 'এবার মেলেনি, পরের ম্যাচে আবার চেষ্টা করুন';
  } else if (mine) { msg = `✓ আপনার ভোট: ${mine === 'd' ? 'ড্র' : esc(tname(m[mine]))}${scTxt}। খেলা শেষে ফল মিলিয়ে পয়েন্ট দেওয়া হবে`; cls = 'ok'; }
  else if (open) msg = (m.demo ? 'নমুনা ম্যাচ: ভোট দেওয়া যায়, তবে পয়েন্ট যোগ হয় না' : (fb ? 'দল বাছাই করুন, চাইলে সঠিক স্কোরও বলুন' : 'খেলা শুরুর আগ পর্যন্ত ভোট দেওয়া যাবে')) + ` · ভোট বন্ধ হবে <span data-cd="${m.start}">${cdText(m.start - Date.now())}</span> পরে`;
  else msg = m.state === 'live' ? (paused(m) ? 'টেস্ট চলছে, ভোট বন্ধ' : 'খেলা শুরু হয়ে গেছে, ভোট বন্ধ') : 'ভোট বন্ধ';
  html += `<div class="vmsg ${cls}" id="vMsg">${msg}${total ? ` · মোট ${bn(total)} ভোট` : ''}</div>`;
  $('vBox').innerHTML = html;
}
async function doVote(pick, ga = null, gb = null, ou = null) {
  const m = S.det ? S.det.m : S.feed.matches.find(x => x.id === S.open);
  if (!m) return;
  if (!S.user) {
    $('vMsg').textContent = 'ভোট দিতে Gmail দিয়ে লগইন করুন…';
    const ok = await login();
    if (!ok) { $('vMsg').textContent = 'লগইন হয়নি, আবার চেষ্টা করুন'; return; }
  }
  document.querySelectorAll('#vBox button').forEach(b => { b.disabled = true; });
  try {
    const t = await token();
    const body = ou ? { id: m.id, mk: 'ou', side: ou.side } : { id: m.id, pick };
    if (ga != null) Object.assign(body, { ga, gb });
    const r = await fetch(API + '?f=vote', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok && r.status !== 409) throw new Error(j.error || 'ভোট হয়নি');
    S.me = S.me || { pts: 0, ok: 0, n: 0, picks: {}, scores: {} };
    S.draft = null;
    if (r.ok && ou) {
      S.me.ou = S.me.ou || {}; S.me.ou[m.id] = { side: j.side, line: j.line };
      renderVote(m, S.det && S.det.votes);
      toast(`অনুমান নেওয়া হয়েছে! মিললে +${bn(S.pts)}`);
    } else if (r.ok) {
      S.me.picks[m.id] = j.pick || pick;
      if (j.score) { S.me.scores = S.me.scores || {}; S.me.scores[m.id] = j.score; }
      const v = (S.det && S.det.votes) || { a: 0, b: 0, d: 0 };
      v[j.pick || pick]++; if (S.det) S.det.votes = v;
      renderVote(m, v);
      toast('ভোট নেওয়া হয়েছে! খেলা শেষে ফল মিলিয়ে দেখা হবে');
    } else { toast(j.error); loadMe().then(() => renderVote(m, S.det && S.det.votes)); }
    renderList();
  } catch (e) {
    toast(e.message);
    renderVote(m, S.det && S.det.votes);
  }
}

/* ---------- লগইন (খেলাঘরের একই Gmail লগইন) ---------- */
let A = null;
async function fbAuth() {
  if (A) return A;
  A = (async () => {
    const [app, au, cfg] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('/js/firebase-config.js')
    ]);
    const fa = app.getApps()[0] || app.initializeApp(cfg.firebaseConfig);
    const auth = au.getAuth(fa);
    await new Promise(res => { const un = au.onAuthStateChanged(auth, u => { S.user = u; un(); res(); }); });
    au.onAuthStateChanged(auth, u => { const was = S.user; S.user = u; if (!!was !== !!u) loadMe(); });
    au.getRedirectResult(auth).catch(() => {});
    return { au, auth };
  })();
  return A;
}
async function token() { await fbAuth(); return S.user ? S.user.getIdToken() : null; }
async function login() {
  const { au, auth } = await fbAuth();
  const p = new au.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await au.signInWithPopup(auth, p); S.user = auth.currentUser; await loadMe(); return true; }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await au.signInWithRedirect(auth, p); return false; }
    return false;
  }
}
async function loadMe() {
  if (!S.user) { S.me = null; $('ptsTxt').textContent = 'লিডারবোর্ড'; renderList(); return; }
  try {
    S.me = await get('f=me', true);
    $('ptsTxt').textContent = bn(S.me.pts) + ' পয়েন্ট';
    // আগের বারের চেয়ে পয়েন্ট বাড়লে জানানো (খেলা শেষে অনুমান মিলেছে)
    try {
      const key = 'kh-live-pts-' + S.user.uid, before = localStorage.getItem(key);
      if (before != null && S.me.pts > +before) toast(`আপনার অনুমান মিলেছে! +${bn(S.me.pts - +before)} পয়েন্ট`);
      localStorage.setItem(key, String(S.me.pts));
    } catch (e) {}
  } catch (e) { S.me = null; }
  if (S.feed) renderList();
  if (S.open && S.det) renderVote(S.det.m, S.det.votes);
}

/* ---------- লিডারবোর্ড ---------- */
async function openBoard() {
  $('lbSheet').hidden = false;
  const cb = S.combo || {};
  $('lbRules').innerHTML = `খেলা শুরুর আগে অনুমান দিন: কে জিতবে, আর মোট গোল/রান বেশি না কম। প্রতিটা মিললে +${bn(S.pts)}। ফুটবলে একদম সঠিক স্কোরে আরও +${bn(S.exact)}, বিজয়ী আর গোলের ব্যবধান মিললে +৫। টানা মিললে 🔥 স্ট্রিক বাড়ে।<br>কম্বো: কয়েকটা ম্যাচের অনুমান একসাথে, সব মিললে বোনাস (২টা +${bn(cb[2])}, ৩টা +${bn(cb[3])}, ৪টা +${bn(cb[4])}, ৫টা +${bn(cb[5])}, ৬টা +${bn(cb[6])})।<br><b>এটা শুধু মজার অনুমানের খেলা: পয়েন্ট কেনা যায় না, টাকা বা পুরস্কারে বদলানো যায় না।</b> সাপ্তাহিক লিডারবোর্ড প্রতি সোমবার নতুন করে শুরু হয়।`;
  meBox();
  loadBoard();
}
// বন্ধুদের গ্রুপ: বানানো, লিংক দিয়ে যোগ দেওয়া, গ্রুপের লিডারবোর্ড
function renderGroups() {
  const box = $('grpBox'); if (!box) return;
  const gs = (S.me && S.me.groups) || [];
  box.innerHTML = `<div class="gtabs"><button type="button" data-grp="" aria-pressed="${!S.grp}">সবাই</button>${gs.map(g => `<button type="button" data-grp="${esc(g.code)}" aria-pressed="${S.grp === g.code}">${esc(g.name)}</button>`).join('')}</div>
${S.grp ? `<div class="ginv">বন্ধুদের ডাকুন: <b>${esc(S.grp)}</b> <button type="button" class="lbtn" data-ginv>লিংক শেয়ার</button> <button type="button" class="lbtn" data-gleave>গ্রুপ ছাড়ুন</button></div>` : ''}
${S.user ? `<details class="gnew"><summary>বন্ধুদের নিয়ে নতুন গ্রুপ / কোড দিয়ে যোগ দিন</summary><div class="grow"><input id="gName" maxlength="30" placeholder="গ্রুপের নাম (যেমন: অফিসের বন্ধুরা)"><button type="button" class="cbtn" data-gnew>বানান</button></div><div class="grow"><input id="gCode" maxlength="6" placeholder="৬ অক্ষরের কোড"><button type="button" class="lbtn" data-gjoin>যোগ দিন</button></div></details>` : ''}`;
}
async function grpAct(body) {
  const t = await token(); if (!t) { toast('আগে Gmail দিয়ে লগইন করুন'); return null; }
  const r = await fetch(API + '?f=group', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { toast(j.error || 'হয়নি'); return null; }
  return j;
}
async function joinFromLink() {
  const code = (location.hash.match(/join=([A-Za-z0-9]{6})/) || [])[1];
  if (!code || !PRED) return;
  if (!S.user && !(await login())) { toast('গ্রুপে যোগ দিতে Gmail দিয়ে লগইন করুন'); return; }
  const j = await grpAct({ act: 'join', code });
  history.replaceState(null, '', location.pathname);
  if (j) { await loadMe(); S.grp = j.code; toast(`"${j.name}" গ্রুপে যোগ দিয়েছেন!`); openBoard(); }
}
async function loadBoard() {
  renderGroups();
  document.querySelectorAll('[data-per]').forEach(b => b.setAttribute('aria-pressed', b.dataset.per === S.period));
  $('lbList').innerHTML = '<div class="skel" style="height:60px"></div>';
  try {
    document.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sort === (S.lbSort || 'pts')));
    const d = S.grp ? await get(`f=gboard&code=${encodeURIComponent(S.grp)}&p=${S.period}`) : await get('f=board&p=' + S.period + '&s=' + (S.lbSort || 'pts'));
    const medal = ['🥇', '🥈', '🥉'];
    const so = S.grp ? 'pts' : (S.lbSort || 'pts');
    const list = d.list.filter(x => so !== 'pts' || x.pts > 0 || S.period === 'all');
    const big = x => so === 'acc' ? `${bn(x.acc ?? 0)}%` : so === 'st' ? `🔥${bn(x.st)}` : bn(x.pts);
    $('lbList').innerHTML = list.length ? list.map((x, i) => `<li><span class="rk">${medal[i] || bn(i + 1)}</span><span class="nm">${esc(x.name)}${x.st >= 3 && so !== 'st' ? ` <i class="stk">🔥${bn(x.st)}</i>` : ''}<small>${x.acc != null ? `সঠিক ${bn(x.acc)}% · ` : ''}${bn(x.ok)}টি সঠিক${x.ex ? ` · ${bn(x.ex)}টি একদম সঠিক স্কোর` : ''} · ${bn(x.n)}টি ভোট${x.best >= 3 ? ` · সেরা টানা ${bn(x.best)}` : ''}</small></span><span class="p">${big(x)}</span></li>`).join('')
      : `<div class="empty"><span class="em">🏆</span>${S.period === 'week' ? 'এই সপ্তাহে এখনো কেউ পয়েন্ট পায়নি। প্রথম হোন!' : 'এখনো কেউ পয়েন্ট পায়নি। প্রথম হোন!'}</div>`;
  } catch (e) { $('lbList').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function meBox() {
  if (S.user && S.me) {
    const cs = (S.me.combos || []).slice(0, 5);
    const rIc = r => (r === true ? '✅' : r === false ? '❌' : r === 'void' ? '➖' : '⏳');
    const cHtml = cs.length ? `<div class="sub2">আমার কম্বো</div><ul class="mycb">${cs.map(c => `<li><div>${c.legs.map(l => `<span>${rIc(l.r)} ${esc(l.t)}</span>`).join('')}</div><b class="${c.res === true ? 'w' : c.res === false ? 'l' : ''}">${c.res === true ? '+' + bn(c.bonus) : c.res === false ? 'মেলেনি' : c.res === 'void' ? 'বাতিল' : '+' + bn(c.bonus)}</b></li>`).join('')}</ul>` : '';
    $('lbMe').innerHTML = `<div class="me"><div class="n"><b>${esc(S.me.name || S.user.displayName || 'আমি')}${S.me.st >= 2 ? ` 🔥${bn(S.me.st)}` : ''}</b><small>${bn(S.me.ok)}টি সঠিক · ${bn(S.me.n)}টি ভোট · এই সপ্তাহে ${bn(S.me.week || 0)}${S.me.best >= 3 ? ` · সেরা স্ট্রিক ${bn(S.me.best)}` : ''}</small></div><div class="p">${bn(S.me.pts)}</div></div>${cHtml}`;
  } else {
    $('lbMe').innerHTML = `<button class="gbtn" type="button" id="lbLogin"><svg viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1S8.7 5.7 12 5.7c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6z"/></svg>Gmail দিয়ে লগইন করে পয়েন্ট দেখুন</button>`;
    $('lbLogin').onclick = async () => { if (await login()) meBox(); };
  }
}

/* ---------- চাপ আর বোতাম ---------- */
document.querySelector('.seg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.sport = b.dataset.s; S.filter = null;
  try { localStorage.setItem('kh-live-sport', S.sport); } catch (er) {}
  renderList();
});
document.querySelector('.chips').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.filter = b.dataset.f; S.autoFilter = false; renderList();
});
$('list').addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { S.filter = g.dataset.go; S.autoFilter = false; renderList(); return; }
  if (e.target.closest('[data-minor]')) { S.showMinor = true; renderList(); return; }
  const bo = e.target.closest('[data-open]'); if (bo) { openMatch(bo.dataset.open); return; }
  const fr = e.target.closest('[data-free]');
  if (fr) {
    const L = S.free && S.free[fr.dataset.free];
    if (!L) return;
    S.slip = L.map(l => ({ id: l.m.id, mk: l.mk, pick: l.pick }));
    saveSlip(); openSlip();
    toast('কম্বো স্লিপে নেওয়া হলো, চাইলে বদলে নিন');
    return;
  }
  const c = e.target.closest('.card'); if (c) openMatch(c.dataset.id);
});
$('q').addEventListener('input', e => { S.q = e.target.value; clearTimeout(S.qT); S.qT = setTimeout(renderList, 150); });
$('days').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (!b) return; S.day = b.dataset.day || null; renderList(); });
document.querySelector('.lbtabs').addEventListener('click', e => { const b = e.target.closest('[data-per]'); if (!b) return; S.period = b.dataset.per; loadBoard(); });
document.querySelector('.lbsort')?.addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; S.lbSort = b.dataset.sort; loadBoard(); });
// প্রিয় দল
$('pHero').addEventListener('click', e => {
  const b = e.target.closest('[data-fav]'); if (!b) return;
  const n = b.dataset.fav;
  if (S.fav.has(n)) S.fav.delete(n); else { S.fav.add(n); toast('প্রিয় দলে যোগ হলো, এই দলের খেলা সবার উপরে দেখাবে'); }
  try { localStorage.setItem('kh-live-fav', JSON.stringify([...S.fav].slice(-30))); } catch (er) {}
  pushAfterFav(S.fav.has(n));
  const d = S.det, m = d ? d.m : S.feed.matches.find(x => x.id === S.open);
  if (m) renderDetail(m, d ? d.det : null, d ? d.votes : null);
  renderList();
});
$('pBack').onclick = () => { if (history.state && history.state.m) history.back(); else { closeMatch(); history.replaceState(null, '', location.pathname); } };
$('pTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  S.tab = b.dataset.tab;
  const d = S.det;
  const m = d ? d.m : S.feed.matches.find(x => x.id === S.open);
  if (m) renderDetail(m, d ? d.det : null, d ? d.votes : null);
});
$('vBox').addEventListener('click', e => {
  const m = S.det ? S.det.m : S.feed.matches.find(x => x.id === S.open);
  if (!m) return;
  const tg = e.target.closest('#comboOn');
  if (tg) { S.comboOn = tg.checked; return renderVote(m, S.det && S.det.votes); }
  const ob = e.target.closest('[data-ou]');
  if (ob && !ob.disabled) {
    if (S.comboOn) return addLeg(m, 'ou', ob.dataset.ou);
    return doVote(null, null, null, { mk: 'ou', side: ob.dataset.ou });
  }
  const b = e.target.closest('[data-vote]');
  if (b && !b.disabled && S.comboOn) return addLeg(m, 'w', b.dataset.vote);
  if (b && !b.disabled) {
    if (m.sport !== 'football') return doVote(b.dataset.vote);
    const k = b.dataset.vote; // ফুটবল: আগে দল বাছাই, তারপর স্কোর (ইচ্ছা হলে)
    S.draft = { id: m.id, pick: k, ga: k === 'b' ? 0 : 1, gb: k === 'a' ? 0 : 1 };
    return renderVote(m, S.det && S.det.votes);
  }
  const st = e.target.closest('[data-st]');
  if (st && S.draft) {
    const [side, op] = [st.dataset.st[0], st.dataset.st[1]];
    const key = side === 'a' ? 'ga' : 'gb';
    S.draft[key] = Math.max(0, Math.min(15, S.draft[key] + (op === '+' ? 1 : -1)));
    S.draft.pick = S.draft.ga > S.draft.gb ? 'a' : S.draft.gb > S.draft.ga ? 'b' : 'd';
    return renderVote(m, S.det && S.det.votes);
  }
  const sd = e.target.closest('[data-send]');
  if (sd && S.draft) return sd.dataset.send === 'score' ? doVote(S.draft.pick, S.draft.ga, S.draft.gb) : doVote(S.draft.pick);
});
$('pShare').onclick = async () => {
  const m = S.det ? S.det.m : S.feed && S.feed.matches.find(x => x.id === S.open);
  // শেয়ারের লিংক এমন ঠিকানায়, যেটা ফেসবুক/হোয়াটসঅ্যাপে স্কোরসহ প্রিভিউ দেখায়
  // লাইভ স্কোরে ম্যাচের নিজের পাতা (Google-এও আসে), প্রেডিকশনে প্রিভিউ লিংক
  const url = PRED ? location.origin + '/api/live?f=share&p=1&id=' + encodeURIComponent(S.open || '') : location.origin + '/live/m/' + encodeURIComponent(S.open || '');
  const text = m ? `${tname(m.a)} বনাম ${tname(m.b)}: লাইভ স্কোর বাংলায়, আর কে জিতবে ভোট দিন!` : 'লাইভ স্কোর বাংলায়';
  let file = null;
  try { if (m) file = await shareImage(m); } catch (e) {}
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'খেলাঘর লাইভ স্কোর', text: text + ' ' + url });
    else if (navigator.share) await navigator.share({ title: 'খেলাঘর লাইভ স্কোর', text, url });
    else {
      if (file) { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
      await navigator.clipboard.writeText(text + ' ' + url).catch(() => {});
      toast(file ? 'ছবি নামানো হলো, লিংকও কপি হয়েছে' : 'লিংক কপি হয়েছে');
    }
  } catch (e) {}
};
// শেয়ারের জন্য স্কোরের ছবি (১০৮০x১০৮০)
async function shareImage(m) {
  const W = 1080, c = document.createElement('canvas'); c.width = W; c.height = W;
  const x = c.getContext('2d');
  try { await document.fonts.ready; } catch (e) {}
  const g = x.createLinearGradient(0, 0, 0, W); g.addColorStop(0, '#2a3aa8'); g.addColorStop(0.55, '#121a4a'); g.addColorStop(1, '#0b1030');
  x.fillStyle = g; x.fillRect(0, 0, W, W);
  x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(W / 2, 1180, 300 + i * 70, 0, Math.PI * 2); x.fill(); }
  const F = (w, s) => `${w} ${s}px 'Baloo Da 2','Noto Sans Bengali',sans-serif`;
  x.textAlign = 'center'; x.fillStyle = '#fff';
  x.font = F(800, 46); x.fillText('খেলাঘর লাইভ স্কোর', W / 2, 110);
  x.font = F(600, 34); x.fillStyle = '#a9b0e0'; x.fillText(`${m.sport === 'cricket' ? '🏏' : '⚽'} ${String(m.tour || '').slice(0, 44)}`, W / 2, 170);
  if (m.state === 'live') { x.fillStyle = '#ff3b5c'; rr(x, W / 2 - 90, 205, 180, 56, 28); x.fill(); x.fillStyle = '#fff'; x.font = F(800, 32); x.fillText(m.sport === 'football' && m.min ? `● ${bn(m.min)}'` : '● লাইভ', W / 2, 244); }
  const loadImg = src => new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const side = async (s, cx) => {
    const t = m[s];
    const im = t.flag ? await loadImg(`https://flagcdn.com/w320/${t.flag}.png`) : null;
    if (im) { x.save(); rr(x, cx - 130, 320, 260, 175, 22); x.clip(); x.drawImage(im, cx - 130, 320, 260, 175); x.restore(); }
    else { x.fillStyle = t.col || '#3b78f0'; x.beginPath(); x.arc(cx, 405, 95, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.font = F(800, 70); x.fillText(t.mono || '?', cx, 430); }
    x.fillStyle = '#fff'; x.font = F(800, 50); x.fillText(String(tname(t)).slice(0, 16), cx, 580);
    if (m.sport === 'cricket' && t.inn && t.inn.length) {
      const l = t.inn[t.inn.length - 1];
      x.font = F(800, 92); x.fillText(bn(l.w >= 10 ? l.r : `${l.r}/${l.w}`), cx, 700);
      x.font = F(600, 36); x.fillStyle = '#a9b0e0'; x.fillText(`${bn(l.o)} ওভার`, cx, 752);
    }
  };
  await side('a', 280); await side('b', 800);
  x.fillStyle = '#fff';
  if (m.sport === 'football' && m.a.g != null) { x.font = F(800, 150); x.fillText(`${bn(m.a.g)} - ${bn(m.b.g)}`, W / 2, 720); }
  else { x.font = F(700, 44); x.fillStyle = '#737bb3'; x.fillText('বনাম', W / 2, 420); }
  x.fillStyle = '#ffd0d8'; x.font = F(700, 40);
  const pr = m.state === 'upcoming' && m.pred ? ` · পূর্বাভাস: ${tname(m.a)} ${bn(Math.round(m.pred.a * 100))}%${m.pred.d > 0.01 ? ` · ড্র ${bn(Math.round(m.pred.d * 100))}%` : ''} · ${tname(m.b)} ${bn(Math.round(m.pred.b * 100))}%` : '';
  const st = m.state === 'upcoming' ? `খেলা শুরু ${when(m.start)}${pr}` : String(m.status || '');
  wrap(x, st, W / 2, 850, 940, 50);
  x.fillStyle = '#ffc727'; rr(x, 190, 950, 700, 84, 42); x.fill();
  x.fillStyle = '#2b1a00'; x.font = F(800, 38); x.fillText('khelaghorbd.online/live', W / 2, 1005);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return new File([blob], 'khelaghor-score.png', { type: 'image/png' });
}
function rr(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
function wrap(x, t, cx, y, maxW, lh) {
  const words = String(t).split(' '); let line = '', n = 0;
  for (const w of words) { const test = line ? line + ' ' + w : w; if (x.measureText(test).width > maxW && line) { x.fillText(line, cx, y + n * lh); line = w; n++; if (n > 1) return; } else line = test; }
  x.fillText(line, cx, y + n * lh);
}
$('fBox').addEventListener('click', e => {
  const b = e.target.closest('[data-rx]'); if (!b || !S.open) return;
  const k = b.dataset.rx, id = S.open;
  rxLocal[id] = rxLocal[id] || {}; rxLocal[id][k] = (rxLocal[id][k] || 0) + 1;
  const sm = b.querySelector('small'); sm.textContent = bn((parseInt(sm.textContent.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)), 10) || 0) + 1);
  const r = b.getBoundingClientRect(); flyEmoji(b.firstChild.textContent, r.left + r.width / 2, r.top);
  rxQueue[id + '|' + k] = (rxQueue[id + '|' + k] || 0) + 1;
  if (!rxTimer) rxTimer = setTimeout(sendRx, 2000);
});
if (PRED) { $('ptsBtn').onclick = openBoard; $('fBox').hidden = true; $('pTabs').hidden = true; }
else { $('vBox').hidden = true; }
if (PRED) $('ptsBtn').onclick = openBoard;
else { $('ptsBtn').onclick = () => { location.href = '/live/predict/'; }; $('ptsTxt').textContent = 'প্রেডিকশন'; }
$('slip').addEventListener('click', e => { if (e.target.closest('[data-slip-open]')) openSlip(); });
$('slipSheet').addEventListener('click', e => {
  if (e.target === $('slipSheet') || e.target.closest('[data-x]')) { $('slipSheet').hidden = true; return; }
  const rm = e.target.closest('[data-rm]'); if (rm) { S.slip.splice(+rm.dataset.rm, 1); saveSlip(); openSlip(); return; }
  if (e.target.closest('#slipGo')) sendSlip();
  if (e.target.closest('#slipClear')) { S.slip = []; saveSlip(); $('slipSheet').hidden = true; }
});
$('lbSheet').addEventListener('click', async e => {
  const gt = e.target.closest('[data-grp]'); if (gt) { S.grp = gt.dataset.grp || null; loadBoard(); return; }
  if (e.target.closest('[data-gnew]')) { const j = await grpAct({ act: 'create', name: $('gName').value }); if (j) { await loadMe(); S.grp = j.code; toast('গ্রুপ তৈরি! এবার লিংক শেয়ার করে বন্ধুদের ডাকুন'); loadBoard(); } return; }
  if (e.target.closest('[data-gjoin]')) { const j = await grpAct({ act: 'join', code: $('gCode').value }); if (j) { await loadMe(); S.grp = j.code; loadBoard(); } return; }
  if (e.target.closest('[data-gleave]')) { if (!confirm('এই গ্রুপ ছেড়ে দেবেন?')) return; const j = await grpAct({ act: 'leave', code: S.grp }); if (j) { S.grp = null; await loadMe(); loadBoard(); } return; }
  if (e.target.closest('[data-ginv]')) {
    const g = ((S.me && S.me.groups) || []).find(x => x.code === S.grp);
    const url = `${location.origin}/live/predict/#join=${S.grp}`, text = `খেলাঘর প্রেডিকশনে আমার "${g ? g.name : ''}" গ্রুপে যোগ দাও, দেখি কে বেশি সঠিক অনুমান করে! কোড: ${S.grp}`;
    try { if (navigator.share) await navigator.share({ title: 'খেলাঘর প্রেডিকশন গ্রুপ', text, url }); else { await navigator.clipboard.writeText(text + ' ' + url); toast('লিংক কপি হয়েছে'); } } catch (er) {}
    return;
  } if (e.target === $('lbSheet') || e.target.closest('[data-x]')) $('lbSheet').hidden = true; });
addEventListener('popstate', () => {
  const id = (location.hash.match(/^#m=([\w-]+)$/) || [])[1];
  if (id) openMatch(id, false); else closeMatch();
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('lbSheet').hidden) $('lbSheet').hidden = true; else if (S.open) $('pBack').click();
});

// প্রতি সেকেন্ডে কাউন্টডাউন
setInterval(() => {
  const now = Date.now();
  let started = false;
  document.querySelectorAll('[data-cd]').forEach(el => { const ms = +el.dataset.cd - now; el.textContent = cdText(ms); if (ms <= 0) started = true; });
  document.querySelectorAll('[data-hcd]').forEach(el => {
    if (+el.dataset.hcd <= now && S.open) { const d = S.det, m = d ? d.m : S.feed.matches.find(x => x.id === S.open); if (m) renderDetail(m, d ? d.det : null, d ? d.votes : null); return; }
    el.innerHTML = hcd(+el.dataset.hcd);
  });
  if (started && !loadFeed.pending) { loadFeed.pending = true; setTimeout(() => { loadFeed.pending = false; loadFeed(); }, 20000); }
}, 1000);
// প্রতি ৩০ সেকেন্ডে নতুন স্কোর (পাতা খোলা থাকলে)
setInterval(() => { if (!document.hidden) loadFeed(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadFeed(); if (S.open) loadDetail(); } });

/* ---------- শুরু ---------- */
loadFeed().then(() => {
  const id = (location.hash.match(/^#m=([\w-]+)$/) || [])[1];
  if (id) openMatch(id, false);
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1200));
  idle(() => fbAuth().then(async () => { if (S.user) await loadMe(); joinFromLink(); }).catch(() => {}));
});
