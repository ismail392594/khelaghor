// খেলাঘর লাইভ স্কোর: পাতার সব কাজ। ডাটা আসে শুধু আমাদের সার্ভার (/api/live) থেকে, সরাসরি কোনো API থেকে নয়।
const API = '/api/live';
const $ = id => document.getElementById(id);
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const S = { feed: null, sport: 'all', filter: null, user: null, me: null, open: null, det: null, tab: null, seen: new Set(), pts: 10 };
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
    S.pts = S.feed.points || 10;
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
  for (const m of all) (by[m.state] || by.upcoming).push(m);
  $('nLive').textContent = bn(by.live.length); $('nUp').textContent = bn(by.upcoming.length); $('nDone').textContent = bn(by.done.length);
  if (!S.filter || (!by[S.filter].length && S.autoFilter)) { S.filter = by.live.length ? 'live' : by.upcoming.length ? 'upcoming' : 'done'; S.autoFilter = true; }
  document.querySelectorAll('.chip[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === S.filter));
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === S.sport));
  const rk = m => (m.rk || (m.intl ? 2 : 1));
  // বড় দলের খেলা আগে (বাংলাদেশ সবার আগে), তারপর সময় অনুযায়ী
  const list = by[S.filter].slice().sort((x, y) => (rk(y) - rk(x)) || (S.filter === 'done' ? y.start - x.start : x.start - y.start));
  const demoN = all.filter(m => m.demo).length;
  const note = $('demoNote');
  if (demoN) {
    note.hidden = false;
    note.textContent = '⚠️ এগুলো নমুনা ম্যাচ (কাল্পনিক খেলোয়াড়), পাতা কেমন দেখাবে বোঝানোর জন্য। আসল স্কোর শিগগিরই চালু হবে।';
  } else note.hidden = true;
  if (!list.length) {
    const msg = { live: 'এই মুহূর্তে কোনো খেলা চলছে না', upcoming: 'সামনে কোনো খেলা নেই', done: 'সাম্প্রতিক শেষ হওয়া খেলা নেই' }[S.filter];
    $('list').innerHTML = `<div class="empty"><span class="em">${S.sport === 'football' ? '⚽' : '🏏'}</span>${msg}</div>`;
    return;
  }
  let html = '', lastG = null;
  for (const m of list) {
    const g = m.tour + '|' + m.sport;
    if (g !== lastG) { html += `<div class="grp"><i>${m.sport === 'cricket' ? '🏏' : '⚽'}</i>${esc(m.tour || (m.sport === 'cricket' ? 'ক্রিকেট' : 'ফুটবল'))}</div>`; lastG = g; }
    html += cardHtml(m);
  }
  $('list').innerHTML = html;
}

function voteChip(m) {
  const p = S.me && S.me.picks && S.me.picks[m.id];
  if (!p) return m.state === 'upcoming' ? '<span class="vt">🗳️ ভোট দিন</span>' : '';
  const pn = p === 'd' ? 'ড্র' : tname(m[p]);
  if (m.state === 'done' && m.result) {
    if (m.result === 'void') return '<span class="vt lose">বাতিল</span>';
    return m.result === p ? `<span class="vt win">🎉 +${bn(S.pts)}</span>` : '<span class="vt lose">মেলেনি</span>';
  }
  return `<span class="vt mine">✓ ${esc(pn)}</span>`;
}

function cardHtml(m) {
  const bs = batSide(m);
  const dimOf = s => m.state === 'done' && m.result && m.result !== 'void' && m.result !== 'd' && m.result !== s;
  const row = s => `<div class="tm${dimOf(s) ? ' dim' : ''}">${badge(m[s])}<span class="nm">${esc(tname(m[s]))}${bs === s ? '<span class="bat" title="ব্যাট করছে"></span>' : ''}</span><span class="sc">${scoreOf(m, s)}</span></div>`;
  let pill, foot;
  if (m.state === 'live') {
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
<div class="cfoot">${foot}${voteChip(m)}</div></button>`;
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
  const team = s => `<div class="t big">${badge(m[s], true)}<b>${esc(tname(m[s]))}${bs === s ? ' 🏏' : ''}</b>${heroScore(m, s)}</div>`;
  let st;
  if (m.state === 'live') st = `<div class="hst hot">${m.sport === 'football' ? esc(m.status) + (m.min ? ` · ${bn(m.min)}'` : '') : esc(m.status)}</div>`;
  else if (m.state === 'upcoming') st = `<div class="hst">খেলা শুরু ${when(m.start)}</div><div class="hcd" data-hcd="${m.start}">${hcd(m.start)}</div>`;
  else st = `<div class="hst">${esc(m.status)}</div>`;
  const sub = [m.label, m.toss, m.venue].filter(Boolean).map(esc).join(' · ');
  $('pHero').innerHTML = `<div class="hsub" style="padding-top:12px">${m.sport === 'cricket' ? '🏏' : '⚽'} ${esc(m.tour)}${m.demo ? ' <span class="demo">নমুনা</span>' : ''}</div>
<div class="vs">${team('a')}<div class="mid">${mid}</div>${team('b')}</div>${st}<div class="hsub">${sub}</div>`;
  renderVote(m, votes);
  const tabs = m.sport === 'cricket' ? [['c', 'বল-বাই-বল'], ['s', 'স্কোরকার্ড']] : [['c', 'ঘটনা'], ['s', 'পরিসংখ্যান']];
  if (!S.tab) S.tab = 'c';
  $('pTabs').innerHTML = tabs.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${t}</button>`).join('');
  $('pBody').innerHTML = det === null && !S.det ? '<div class="skel" style="margin-top:12px"></div>' : (S.tab === 'c' ? commHtml(m, det) : (m.sport === 'cricket' ? cardTbl(det) : statsHtml(det)));
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
  const open = m.state === 'upcoming' && m.start > Date.now();
  const total = v.a + v.b + v.d;
  const btn = ([k, t]) => `<button type="button" data-vote="${k}" aria-pressed="${mine === k}" ${!open || mine ? 'disabled' : ''}>${t ? badge(t) : '<span class="mn" style="background:#475569">ড্র</span>'}<span>${t ? esc(tname(t)) : 'ড্র'}</span></button>`;
  let html = `<h3>🗳️ কে জিতবে?<span>সঠিক হলে +${bn(S.pts)} পয়েন্ট</span></h3><div class="vbtns">${opts.map(btn).join('')}</div>`;
  if (mine || !open) {
    if (total) {
      const col = { a: 'var(--cyan)', d: '#64748b', b: 'var(--gold)' };
      html += `<div class="vbar">${opts.map(([k]) => `<i style="width:${(v[k] / total * 100).toFixed(1)}%;background:${col[k]}"></i>`).join('')}</div>`;
      html += `<div class="vleg">${opts.map(([k, t]) => `<span>${t ? esc(tname(t)) : 'ড্র'} ${bn(Math.round(v[k] / total * 100))}%</span>`).join('')}</div>`;
    }
  }
  let msg = '', cls = '';
  if (mine && m.state === 'done' && m.result) {
    if (m.result === 'void') msg = 'ম্যাচের ফল হয়নি, তাই পয়েন্ট নেই';
    else if (m.result === mine) { msg = m.demo ? '🎉 আপনার অনুমান মিলেছে! (নমুনা ম্যাচ, পয়েন্ট যোগ হয় না)' : `🎉 আপনার অনুমান মিলেছে! +${bn(S.pts)} পয়েন্ট`; cls = 'ok'; }
    else msg = 'এবার মেলেনি, পরের ম্যাচে আবার চেষ্টা করুন';
  } else if (mine) { msg = `✓ আপনার ভোট: ${mine === 'd' ? 'ড্র' : esc(tname(m[mine]))}। খেলা শেষে ফল মিলিয়ে পয়েন্ট দেওয়া হবে`; cls = 'ok'; }
  else if (open) msg = m.demo ? 'নমুনা ম্যাচ: ভোট দেওয়া যায়, তবে পয়েন্ট যোগ হয় না' : 'খেলা শুরুর আগ পর্যন্ত ভোট দেওয়া যাবে';
  else msg = m.state === 'live' ? 'খেলা শুরু হয়ে গেছে, ভোট বন্ধ' : 'ভোট বন্ধ';
  html += `<div class="vmsg ${cls}" id="vMsg">${msg}${total ? ` · মোট ${bn(total)} ভোট` : ''}</div>`;
  $('vBox').innerHTML = html;
}
async function doVote(pick) {
  const m = S.det ? S.det.m : S.feed.matches.find(x => x.id === S.open);
  if (!m) return;
  if (!S.user) {
    $('vMsg').textContent = 'ভোট দিতে Gmail দিয়ে লগইন করুন…';
    const ok = await login();
    if (!ok) { $('vMsg').textContent = 'লগইন হয়নি, আবার চেষ্টা করুন'; return; }
  }
  document.querySelectorAll('[data-vote]').forEach(b => { b.disabled = true; });
  try {
    const t = await token();
    const r = await fetch(API + '?f=vote', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ id: m.id, pick }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok && r.status !== 409) throw new Error(j.error || 'ভোট হয়নি');
    S.me = S.me || { pts: 0, ok: 0, n: 0, picks: {} };
    if (r.ok) {
      S.me.picks[m.id] = pick;
      const v = (S.det && S.det.votes) || { a: 0, b: 0, d: 0 };
      v[pick]++; if (S.det) S.det.votes = v;
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
  $('lbRules').textContent = `খেলা শুরুর আগে যেকোনো ম্যাচে "কে জিতবে?" ভোট দিন। অনুমান মিলে গেলে +${bn(S.pts)} পয়েন্ট। ম্যাচ বাতিল বা টাই হলে পয়েন্ট নেই। প্রতি ম্যাচে একবারই ভোট দেওয়া যায়।`;
  $('lbList').innerHTML = '<div class="skel" style="height:60px"></div>';
  meBox();
  try {
    const d = await get('f=board');
    const medal = ['🥇', '🥈', '🥉'];
    $('lbList').innerHTML = d.list.length ? d.list.map((x, i) => `<li><span class="rk">${medal[i] || bn(i + 1)}</span><span class="nm">${esc(x.name)}<small>${bn(x.ok)}টি সঠিক · ${bn(x.n)}টি ভোট</small></span><span class="p">${bn(x.pts)}</span></li>`).join('')
      : '<div class="empty"><span class="em">🏆</span>এখনো কেউ পয়েন্ট পায়নি। প্রথম হোন!</div>';
  } catch (e) { $('lbList').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function meBox() {
  if (S.user && S.me) {
    $('lbMe').innerHTML = `<div class="me"><div class="n"><b>${esc(S.me.name || S.user.displayName || 'আমি')}</b><small>${bn(S.me.ok)}টি সঠিক · ${bn(S.me.n)}টি ভোট</small></div><div class="p">${bn(S.me.pts)}</div></div>`;
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
$('list').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openMatch(c.dataset.id); });
$('pBack').onclick = () => { if (history.state && history.state.m) history.back(); else { closeMatch(); history.replaceState(null, '', location.pathname); } };
$('pTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  S.tab = b.dataset.tab;
  const d = S.det;
  const m = d ? d.m : S.feed.matches.find(x => x.id === S.open);
  if (m) renderDetail(m, d ? d.det : null, d ? d.votes : null);
});
$('vBox').addEventListener('click', e => { const b = e.target.closest('[data-vote]'); if (b && !b.disabled) doVote(b.dataset.vote); });
$('pShare').onclick = async () => {
  const m = S.det ? S.det.m : S.feed && S.feed.matches.find(x => x.id === S.open);
  const url = location.origin + '/live/#m=' + (S.open || '');
  const text = m ? `${tname(m.a)} বনাম ${tname(m.b)}: লাইভ স্কোর বাংলায়, আর কে জিতবে ভোট দিন!` : 'লাইভ স্কোর বাংলায়';
  try {
    if (navigator.share) await navigator.share({ title: 'খেলাঘর লাইভ স্কোর', text, url });
    else { await navigator.clipboard.writeText(text + ' ' + url); toast('লিংক কপি হয়েছে'); }
  } catch (e) {}
};
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
