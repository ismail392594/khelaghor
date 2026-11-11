// লাইভ স্কোর: আসন্ন খেলার পূর্বাভাস (কে জিততে পারে, শতাংশে)। সব আনুমানিক, নিশ্চিত নয়।
// ক্রিকেট: দেশের দলের মোটামুটি শক্তির তালিকা + স্বাগতিক দলের সুবিধা।
// ফুটবল: API-Football-এর predictions (দিনে অল্প কয়েকটা বড় খেলার জন্য আনা, Firestore-এ রেখে দেওয়া)।
import { normTeam } from './_bn.js';

// ক্রিকেট দলের আনুমানিক শক্তি (০-১০০)। নিখুঁত র‍্যাঙ্কিং নয়, শুধু পূর্বাভাসের জন্য মোটামুটি হিসাব
const CR = {
  india: 100, australia: 97, england: 92, southafrica: 91, newzealand: 90, pakistan: 86, srilanka: 82, afghanistan: 80,
  westindies: 79, bangladesh: 78, ireland: 66, zimbabwe: 64, netherlands: 62, scotland: 60, nepal: 55, usa: 54,
  unitedstatesofamerica: 54, namibia: 54, unitedarabemirates: 52, uae: 52, oman: 52, canada: 48, papuanewguinea: 46, hongkong: 46
};
const base = n => normTeam(String(n || '').replace(/\s+(women|w|u-?19|under[- ]19|a|emerging)$/i, ''));
const sig = x => 1 / (1 + Math.exp(-x));

export function cricPred(m) {
  const ra = CR[base(m.a.name)], rb = CR[base(m.b.name)];
  if (ra == null || rb == null) return null;
  // "India tour of New Zealand" → নিউজিল্যান্ড স্বাগতিক
  const host = (String(m.tourEn || m.tour || '').match(/tour of ([A-Za-z ]+?)(?:,|\s\d|$)/i) || [])[1];
  const ha = host && base(host) === base(m.a.name) ? 4 : 0, hb = host && base(host) === base(m.b.name) ? 4 : 0;
  let pa = sig(((ra + ha) - (rb + hb)) / 12);
  let d = m.test ? 0.22 : 0;
  // তালিকাটা মূল পুরুষ দলের শক্তি ধরে বানানো: নারী, অনূর্ধ্ব আর "এ" দলে এতটা নিশ্চিত হওয়া যায় না, তাই ৫০%-এর দিকে টেনে আনা
  if (/women|\bu-?\d\d|under|\ba$|lions|emerging/i.test(m.a.name + ' ' + m.b.name)) pa = 0.5 + (pa - 0.5) * 0.6;
  pa = Math.min(0.9, Math.max(0.1, pa));
  return { a: +(pa * (1 - d)).toFixed(3), b: +((1 - pa) * (1 - d)).toFixed(3), d, src: 'rating' };
}

// API-Football predictions → { a, d, b, gh, ga } (gh/ga: আনুমানিক গোল)
const goalGuess = v => { const m = String(v || '').match(/([+-])\s*(\d+(?:\.\d+)?)/); if (!m) return null; const x = +m[2]; return m[1] === '-' ? Math.max(0.3, x - 0.6) : x + 0.4; };
export function fbPredFrom(resp) {
  const p = resp && resp.predictions;
  if (!p || !p.percent) return null;
  const pc = v => (parseFloat(v) || 0) / 100;
  let a = pc(p.percent.home), d = pc(p.percent.draw), b = pc(p.percent.away);
  const t = a + d + b; if (!t) return null;
  a /= t; d /= t; b /= t;
  return { a: +a.toFixed(3), d: +d.toFixed(3), b: +b.toFixed(3), gh: goalGuess(p.goals && p.goals.home), ga: goalGuess(p.goals && p.goals.away), src: 'api' };
}

// একই ডাকে আরও তথ্য: দুই দলের শেষ ৫ খেলার ফর্ম, আগের মুখোমুখি ফল, শক্তির তুলনা
const CMP = { form: 'ফর্ম', att: 'আক্রমণ', def: 'রক্ষণ', poisson_distribution: 'গোলের হিসাব', h2h: 'মুখোমুখি', goals: 'গোল', total: 'মোট' };
export function fbExtraFrom(resp, sum) {
  if (!resp) return null;
  const t = resp.teams || {};
  const form = s => String(s || '').slice(-5).toUpperCase().replace(/[^WDL]/g, '');
  const h2h = (resp.h2h || []).map(x => ({
    t: (x.fixture && x.fixture.timestamp ? x.fixture.timestamp * 1000 : 0),
    h: (x.teams && x.teams.home && x.teams.home.name) || '', a: (x.teams && x.teams.away && x.teams.away.name) || '',
    hg: x.goals ? x.goals.home : null, ag: x.goals ? x.goals.away : null, lg: (x.league && x.league.name) || ''
  })).filter(x => x.hg != null).sort((p, q) => q.t - p.t).slice(0, 6);
  const cmp = Object.entries(resp.comparison || {}).filter(([k]) => CMP[k]).map(([k, v]) => [CMP[k], parseFloat(v.home) || 0, parseFloat(v.away) || 0]);
  const last = side => { const x = t[side] && t[side].last_5; return x ? { gf: x.goals && x.goals.for && x.goals.for.average, ga: x.goals && x.goals.against && x.goals.against.average } : null; };
  return { form: { a: form(t.home && t.home.league && t.home.league.form), b: form(t.away && t.away.league && t.away.league.form) }, h2h, cmp, l5: { a: last('home'), b: last('away') } };
}
