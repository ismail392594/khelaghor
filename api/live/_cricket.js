// লাইভ স্কোর: ক্রিকেট (CricketData.org / api.cricapi.com) থেকে আনা ডাটাকে আমাদের নিজস্ব ছাঁচে সাজানো।
// key থাকে Vercel-এর CRICKET_API_KEY-এ। কোডে কোনো key নেই।
import { team, isCountry } from './_teams.js';
import { bnNum, gen, sameTeam, cricStatusBn, cricResult, matchLabel, fmtType, oversToBalls, ballsToOvers, dismissalBn, ord } from './_bn.js';

const BASE = 'https://api.cricapi.com/v1/';

// ICC-র পূর্ণ সদস্য ১২ দেশ: এদের পুরুষ দলের খেলা তালিকায় সবার আগে দেখানো হয়
const FULL = ['afghanistan', 'australia', 'bangladesh', 'england', 'india', 'ireland', 'new zealand', 'pakistan', 'south africa', 'sri lanka', 'west indies', 'zimbabwe'];
// rk: ৩ = পূর্ণ সদস্যের পুরুষ দল, ২ = পূর্ণ সদস্যের মহিলা বা অন্য দল, ১ = বাকি সব। বাংলাদেশের খেলা থাকলে +১
export function rankOf(na, nb) {
  const base = n => String(n || '').toLowerCase().replace(/\s+(women|w|u-?19|under[- ]19|a|xi|emerging)$/i, '');
  const full = FULL.includes(base(na)) && FULL.includes(base(nb));
  const plain = n => FULL.includes(String(n || '').toLowerCase());
  let rk = full ? (plain(na) && plain(nb) ? 3 : 2) : 1;
  if (/^bangladesh/i.test(na) || /^bangladesh/i.test(nb)) rk += 1;
  return rk;
}

// একবার API ডাকা। ফেরত: { ok, data, rem, lim }  (rem = আজ আর কতবার ডাকা যাবে)
export async function cricCall(path, params = {}) {
  const key = process.env.CRICKET_API_KEY;
  if (!key) return { ok: false, err: 'nokey' };
  const u = new URL(BASE + path);
  u.searchParams.set('apikey', key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 7000);
  try {
    const r = await fetch(u, { signal: ac.signal });
    const j = await r.json().catch(() => ({}));
    const info = j.info || {};
    const lim = Number(info.hitsLimit) || null, used = Number(info.hitsToday);
    const rem = lim != null && !isNaN(used) ? Math.max(0, lim - used) : null;
    if (j.status !== 'success') return { ok: false, err: String(j.reason || j.status || r.status), rem, lim };
    return { ok: true, data: j.data, rem, lim, total: Number(info.totalRows) || 0 };
  } catch (e) {
    return { ok: false, err: 'net' };
  } finally { clearTimeout(tm); }
}

const gmt = s => { if (!s) return 0; const t = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z'; return Date.parse(t) || 0; };

// এক দলের ইনিংসগুলো: score[] থেকে যেগুলোর inning লেখা ওই দলের নাম দিয়ে শুরু
function innsOf(score, name) {
  const n = String(name || '').toLowerCase();
  return (score || []).filter(s => String(s.inning || '').toLowerCase().startsWith(n))
    .map(s => ({ r: Number(s.r) || 0, w: Number(s.w) || 0, o: Number(s.o) || 0 }));
}

// currentMatches / matches / match_scorecard — সবগুলোর একই রকম মূল তথ্য থাকে
export function cricSummary(m) {
  const names = m.teams && m.teams.length >= 2 ? m.teams : (m.teamInfo || []).map(t => t.name);
  const [na, nb] = [names[0] || 'দল ১', names[1] || 'দল ২'];
  const intl = isCountry(na) && isCountry(nb);
  const a = { ...team(na, intl), inn: innsOf(m.score, na) };
  const b = { ...team(nb, intl), inn: innsOf(m.score, nb) };
  const bnOf = x => {
    if (sameTeam(x, na)) return a.bn || x;
    if (sameTeam(x, nb)) return b.bn || x;
    return x;
  };
  const start = gmt(m.dateTimeGMT) || Date.parse(m.date) || 0;
  let state = m.matchEnded ? 'done' : m.matchStarted ? 'live' : 'upcoming';
  const status = String(m.status || '');
  if (state === 'upcoming' && /won|drawn|abandon|no result|cancel/i.test(status)) state = 'done';
  const parts = String(m.name || '').split(', ');
  const tour = parts.length > 2 ? parts.slice(2).join(', ') : (m.series || '');
  const label = matchLabel(parts[1] || '') || fmtType(m.matchType);
  const test = String(m.matchType || '').toLowerCase() === 'test' || /test/i.test(parts[1] || '');
  const out = {
    id: 'c_' + m.id, sport: 'cricket', state, start, tour, label, test, intl, rk: rankOf(na, nb),
    fmt: String(m.matchType || '').toLowerCase(),
    venue: m.venue || '', city: String(m.venue || '').split(',').pop().trim(), a, b,
    inns: (m.score || []).map(s => ({ side: String(s.inning || '').toLowerCase().startsWith(na.toLowerCase()) ? 'a' : 'b', r: +s.r || 0, w: +s.w || 0, o: +s.o || 0 })),
    status: cricStatusBn(status, bnOf), raw: status.slice(0, 120)
  };
  // টেস্টে আজকের খেলা শেষ (stumps): লাইভ তালিকায় না দেখিয়ে আলাদা রাখি
  if (state === 'live' && /stumps/i.test(status)) out.pause = true;
  if (state === 'done') out.result = cricResult(m.matchWinner ? m.matchWinner + ' won' : status, na, nb) || cricResult(status, na, nb);
  if (m.tossWinner) out.toss = `টস: ${bnOf(m.tossWinner)} (${/bat/i.test(m.tossChoice || '') ? 'ব্যাটিং' : 'বোলিং'})`;
  return out;
}

// স্কোরকার্ড (match_scorecard) → বাংলা স্কোরকার্ড
export function cricCard(d, sum) {
  const nameBn = n => {
    const l = String(n || '').toLowerCase();
    if (l.startsWith(sum.a.name.toLowerCase())) return [sum.a.bn || sum.a.name, l.slice(sum.a.name.length)];
    if (l.startsWith(sum.b.name.toLowerCase())) return [sum.b.bn || sum.b.name, l.slice(sum.b.name.length)];
    return [n, ''];
  };
  return (d.scorecard || []).map(s => {
    const [tn, rest] = nameBn(s.inning);
    const num = (rest.match(/(\d+)/) || [])[1];
    const tot = (d.score || []).find(x => x.inning === s.inning) || {};
    return {
      t: tn + (num ? ' · ' + ord(+num) + ' ইনিংস' : ''),
      tot: tot.r != null ? { r: +tot.r, w: +tot.w, o: +tot.o } : null,
      bat: (s.batting || []).map(x => [nm(x.batsman), dismissalBn(x['dismissal-text'] || x.dismissal), +x.r || 0, +x.b || 0, +x['4s'] || 0, +x['6s'] || 0]),
      bowl: (s.bowling || []).map(x => [nm(x.bowler), +x.o || 0, +x.m || 0, +x.r || 0, +x.w || 0]),
      ext: s.extras != null ? (typeof s.extras === 'object' ? +s.extras.r || 0 : +s.extras || 0) : null
    };
  });
}
const nm = p => (p && typeof p === 'object' ? p.name : p) || '';

/* ---------- বল-বাই-বল (বাংলায়) ----------
   API-র ball-by-ball (match_bbb) পাওয়া গেলে সেটা থেকে, না পেলে আগের আর এখনকার স্কোর মিলিয়ে নিজেরা লেখা বানাই।
   প্রতিটা লাইন: { o: '15.3', k: '4'|'6'|'W'|'0'|'r'|'x'|'i', t: 'বাংলা লেখা', at } */

// match_bbb থেকে (মাঠের নাম/ধরন নিশ্চিত না হলে খালি ফেরত দেয়, তখন নিচের diff পদ্ধতি চলে)
export function bbbLines(d) {
  const arr = Array.isArray(d && d.bbb) ? d.bbb : [];
  const out = [];
  for (const x of arr) {
    if (x.over == null || x.ball == null) continue;
    const runs = +x.runs || 0, ext = +x.extras || 0;
    const bat = nm(x.batsman), bowl = nm(x.bowler);
    const out1 = x.dismissal || x.wicket || x.out;
    const o = `${x.over}.${x.ball}`;
    let k = 'r', t;
    const who = `${bowl} থেকে ${bat}`;
    if (out1) { k = 'W'; t = `আউট! ${bat}${typeof out1 === 'string' ? ', ' + dismissalBn(out1) : ''}`; }
    else if (runs === 4) { k = '4'; t = `${who}, চার!`; }
    else if (runs === 6) { k = '6'; t = `${who}, ছক্কা!`; }
    else if (ext) { k = 'x'; t = `${who}, বাড়তি ${bnNum(ext + runs)} রান`; }
    else if (!runs) { k = '0'; t = `${who}, রান হয়নি`; }
    else t = `${who}, ${bnNum(runs)} রান`;
    out.push({ o, k, t, inn: +x.inning || 0 });
  }
  return out.reverse(); // নতুনটা উপরে
}

// এখনকার ব্যাটিং ইনিংসের ছবি (পরের বার মিলিয়ে দেখার জন্য)
export function snapOf(sum, card) {
  const all = sum.inns || [];
  const n = all.length;
  const cur = n ? all[n - 1] : null;
  const inn = card && card.length === n ? card[n - 1] : null;
  return {
    n, side: cur ? cur.side : null, r: cur ? cur.r : 0, w: cur ? cur.w : 0, b: cur ? oversToBalls(cur.o) : 0,
    bats: inn ? Object.fromEntries(inn.bat.map(x => [x[0], [x[1], x[2], x[3], x[4], x[5]]])) : {}
  };
}

// আগের ছবি (prev) আর নতুন ছবি (snap) মিলিয়ে বাংলা লাইন
export function diffLines(prev, snap, sum) {
  if (!snap || !snap.side) return [];
  const T = snap.side === 'a' ? sum.a : sum.b;
  const tn = T.bn || T.name;
  const sc = `${bnNum(snap.r)}/${bnNum(snap.w)}`;
  const ov = ballsToOvers(snap.b);
  if (!prev || !prev.side) return [{ o: ov, k: 'i', t: `${tn} ব্যাট করছে। স্কোর ${sc} (${bnNum(ov)} ওভার)` }];
  const out = [];
  if (snap.n > prev.n) {
    const P = prev.side === 'a' ? sum.a : sum.b;
    out.push({ o: ballsToOvers(prev.b), k: 'i', t: `ইনিংস শেষ। ${P.bn || P.name} ${bnNum(prev.r)}/${bnNum(prev.w)}` });
    out.push({ o: ov, k: 'i', t: `${gen(tn)} ইনিংস শুরু। স্কোর ${sc}` });
    return out.reverse();
  }
  const dB = snap.b - prev.b, dR = snap.r - prev.r, dW = snap.w - prev.w;
  if (dB <= 0 && dR <= 0 && dW <= 0) return [];
  // কে আউট হলো, কে চার-ছক্কা মারলো (ব্যাটারের হিসাব মিলিয়ে)
  const gone = [], hits = [];
  for (const [name, now] of Object.entries(snap.bats || {})) {
    const was = (prev.bats || {})[name];
    if (was && /অপরাজিত|ব্যাট করছেন/.test(was[0]) && !/অপরাজিত|ব্যাট করছেন/.test(now[0])) gone.push(`${name}, ${now[0]} · ${bnNum(now[1])} রানে ফিরলেন`);
    const f = now[3] - (was ? was[3] : 0), s = now[4] - (was ? was[4] : 0);
    if (f > 0) hits.push({ n: name, f, s: 0, t: `${name} ${bnNum(f)}টি চার` });
    if (s > 0) hits.push({ n: name, f: 0, s, t: `${name} ${bnNum(s)}টি ছক্কা` });
  }
  const who = key => { const h = hits.find(x => x[key] > 0); return h ? ' ' + h.n : ''; };
  if (dB === 1 || (dB === 0 && dR > 0)) {
    let k = 'r', t;
    if (dW > 0) { k = 'W'; t = 'আউট! ' + (gone[0] || ''); }
    else if (dB === 0) { k = 'x'; t = `অতিরিক্ত ${bnNum(dR)} রান (ওয়াইড/নো বল)`; }
    else if (dR === 4) { k = '4'; t = 'চার!' + who('f'); }
    else if (dR === 6) { k = '6'; t = 'ছক্কা!' + who('s'); }
    else if (dR === 0) { k = '0'; t = 'রান হয়নি'; }
    else t = `${bnNum(dR)} রান`;
    out.push({ o: ov, k, t: `${t} · স্কোর ${sc}` });
  } else {
    const from = ballsToOvers(prev.b + 1);
    let t = `${bnNum(from)} থেকে ${bnNum(ov)} ওভার: ${bnNum(dR)} রান`;
    if (dW > 0) t += `, ${bnNum(dW)} উইকেট`;
    if (hits.length) t += ` (${hits.map(h => h.t).join(', ')})`;
    t += ` · স্কোর ${sc}`;
    out.push({ o: ov, k: dW > 0 ? 'W' : 'i', t });
    for (const g of gone) out.push({ o: ov, k: 'W', t: 'আউট! ' + g });
  }
  if (Math.floor(snap.b / 6) > Math.floor(prev.b / 6) && snap.b % 6 === 0) out.push({ o: ov, k: 'i', t: `${bnNum(snap.b / 6)} ওভার শেষ। ${tn} ${sc}` });
  return out.reverse();
}

/* ---------- cricScore: এক ডাকেই সব চলমান, আসন্ন আর শেষ ম্যাচ (হালকা ডাটা) ----------
   প্রতিটা সারি মোটামুটি এরকম: { id, dateTimeGMT, matchType, status, ms: 'fixture'|'live'|'result',
   t1: 'Pakistan [PAK]', t2: 'Sri Lanka [SL]', t1s: '250/4 (80)', t2s: '', series }
   মাঠের নাম ঠিক না মিললে null ফেরত দেয়, তখন পুরোনো currentMatches পদ্ধতি চলে। */
const tName = s => String(s || '').replace(/\s*\[[^\]]*\]\s*$/, '').trim();
function parseScore(s) {
  // "350 & 45/2 (12.3)" বা "217/3 (20)" বা "154 (18.3)"
  const out = [];
  for (const part of String(s || '').split('&')) {
    const m = part.match(/(\d+)(?:\/(\d+))?\s*(d)?/);
    if (!m) continue;
    const o = (part.match(/\(([\d.]+)/) || [])[1];
    out.push({ r: +m[1], w: m[2] != null ? +m[2] : (m[3] ? 9 : 10), o: o ? +o : 0 });
  }
  return out;
}
export function cricScoreSummary(x) {
  if (!x || !x.t1 || !x.t2 || !x.id) return null;
  const na = tName(x.t1), nb = tName(x.t2);
  const ms = String(x.ms || '').toLowerCase();
  let state = ms === 'live' ? 'live' : ms === 'result' ? 'done' : 'upcoming';
  // API অনেক সময় খেলা শুরু হওয়ার পরও কিছুক্ষণ 'fixture' রেখে দেয়: স্কোর বা টসের খবর থাকলে আর সময় পার হলে লাইভ ধরি
  const st = String(x.status || '');
  const t0 = Date.parse(/[zZ]$/.test(x.dateTimeGMT || '') ? x.dateTimeGMT : (x.dateTimeGMT || '') + 'Z') || 0;
  if (state === 'upcoming' && t0 && t0 <= Date.now()) {
    if (/won|drawn|tied|no result|abandon/i.test(st)) state = 'done';
    else if (x.t1s || x.t2s || /opt|elected|chose|need|lead|trail|innings|stumps|day \d/i.test(st)) state = 'live';
  }
  const ia = parseScore(x.t1s), ib = parseScore(x.t2s);
  const fake = {
    id: x.id, name: `${na} vs ${nb}, ${x.matchDesc || ''}, ${x.series || ''}`, series: x.series, matchType: x.matchType,
    status: x.status, dateTimeGMT: x.dateTimeGMT, teams: [na, nb],
    matchStarted: state !== 'upcoming', matchEnded: state === 'done',
    score: [...ia.map((s, i) => ({ inning: `${na} Inning ${i + 1}`, ...s })), ...ib.map((s, i) => ({ inning: `${nb} Inning ${i + 1}`, ...s }))]
  };
  const sum = cricSummary(fake);
  sum.tour = x.series || sum.tour;
  sum.ms = String(x.ms || '');
  if (!x.matchDesc) sum.label = fmtType(x.matchType);
  // কে ব্যাট করছে: যে দলের শেষ ইনিংস এখনো শেষ হয়নি
  if (state === 'live') {
    const max = { t20: 20, odi: 50, t10: 10 }[String(x.matchType || '').toLowerCase()] || 999;
    const open = side => { const l = (side === 'a' ? ia : ib).slice(-1)[0]; return l && l.w < 10 && l.o < max; };
    const oa = open('a'), ob = open('b');
    let side = oa && !ob ? 'a' : ob && !oa ? 'b' : ia.length > ib.length ? 'a' : ib.length > ia.length ? 'b' : null;
    if (side) {
      const order = [...sum.inns.filter(i => i.side !== side), ...sum.inns.filter(i => i.side === side)];
      sum.inns = order;
    } else sum.inns = [];
  }
  return sum;
}
