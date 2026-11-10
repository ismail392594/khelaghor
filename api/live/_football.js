// লাইভ স্কোর: ফুটবল (API-Football / v3.football.api-sports.io) থেকে আনা ডাটাকে আমাদের ছাঁচে সাজানো।
// key থাকে Vercel-এর FOOTBALL_API_KEY-এ। লিগ বা ক্লাবের লোগো কখনো নেওয়া হয় না।
import { team, isCountry } from './_teams.js';
import { bnNum, FB_STAT, FB_PER } from './_bn.js';

const BASE = 'https://v3.football.api-sports.io/';

// কোন কোন প্রতিযোগিতা দেখাবো (API-Football-এর লিগ নম্বর)। Vercel-এ LIVE_FB_LEAGUES দিয়ে বদলানো যায়, যেমন "1,2,39"
const DEF_LEAGUES = [1, 2, 3, 4, 5, 6, 7, 9, 10, 15, 17, 22, 29, 30, 31, 32, 33, 34, 39, 45, 61, 78, 135, 140, 143, 848];
// মালিকের সিদ্ধান্ত (৯ নভেম্বর রাত): পৃথিবীর সব ফুটবল খেলা। উপরের তালিকা এখন শুধু "বড় খেলা" চেনার জন্য (আগে দেখায়)।
// শুধু কিছু লিগ চাইলে Vercel-এ LIVE_FB_LEAGUES="1,2,39" দিন।
export const leagues = () => {
  const s = String(process.env.LIVE_FB_LEAGUES || '').split(/[,\s]+/).map(Number).filter(Boolean);
  return s.length ? s : null;
};
export const TOP = new Set(DEF_LEAGUES);

export async function fbCall(path, params = {}) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return { ok: false, err: 'nokey' };
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 7000);
  try {
    const r = await fetch(u, { headers: { 'x-apisports-key': key }, signal: ac.signal });
    const lim = Number(r.headers.get('x-ratelimit-requests-limit')) || null;
    const remH = r.headers.get('x-ratelimit-requests-remaining');
    const rem = remH != null && remH !== '' ? Number(remH) : null;
    const j = await r.json().catch(() => ({}));
    const errs = j.errors && (Array.isArray(j.errors) ? j.errors.length : Object.keys(j.errors).length);
    if (!r.ok || errs) return { ok: false, err: JSON.stringify(j.errors || r.status).slice(0, 160), rem, lim };
    return { ok: true, data: j.response || [], rem, lim };
  } catch (e) {
    return { ok: false, err: 'net' };
  } finally { clearTimeout(tm); }
}

const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
const DONE = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];

export function fbSummary(f) {
  const fx = f.fixture || {}, lg = f.league || {}, tm = f.teams || {}, g = f.goals || {}, sc = f.score || {};
  const st = (fx.status && fx.status.short) || 'NS';
  const national = lg.country === 'World' || (isCountry(tm.home && tm.home.name) && isCountry(tm.away && tm.away.name));
  const a = { ...team(tm.home && tm.home.name, national), g: g.home, tid: tm.home && tm.home.id };
  const b = { ...team(tm.away && tm.away.name, national), g: g.away, tid: tm.away && tm.away.id };
  const state = LIVE.includes(st) ? 'live' : DONE.includes(st) ? 'done' : 'upcoming';
  const out = {
    id: 'f_' + fx.id, sport: 'football', state, start: (fx.timestamp || 0) * 1000,
    tour: (lg.name || '') + (lg.country && lg.country !== 'World' && !TOP.has(lg.id) ? ` (${lg.country})` : ''), label: roundBn(lg.round), lg: lg.id, season: lg.season,
    rk: TOP.has(lg.id) ? 3 : national ? 2 : 1, intl: national, venue: (fx.venue && fx.venue.name) || '', city: (fx.venue && fx.venue.city) || '',
    a, b, per: st, min: fx.status && fx.status.elapsed, status: FB_PER[st] || st
  };
  if (sc.penalty && sc.penalty.home != null) out.pen = [sc.penalty.home, sc.penalty.away];
  if (state === 'done') {
    if (['CANC', 'ABD'].includes(st)) out.result = 'void';
    else if (tm.home && tm.home.winner === true) out.result = 'a';
    else if (tm.away && tm.away.winner === true) out.result = 'b';
    else if (a.g != null && a.g === b.g) out.result = 'd';
    else if (a.g != null && b.g != null) out.result = a.g > b.g ? 'a' : 'b';
    const wn = out.result === 'a' ? (a.bn || a.name) : out.result === 'b' ? (b.bn || b.name) : null;
    if (wn) out.status = `${wn} জিতেছে` + (st === 'PEN' ? ' (টাইব্রেকারে)' : st === 'AET' ? ' (অতিরিক্ত সময়ে)' : '');
    else if (out.result === 'd') out.status = 'ম্যাচ ড্র হয়েছে';
  }
  return out;
}

function roundBn(r) {
  const t = String(r || '');
  let m;
  if ((m = t.match(/Regular Season - (\d+)/i))) return `ম্যাচডে ${bnNum(m[1])}`;
  if ((m = t.match(/Group ([A-Z])\s*-\s*(\d+)/i))) return `গ্রুপ ${m[1]} · ম্যাচ ${bnNum(m[2])}`;
  if ((m = t.match(/Group Stage\s*-\s*(\d+)/i))) return `গ্রুপ পর্ব · ম্যাচ ${bnNum(m[1])}`;
  if ((m = t.match(/League Stage\s*-\s*(\d+)/i))) return `লিগ পর্ব · ম্যাচ ${bnNum(m[1])}`;
  if (/round of 16|8th finals/i.test(t)) return 'শেষ ষোলো';
  if (/quarter/i.test(t)) return 'কোয়ার্টার ফাইনাল';
  if (/semi/i.test(t)) return 'সেমিফাইনাল';
  if (/3rd place/i.test(t)) return 'তৃতীয় স্থান';
  if (/^final$/i.test(t)) return 'ফাইনাল';
  return t.length < 30 ? t : '';
}

// এক ম্যাচের বিস্তারিত: ঘটনা (গোল, কার্ড, বদলি) বাংলায় আর পরিসংখ্যান
export function fbDetail(f, sum) {
  const side = name => (name === sum.a.name ? sum.a : name === sum.b.name ? sum.b : null);
  const tnm = name => { const s = side(name); return s ? (s.bn || s.name) : name || ''; };
  const comm = [];
  let ga = 0, gb = 0;
  for (const e of f.events || []) {
    const min = e.time ? (e.time.elapsed || 0) + (e.time.extra ? '+' + e.time.extra : '') : '';
    const o = min ? min + "'" : '';
    const who = (e.player && e.player.name) || '';
    const tn = tnm(e.team && e.team.name);
    const type = String(e.type || ''), det = String(e.detail || '');
    if (type === 'Goal' && /shootout/i.test(e.comments || '')) {
      // টাইব্রেকারের শট: মূল খেলার গোলে গোনা হয় না
      comm.push({ o: '', k: /missed/i.test(det) ? 'x' : 'P', t: `টাইব্রেকার: ${who} (${tn}) ${/missed/i.test(det) ? 'মিস করলেন' : 'গোল করলেন'}` });
      continue;
    }
    if (type === 'Goal') {
      if (/missed/i.test(det)) { comm.push({ o, k: 'x', t: `পেনাল্টি মিস! ${who} (${tn})` }); continue; }
      if (side(e.team && e.team.name) === sum.a) ga++; else gb++;
      const kind = /own/i.test(det) ? 'আত্মঘাতী গোল' : /penalty/i.test(det) ? 'পেনাল্টিতে গোল' : 'গোল';
      const as = e.assist && e.assist.name ? `, সহায়তা: ${e.assist.name}` : '';
      comm.push({ o, k: 'G', t: `${kind}! ${who} (${tn})${as} · ${bnNum(ga)}-${bnNum(gb)}` });
    } else if (type === 'Card') {
      const red = /red/i.test(det);
      comm.push({ o, k: red ? 'R' : 'Y', t: `${red ? 'লাল' : 'হলুদ'} কার্ড: ${who} (${tn})` });
    } else if (/subst/i.test(type)) {
      const inn = e.assist && e.assist.name;
      comm.push({ o, k: 'S', t: `বদলি (${tn}): ${inn ? inn + ' ঢুকলেন, ' : ''}${who} বের হলেন` });
    } else if (/var/i.test(type)) {
      comm.push({ o, k: 'V', t: `ভিএআর: ${det || 'সিদ্ধান্ত যাচাই'} (${tn})` });
    }
  }
  const st = sum.per;
  if (['HT', 'BT'].includes(st)) comm.push({ o: '', k: 'i', t: 'বিরতি চলছে' });
  if (['FT', 'AET', 'PEN'].includes(st)) comm.push({ o: '', k: 'i', t: 'খেলা শেষ! ' + sum.status });
  const stats = [];
  const S = f.statistics || [];
  if (S.length === 2) {
    const get = (i, k) => { const x = (S[i].statistics || []).find(s => s.type === k); return x ? x.value : null; };
    for (const [k, bn] of Object.entries(FB_STAT)) {
      const va = get(0, k), vb = get(1, k);
      if (va == null && vb == null) continue;
      stats.push([bn, va == null ? 0 : va, vb == null ? 0 : vb]);
    }
  }
  // একাদশ (একই ডাকেই আসে, বাড়তি খরচ নেই)
  const lu = (f.lineups || []).map(l => ({
    t: tnm(l.team && l.team.name), f: l.formation || '', coach: (l.coach && l.coach.name) || '',
    xi: (l.startXI || []).map(p => [p.player && p.player.number, p.player && p.player.name, p.player && p.player.pos]),
    sub: (l.substitutes || []).map(p => [p.player && p.player.number, p.player && p.player.name, p.player && p.player.pos])
  })).filter(l => l.xi.length);
  // গোলদাতা আর লাল কার্ড (দলের নামের নিচে দেখানোর জন্য)
  const gl = (f.events || []).filter(e => (e.type === 'Goal' && !/missed/i.test(e.detail || '') && !/shootout/i.test(e.comments || '')) || (e.type === 'Card' && /red/i.test(e.detail || ''))).map(e => {
    const sd = side(e.team && e.team.name) === sum.a ? 'a' : 'b';
    const min = e.time ? (e.time.elapsed || 0) + (e.time.extra ? '+' + e.time.extra : '') : '';
    return { s: sd, m: min, n: (e.player && e.player.name) || '', k: e.type === 'Card' ? 'R' : /own/i.test(e.detail || '') ? 'OG' : /penalty/i.test(e.detail || '') ? 'P' : 'G' };
  });
  return { comm: comm.reverse(), stats, lu, gl };
}
