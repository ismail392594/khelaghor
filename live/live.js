// খেলাঘর লাইভ স্কোর: পাতার সব কাজ। ডাটা আসে শুধু আমাদের সার্ভার (/api/live) থেকে, সরাসরি কোনো API থেকে নয়।
import { winProb, rates } from '/live/insight.js';
const API = '/api/live';
const $ = id => document.getElementById(id);
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const S = { feed: null, sport: 'all', filter: null, day: null, user: null, me: null, open: null, det: null, tab: null, seen: new Set(), pts: 10, exact: 20, fav: new Set(), draft: null, period: 'week' };
try { S.fav = new Set(JSON.parse(localStorage.getItem('kh-live-fav') || '[]')); } catch (e) {}
const isFav = m => S.fav.has(m.a.name) || S.fav.has(m.b.name);
// টেস্টে দিনের খেলা শেষ (pause) হলে লাইভে না রেখে "আসন্ন"-তে দেখাই; পরদিন খেলা শুরু হলে আবার লাইভে আসবে
const vstate = m => (m.state === 'live' && m.pause ? 'upcoming' : m.state);
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
  if (ms <= 0) return 'শুরু হচ্ছে…';
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
  if (m.sport !== 'cricket' || m.state !== 'live' || !m.inns || !m.inns.length) return null;
  return m.inns[m.inns.length - 1].side;
}
function scoreOf(m, side) {
  const t = m[side];
  if (m.sport === 'cricket') return innTxt(t.inn, !m.test);
  if (t.g == null) return '';
  const pen = m.pen ? ` <span class="pen">(${bn(m.pen[side === 'a' ? 0 : 1])})</span>` : '';
  return bn(t.g) + pen;
}
const kindIcon = { G: '⚽', Y: '🟨', R: '🟥', S: '🔁', V: '📺', x: '❌', i: '⏱' };

/* ---------- তালিকা ---------- */
async function loadFeed() {
  try {
    S.feed = await get('f=feed');
    S.pts = S.feed.points || 10; S.exact = S.feed.exact || 20;
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
  if (!S.filter || (!by[S.filter].length && S.autoFilter)) { S.filter = by.live.length ? 'live' : by.upcoming.length ? 'upcoming' : 'done'; S.autoFilter = true; }
  document.querySelectorAll('.chip[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === S.filter));
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === S.sport));
  let list = by[S.filter].slice();
  // তারিখের বোতাম (আসন্ন আর শেষ খেলায়)
  const daysEl = $('days');
  if (S.filter !== 'live') {
    const keys = [...new Map(list.slice().sort((x, y) => S.filter === 'done' ? y.start - x.start : x.start - y.start).map(m => [dayKey(m.start), m.start])).entries()].slice(0, 8);
    if (S.day && !keys.some(([k]) => k === S.day)) S.day = null;
    daysEl.innerHTML = keys.length > 1 ? `<button type="button" class="day" data-day="" aria-pressed="${!S.day}">সব দিন</button>` + keys.map(([k, t]) => `<button type="button" class="day" data-day="${k}" aria-pressed="${S.day === k}">${dayName(t)}</button>`).join('') : '';
    daysEl.hidden = keys.length < 2;
    if (S.day) list = list.filter(m => dayKey(m.start) === S.day);
  } else { daysEl.hidden = true; daysEl.innerHTML = ''; }
  const rk = m => (isFav(m) ? 100 : 0) + (m.rk || (m.intl ? 2 : 1)) + (m.pause ? 50 : 0);
  // প্রিয় দল আর বড় দলের খেলা আগে (বাংলাদেশ সবার আগে), তারপর সময় অনুযায়ী
  list.sort((x, y) => (rk(y) - rk(x)) || (S.filter === 'done' ? y.start - x.start : x.start - y.start));
  const demoN = all.filter(m => m.demo).length;
  const note = $('demoNote');
  if (demoN) {
    note.hidden = false;
    note.textContent = '⚠️ "নমুনা" লেখা ম্যাচগুলো কাল্পনিক, পাতা কেমন দেখাবে বোঝানোর জন্য।';
  } else note.hidden = true;
  if (!list.length) {
    const msg = { live: 'এই মুহূর্তে কোনো খেলা চলছে না', upcoming: 'সামনে কোনো খেলা নেই', done: 'সাম্প্রতিক শেষ হওয়া খেলা নেই' }[S.filter];
    $('list').innerHTML = `<div class="empty"><span class="em">${S.sport === 'football' ? '⚽' : '🏏'}</span>${msg}${S.filter === 'live' && by.upcoming.length ? '<br><br><button class="chip" type="button" data-go="upcoming">আসন্ন খেলা দেখুন ›</button>' : ''}</div>`;
    return;
  }
  // আগে ক্রিকেট, তার নিচে ফুটবল; প্রতিটার ভেতরে টুর্নামেন্ট অনুযায়ী
  let html = '';
  for (const sp of ['cricket', 'football']) {
    const part = list.filter(m => m.sport === sp);
    if (!part.length) continue;
    if (S.sport === 'all') html += `<div class="sec ${sp}"><span>${sp === 'cricket' ? '🏏' : '⚽'}</span><b>${sp === 'cricket' ? 'ক্রিকেট' : 'ফুটবল'}</b><em>${bn(part.length)}টি খেলা</em></div>`;
    let lastG = null;
    for (const m of part) {
      const g = m.pause ? '__pause' : (isFav(m) ? '__fav' : '') + m.tour;
      if (g !== lastG) {
        const title = m.pause ? '⏸ আজকের খেলা শেষ, পরের দিন আবার শুরু' : (isFav(m) ? '⭐ ' : '') + (m.tour || (sp === 'cricket' ? 'ক্রিকেট' : 'ফুটবল'));
        html += `<div class="grp">${esc(title)}</div>`; lastG = g;
      }
      html += cardHtml(m);
    }
  }
  $('list').innerHTML = html;
}

function voteChip(m) {
  const p = S.me && S.me.picks && S.me.picks[m.id];
  if (!p) return m.state === 'upcoming' ? '<span class="vt">🗳️ ভোট দিন</span>' : '';
  const pn = p === 'd' ? 'ড্র' : tname(m[p]);
  if (m.state === 'done' && m.result) {
    if (m.result === 'void') return '<span class="vt lose">বাতিল</span>';
    const sc = S.me.scores && S.me.scores[m.id];
    const ex = sc && m.sport === 'football' && sc[0] === m.a.g && sc[1] === m.b.g;
    return m.result === p ? `<span class="vt win">🎉 +${bn(S.pts + (ex ? S.exact : 0))}</span>` : '<span class="vt lose">মেলেনি</span>';
  }
  return `<span class="vt mine">✓ ${esc(pn)}</span>`;
}

function cardHtml(m) {
  const bs = batSide(m);
  const dimOf = s => m.state === 'done' && m.result && m.result !== 'void' && m.result !== 'd' && m.result !== s;
  const row = s => `<div class="tm${dimOf(s) ? ' dim' : ''}">${badge(m[s])}<span class="nm">${esc(tname(m[s]))}${S.fav.has(m[s].name) ? ' <i class="star">★</i>' : ''}${bs === s ? '<span class="bat" title="ব্যাট করছে"></span>' : ''}</span><span class="sc">${scoreOf(m, s)}</span></div>`;
  let pill, foot;
  if (m.pause) {
    pill = '<span class="pill pause">দিনের খেলা শেষ</span>';
    foot = `<span class="st">${esc(m.status || '')}</span>`;
  } else if (m.state === 'live') {
    pill = `<span class="pill live">${m.sport === 'football' && m.min ? bn(m.min) + "'" : 'লাইভ'}</span>`;
    foot = `<span class="st hot">${esc(m.status || '')}</span>`;
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
${probBar(m)}<div class="cfoot">${foot}${voteChip(m)}</div></button>`;
}
// কার্ডের নিচে জেতার সম্ভাবনার সরু দাগ
function probBar(m, big) {
  const p = winProb(m);
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
    S.det = d;
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
  const team = s => `<div class="t big">${badge(m[s], true)}<b>${esc(tname(m[s]))}${bs === s ? ' 🏏' : ''}</b>${heroScore(m, s)}<button type="button" class="fav" data-fav="${esc(m[s].name)}" aria-pressed="${S.fav.has(m[s].name)}">${S.fav.has(m[s].name) ? '★ প্রিয়' : '☆ প্রিয়'}</button></div>`;
  let st;
  if (m.pause) st = `<div class="hst">⏸ ${esc(m.status)}</div>`;
  else if (m.state === 'live') st = `<div class="hst hot">${m.sport === 'football' ? esc(m.status) + (m.min ? ` · ${bn(m.min)}'` : '') : esc(m.status)}</div>`;
  else if (m.state === 'upcoming') st = `<div class="hst">খেলা শুরু ${when(m.start)}</div><div class="hcd" data-hcd="${m.start}">${hcd(m.start)}</div>`;
  else st = `<div class="hst">${esc(m.status)}</div>`;
  const sub = [m.label, m.toss, m.venue].filter(Boolean).map(esc).join(' · ');
  $('pHero').innerHTML = `<div class="hsub" style="padding-top:12px">${m.sport === 'cricket' ? '🏏' : '⚽'} ${esc(m.tour)}${m.demo ? ' <span class="demo">নমুনা</span>' : ''}</div>
<div class="vs">${team('a')}<div class="mid">${mid}</div>${team('b')}</div>${st}<div class="hsub">${sub}</div>`;
  renderInsight(m);
  renderVote(m, votes);
  const tabs = m.sport === 'cricket' ? [['c', 'বল-বাই-বল'], ['s', 'স্কোরকার্ড']] : [['c', 'ঘটনা'], ['s', 'পরিসংখ্যান']];
  if (m.sport === 'football' && m.lg && m.season && !m.demo) tabs.push(['t', 'টেবিল']);
  if (!S.tab) S.tab = 'c';
  $('pTabs').innerHTML = tabs.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${t}</button>`).join('');
  if (S.tab === 't') { tableHtml(m); return; }
  $('pBody').innerHTML = det === null && !S.det ? '<div class="skel" style="margin-top:12px"></div>' : (S.tab === 'c' ? commHtml(m, det) : (m.sport === 'cricket' ? cardTbl(det) : statsHtml(det)));
}
// খেলার হিসাব: জেতার সম্ভাবনা আর রান রেট
function renderInsight(m) {
  const box = $('iBox');
  const p = probBar(m, true), r = rates(m);
  if (!p && !r.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<h3>📊 খেলার হিসাব<span>আনুমানিক</span></h3>${p ? `<div class="wpt">জেতার সম্ভাবনা</div>${p}` : ''}${r.length ? `<div class="rts">${r.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>` : ''}`;
}
// ফুটবল লিগের পয়েন্ট টেবিল
const tblCache = {};
async function tableHtml(m) {
  const key = m.lg + '_' + m.season;
  const draw = d => {
    if (S.tab !== 't' || !S.open) return;
    const g = (d && d.groups) || [];
    if (!g.length) { $('pBody').innerHTML = '<div class="empty"><span class="em">📋</span>এই প্রতিযোগিতার টেবিল নেই</div>'; return; }
    const hi = n => n === m.a.name || n === m.b.name;
    $('pBody').innerHTML = g.map(x => `${g.length > 1 ? `<div class="grp">${esc(x.name)}</div>` : ''}<table class="lt"><thead><tr><th>#</th><th>দল</th><th>খে</th><th>জ</th><th>ড্র</th><th>হা</th><th>গো.পা.</th><th>পয়েন্ট</th></tr></thead><tbody>${x.rows.map(r => `<tr class="${hi(r[1]) ? 'hi' : ''}"><td>${bn(r[0])}</td><td>${esc(r[1])}</td><td>${bn(r[2])}</td><td>${bn(r[3])}</td><td>${bn(r[4])}</td><td>${bn(r[5])}</td><td>${r[6] > 0 ? '+' : ''}${bn(r[6])}</td><td class="r">${bn(r[7])}</td></tr>`).join('')}</tbody></table>`).join('');
  };
  if (tblCache[key]) return draw(tblCache[key]);
  $('pBody').innerHTML = '<div class="skel" style="margin-top:12px"></div>';
  try { tblCache[key] = await get(`f=table&lg=${m.lg}&season=${m.season}`); draw(tblCache[key]); }
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
    return `<div class="empty"><span class="em">${m.sport === 'cricket' ? '🏏' : '⚽'}</span>${t}</div>`;
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
function cardTbl(det) {
  const card = (det && det.card) || [];
  if (!card.length) return '<div class="empty"><span class="em">📋</span>খেলা শুরু হলে স্কোরকার্ড দেখা যাবে</div>';
  return card.map((inn, i) => `<details class="inn"${i === card.length - 1 ? ' open' : ''}><summary><span>${esc(inn.t)}</span><b>${inn.tot ? bn(`${inn.tot.r}/${inn.tot.w}`) + ` <small style="font-size:.75rem;color:var(--dim)">(${bn(inn.tot.o)})</small>` : ''}</b></summary>
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
  let html = `<h3>🗳️ কে জিতবে?<span>সঠিক হলে +${bn(S.pts)}${fb ? `, সঠিক স্কোরে আরও +${bn(S.exact)}` : ''}</span></h3><div class="vbtns">${opts.map(btn).join('')}</div>`;
  // ফুটবল: দল বাছাইয়ের পর সঠিক স্কোর আন্দাজ (ইচ্ছা হলে)
  if (fb && open && !mine && S.draft && S.draft.id === m.id) {
    const d = S.draft;
    const step = (k, val) => `<div class="stp"><button type="button" data-st="${k}-" aria-label="কমান">−</button><b>${bn(val)}</b><button type="button" data-st="${k}+" aria-label="বাড়ান">+</button></div>`;
    html += `<div class="sbox2"><div class="sl">সঠিক স্কোরও আন্দাজ করুন (ইচ্ছা হলে, +${bn(S.exact)} বোনাস)</div>
<div class="srow"><span title="${esc(tname(m.a))}">${badge(m.a)}</span>${step('a', d.ga)}<em>-</em>${step('b', d.gb)}<span title="${esc(tname(m.b))}">${badge(m.b)}</span></div>
<div class="sact"><button type="button" class="cbtn" data-send="score">✓ স্কোরসহ ভোট দিন</button><button type="button" class="lbtn" data-send="pick">শুধু বিজয়ী</button></div></div>`;
  }
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
    else if (m.result === mine) { msg = m.demo ? '🎉 আপনার অনুমান মিলেছে! (নমুনা ম্যাচ, পয়েন্ট যোগ হয় না)' : `🎉 আপনার অনুমান মিলেছে! +${bn(S.pts + (ex ? S.exact : 0))} পয়েন্ট${ex ? ' (একদম সঠিক স্কোর!)' : ''}`; cls = 'ok'; }
    else msg = 'এবার মেলেনি, পরের ম্যাচে আবার চেষ্টা করুন';
  } else if (mine) { msg = `✓ আপনার ভোট: ${mine === 'd' ? 'ড্র' : esc(tname(m[mine]))}${scTxt}। খেলা শেষে ফল মিলিয়ে পয়েন্ট দেওয়া হবে`; cls = 'ok'; }
  else if (open) msg = m.demo ? 'নমুনা ম্যাচ: ভোট দেওয়া যায়, তবে পয়েন্ট যোগ হয় না' : (fb ? 'দল বাছাই করুন, চাইলে সঠিক স্কোরও বলুন' : 'খেলা শুরুর আগ পর্যন্ত ভোট দেওয়া যাবে');
  else msg = m.state === 'live' ? 'খেলা শুরু হয়ে গেছে, ভোট বন্ধ' : 'ভোট বন্ধ';
  html += `<div class="vmsg ${cls}" id="vMsg">${msg}${total ? ` · মোট ${bn(total)} ভোট` : ''}</div>`;
  $('vBox').innerHTML = html;
}
async function doVote(pick, ga = null, gb = null) {
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
    const body = { id: m.id, pick };
    if (ga != null) Object.assign(body, { ga, gb });
    const r = await fetch(API + '?f=vote', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok && r.status !== 409) throw new Error(j.error || 'ভোট হয়নি');
    S.me = S.me || { pts: 0, ok: 0, n: 0, picks: {}, scores: {} };
    S.draft = null;
    if (r.ok) {
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
  } catch (e) { S.me = null; }
  if (S.feed) renderList();
  if (S.open && S.det) renderVote(S.det.m, S.det.votes);
}

/* ---------- লিডারবোর্ড ---------- */
async function openBoard() {
  $('lbSheet').hidden = false;
  $('lbRules').textContent = `খেলা শুরুর আগে যেকোনো ম্যাচে "কে জিতবে?" ভোট দিন। অনুমান মিলে গেলে +${bn(S.pts)} পয়েন্ট। ফুটবলে একদম সঠিক স্কোর বললে আরও +${bn(S.exact)}। ম্যাচ বাতিল বা টাই হলে পয়েন্ট নেই। সাপ্তাহিক লিডারবোর্ড প্রতি সোমবার নতুন করে শুরু হয়।`;
  meBox();
  loadBoard();
}
async function loadBoard() {
  document.querySelectorAll('[data-per]').forEach(b => b.setAttribute('aria-pressed', b.dataset.per === S.period));
  $('lbList').innerHTML = '<div class="skel" style="height:60px"></div>';
  try {
    const d = await get('f=board&p=' + S.period);
    const medal = ['🥇', '🥈', '🥉'];
    const list = d.list.filter(x => x.pts > 0 || S.period === 'all');
    $('lbList').innerHTML = list.length ? list.map((x, i) => `<li><span class="rk">${medal[i] || bn(i + 1)}</span><span class="nm">${esc(x.name)}<small>${bn(x.ok)}টি সঠিক${x.ex ? ` · ${bn(x.ex)}টি একদম সঠিক স্কোর` : ''} · ${bn(x.n)}টি ভোট</small></span><span class="p">${bn(x.pts)}</span></li>`).join('')
      : `<div class="empty"><span class="em">🏆</span>${S.period === 'week' ? 'এই সপ্তাহে এখনো কেউ পয়েন্ট পায়নি। প্রথম হোন!' : 'এখনো কেউ পয়েন্ট পায়নি। প্রথম হোন!'}</div>`;
  } catch (e) { $('lbList').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function meBox() {
  if (S.user && S.me) {
    $('lbMe').innerHTML = `<div class="me"><div class="n"><b>${esc(S.me.name || S.user.displayName || 'আমি')}</b><small>${bn(S.me.ok)}টি সঠিক · ${bn(S.me.n)}টি ভোট · এই সপ্তাহে ${bn(S.me.week || 0)}</small></div><div class="p">${bn(S.me.pts)}</div></div>`;
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
  const c = e.target.closest('.card'); if (c) openMatch(c.dataset.id);
});
$('days').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (!b) return; S.day = b.dataset.day || null; renderList(); });
document.querySelector('.lbtabs').addEventListener('click', e => { const b = e.target.closest('[data-per]'); if (!b) return; S.period = b.dataset.per; loadBoard(); });
// প্রিয় দল
$('pHero').addEventListener('click', e => {
  const b = e.target.closest('[data-fav]'); if (!b) return;
  const n = b.dataset.fav;
  if (S.fav.has(n)) S.fav.delete(n); else { S.fav.add(n); toast('প্রিয় দলে যোগ হলো, এই দলের খেলা সবার উপরে দেখাবে'); }
  try { localStorage.setItem('kh-live-fav', JSON.stringify([...S.fav].slice(-30))); } catch (er) {}
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
  const b = e.target.closest('[data-vote]');
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
  const url = location.origin + '/live/#m=' + (S.open || '');
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
  const st = m.state === 'upcoming' ? `খেলা শুরু ${when(m.start)}` : String(m.status || '');
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
$('ptsBtn').onclick = openBoard;
$('lbSheet').addEventListener('click', e => { if (e.target === $('lbSheet') || e.target.closest('[data-x]')) $('lbSheet').hidden = true; });
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
  document.querySelectorAll('[data-hcd]').forEach(el => { el.innerHTML = hcd(+el.dataset.hcd); });
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
  idle(() => fbAuth().then(() => { if (S.user) loadMe(); }).catch(() => {}));
});
