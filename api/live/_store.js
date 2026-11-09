// লাইভ স্কোর: মূল সার্ভার কাজ।
// নিয়ম: API থেকে ডাটা আনে খুব মেপে মেপে, এনে Firestore-এ রেখে দেয়। দর্শক যতই হোক, সবাই রাখা ডাটা পড়ে।
// ১০ জন বা ১০ হাজার জন দেখলেও API-কে ডাকার সংখ্যা একই থাকে।
//
// Firestore-এ যা থাকে (সবকিছু শুধু সার্ভার লেখে-পড়ে, ব্রাউজার সরাসরি ছুঁতে পারে না):
//   liveCache/feed        সব ম্যাচের তালিকা
//   liveMeta/state        তালা (একসাথে দুইজন যেন API না ডাকে) আর আজ API-তে কতবার বাকি
//   liveMatch/{id}        এক ম্যাচের বিস্তারিত, স্কোরকার্ড, বাংলা বল-বাই-বল
//   liveVotes/{id}        "কে জিতবে?" ভোটের গোনা;  liveVotes/{id}/v/{uid} প্রত্যেকের ভোট
//   livePoints/{uid}      প্রত্যেকের পয়েন্ট (লিডারবোর্ড)
import { cricCall, cricSummary, cricScoreSummary, cricCard, bbbLines, snapOf, diffLines } from './_cricket.js';
import { fbCall, fbSummary, fbDetail, leagues } from './_football.js';
import { demoAll, demoMatch } from './_demo.js';
import { hasSm, smCall, smSummary, smDetail, LIST_INC, DETAIL_INC } from './_smonks.js';
import { normTeam } from './_bn.js';

export const POINTS = 10; // সঠিক অনুমানে কত পয়েন্ট
export const EXACT = 20; // ফুটবলে একদম সঠিক স্কোর বললে বাড়তি পয়েন্ট
// সপ্তাহের নাম (ঢাকার সময়ে, সোমবার থেকে শুরু): যেমন 2026-11-09
export const weekKey = (t = Date.now()) => { const d = new Date(t + 6 * 3600e3); const day = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10); };
const CACHE_V = 4; // ক্যাশের ছাঁচ বদলালে বাড়াতে হয়, তাহলে পুরোনো ক্যাশ ফেলে সব নতুন করে আনে
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

export class HttpErr extends Error { constructor(status, msg) { super(msg); this.status = status; } }

let _fb = null;
export async function fb() {
  if (_fb) return _fb;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const [A, U, S] = await Promise.all([import('firebase-admin/app'), import('firebase-admin/auth'), import('firebase-admin/firestore')]);
  if (!A.getApps().length) A.initializeApp({ credential: A.cert(JSON.parse(raw)) });
  _fb = { auth: U.getAuth(), db: S.getFirestore(), FV: S.FieldValue };
  return _fb;
}

export const _setFb = x => { _fb = x; }; // শুধু পরীক্ষার জন্য

const has = () => ({ c: !!process.env.CRICKET_API_KEY, f: !!process.env.FOOTBALL_API_KEY, s: hasSm() });
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const dhakaDay = t => new Date(t + 6 * HOUR).toISOString().slice(0, 10);

// আজ API-কে আর কতবার ডাকা যাবে (জানা না থাকলে সাবধানে ৮০ ধরি)
function remOf(q, now) {
  if (!q || q.rem == null) return 80;
  return q.day === utcDay(now) ? q.rem : (q.lim || 80);
}
// বাকি সংখ্যাটা দিনের বাকি সময়ে সমান ভাগে খরচ করা: কতক্ষণ পরপর ডাকা যাবে
function every(rem, now, minMs, share) {
  if (rem <= 3) return Infinity;
  const left = (Date.parse(utcDay(now) + 'T00:00:00Z') + DAY) - now;
  return Math.max(minMs, left / Math.max(1, rem * share));
}

/* ---------- ম্যাচের তালিকা ---------- */
export async function getFeed(now = Date.now()) {
  const H = has();
  const demoWant = { cricket: !H.c && !H.s, football: !H.f };
  const demo = (demoWant.cricket || demoWant.football) ? demoAll(now, demoWant).map(x => x.m) : [];
  if (!H.c && !H.f && !H.s) return { at: now, matches: demo, demo: true };
  const F = await fb();
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const { db } = F;
  const ref = db.doc('liveCache/feed');
  let doc = (await ref.get()).data() || {};
  const due = plan(doc, H, now);
  if (due.any) doc = await refresh(F, doc, due, now) || doc;
  return { at: now, matches: compose(doc, now).concat(demo), demo: !!demo.length };
}

function plan(doc, H, now) {
  const c = doc.c || {}, f = doc.f || {};
  const cRem = remOf(doc.cq, now), fRem = remOf(doc.fq, now);
  // চলছে, অথবা শুরুর সময় পার হয়েছে কিন্তু API এখনো শুরু বলেনি: তাহলে ঘন ঘন আনি
  const cLive = [...(c.list || []), ...(c.up || [])].some(m => (m.state === 'live' && !m.pause) || (m.state === 'upcoming' && m.start <= now && m.start > now - 3 * HOUR));
  const fAll = [...(f.day || []), ...(f.live || [])];
  const fLive = fAll.some(m => m.state === 'live' || (m.state === 'upcoming' && m.start <= now + MIN && m.start > now - 3 * HOUR));
  const stale = doc.v !== CACHE_V;
  const d = {
    // ফ্রি প্ল্যানে সাশ্রয়: খেলা চললে বাকি ডাটার বেশিরভাগ (৬০%) তালিকায়; কিছু না চললে ঘণ্টায় একবার
    cList: H.c && stale || H.c && now - (c.at || 0) > (cLive ? every(cRem, now, MIN, 0.6) : Math.max(60 * MIN, every(cRem, now, 60 * MIN, 0.1))),
    // আসন্ন খেলা মূল তালিকাতেই (cricScore) আসে, তাই আলাদা তালিকা দিনে একবার যথেষ্ট
    cUp: H.c && now - (c.upAt || 0) > 24 * HOUR,
    fLive: H.f && fLive && now - (f.at || 0) > every(fRem, now, MIN, 0.6),
    fDay: H.f && stale || H.f && (now - (f.dayAt || 0) > Math.max(2 * HOUR, every(fRem, now, 2 * HOUR, 0.15)) || f.dayKey !== dhakaDay(now))
  };
  // Sportmonks: ঘণ্টায় ২,০০০ বার ডাকা যায়, তাই খেলা চললে প্রায় প্রতি মিনিটে
  const s = doc.s || {};
  const sLive = [...(s.live || []), ...(s.fx || [])].some(m => (m.state === 'live' && !m.pause) || (m.state === 'upcoming' && m.start <= now && m.start > now - 3 * HOUR));
  d.sLive = H.s && (stale || now - (s.at || 0) > (sLive ? 50e3 : 10 * MIN));
  d.sFx = H.s && (stale || now - (s.fxAt || 0) > 30 * MIN);
  d.any = d.cList || d.cUp || d.fLive || d.fDay || d.sLive || d.sFx;
  return d;
}

// তালা নেওয়া: একসাথে একজনই API ডাকবে। পেলে আগের অবস্থা (meta) ফেরত দেয়, না পেলে null
async function lock(db, now, ms = 25e3) {
  const ref = db.doc('liveMeta/state');
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const m = s.data() || {};
    if ((m.until || 0) > now) return null;
    tx.set(ref, { until: now + ms }, { merge: true });
    return m;
  }).catch(() => null);
}
const qOf = (r, now, old) => (r && r.rem != null ? { day: utcDay(now), rem: r.rem, lim: r.lim || (old && old.lim) || null } : old || null);

async function refresh(F, doc, due, now) {
  const { db, FV } = F;
  const meta = await lock(db, now);
  if (!meta) return null;
  const c = { ...(doc.c || {}) }, f = { ...(doc.f || {}) }, sm = { ...(doc.s || {}) };
  let cq = doc.cq || meta.cq || null, fq = doc.fq || meta.fq || null;
  try {
    const jobs = [];
    // API একবারে ২৫টা ম্যাচ দেয়; বেশি থাকলে পরের পাতাও আনি (বড় দলের খেলা যেন বাদ না পড়ে)
    const pages = async (path, max) => {
      const out = []; let ok = false;
      for (let i = 0; i < max; i++) {
        const r = await cricCall(path, { offset: i * 25 });
        cq = qOf(r, now, cq);
        if (!r.ok) { c.err = r.err; break; }
        ok = true; out.push(...(r.data || []));
        if (!r.total || (i + 1) * 25 >= r.total) break;
      }
      return ok ? out.map(cricSummary) : null;
    };
    // প্রথমে cricScore (এক ডাকেই পৃথিবীর সব ম্যাচ), না চললে currentMatches-এর পাতাগুলো
    if (due.cList) jobs.push((async () => {
      const r = await cricCall('cricScore');
      cq = qOf(r, now, cq);
      let l = null;
      if (r.ok && Array.isArray(r.data)) {
        l = r.data.map(x => { try { return cricScoreSummary(x); } catch (e) { return null; } }).filter(Boolean)
          .filter(m => m.state === 'live' || (m.state === 'upcoming' && m.start < now + 8 * DAY && m.start > now - 12 * HOUR) || (m.state === 'done' && m.start > now - 48 * HOUR));
        c.src = 'cricScore'; c.raw = r.data.length;
      } else c.err = 'cricScore: ' + r.err;
      if (!l || !l.length) { l = await pages('currentMatches', 2); c.src = 'currentMatches'; }
      if (l) { c.list = l.sort((x, y) => (y.state === 'live') - (x.state === 'live') || (y.rk || 0) - (x.rk || 0)).slice(0, 120); c.at = now; }
    })());
    if (due.cUp) jobs.push(pages('matches', 1).then(l => {
      if (l) { c.up = l.filter(m => m.state === 'upcoming' && m.start > now - HOUR && m.start < now + 8 * DAY).sort((x, y) => (y.rk || 0) - (x.rk || 0) || x.start - y.start).slice(0, 50); c.upAt = now; }
    }));
    const lg = leagues();
    if (due.fDay) {
      jobs.push(Promise.all([-1, 0, 1].map(k => fbCall('fixtures', { date: dhakaDay(now + k * DAY), timezone: 'Asia/Dhaka' }))).then(rs => {
        for (const r of rs) fq = qOf(r, now, fq);
        if (rs.every(r => r.ok)) {
          f.day = rs.flatMap(r => r.data).filter(x => lg.includes(x.league && x.league.id)).map(fbSummary).slice(0, 120);
          f.dayAt = now; f.dayKey = dhakaDay(now);
        } else f.err = (rs.find(r => !r.ok) || {}).err;
      }));
    }
    if (due.fLive) jobs.push(fbCall('fixtures', { live: lg.join('-') }).then(async r => {
      fq = qOf(r, now, fq);
      if (!r.ok) { f.err = r.err; return; }
      f.live = r.data.map(fbSummary); f.at = now; f.liveOk = now;
    }));
    if (due.sLive) jobs.push(smCall('livescores', { include: LIST_INC }).then(r => {
      if (r.ok) { sm.live = (r.data || []).map(x => { try { return smSummary(x); } catch (e) { return null; } }).filter(Boolean); sm.at = now; sm.err = null; }
      else sm.err = r.err;
    }));
    if (due.sFx) jobs.push((async () => {
      const d0 = new Date(now - DAY).toISOString().slice(0, 10), d1 = new Date(now + 7 * DAY).toISOString().slice(0, 10);
      const out = [];
      for (let pg = 1; pg <= 3; pg++) {
        const r = await smCall('fixtures', { include: LIST_INC, 'filter[starts_between]': `${d0},${d1}`, page: pg });
        if (!r.ok) { sm.err = r.err; break; }
        out.push(...(r.data || []));
        const pgn = r.meta && r.meta.pagination;
        if (!pgn || pgn.current_page >= pgn.total_pages) break;
      }
      if (out.length) { sm.fx = out.map(x => { try { return smSummary(x); } catch (e) { return null; } }).filter(Boolean).slice(0, 200); sm.fxAt = now; }
    })());
    await Promise.all(jobs);
    // তালিকায় "চলছে" ছিল কিন্তু এখন লাইভে নেই → খেলা শেষ, ফলাফল আনি (সব কাজ শেষে, যাতে একটা আরেকটাকে মুছে না দেয়)
    if (f.liveOk === now) {
      const liveIds = new Set((f.live || []).map(m => m.id));
      const gone = (f.day || []).filter(m => m.state === 'live' && !liveIds.has(m.id)).map(m => m.id.slice(2)).slice(0, 20);
      if (gone.length) {
        const g = await fbCall('fixtures', { ids: gone.join('-') });
        fq = qOf(g, now, fq);
        if (g.ok) { const upd = new Map(g.data.map(fbSummary).map(m => [m.id, m])); f.day = (f.day || []).map(m => upd.get(m.id) || m); }
      }
    }
    const out = { v: CACHE_V, c, f, s: sm, cq, fq };
    await db.doc('liveCache/feed').set(out);
    const metaUp = { until: 0, cq, fq };
    if (now - (meta.settleAt || 0) > 5 * MIN) {
      metaUp.settleAt = now;
      await settleDue(F, compose(out, now), now).catch(e => console.error('settle', e));
    }
    await db.doc('liveMeta/state').set(metaUp, { merge: true });
    return out;
  } catch (e) {
    console.error('live refresh', e);
    await db.doc('liveMeta/state').set({ until: 0 }, { merge: true }).catch(() => {});
    return null;
  }
}

// ক্যাশ থেকে দেখানোর তালিকা: লাইভ সব, আসন্ন ৪ দিন, শেষ ৩৬ ঘণ্টা
function compose(doc, now) {
  const c = doc.c || {}, f = doc.f || {};
  const map = new Map();
  for (const m of c.up || []) map.set(m.id, m);
  for (const m of c.list || []) map.set(m.id, m);
  for (const m of f.day || []) map.set(m.id, m);
  for (const m of f.live || []) map.set(m.id, m);
  // Sportmonks-এর ম্যাচ থাকলে CricketData-র একই ম্যাচ বাদ (একই দুই দল, কাছাকাছি সময়)
  const sm = doc.s || {};
  const smMap = new Map();
  for (const m of sm.fx || []) smMap.set(m.id, m);
  for (const m of sm.live || []) smMap.set(m.id, m);
  if (smMap.size) {
    const keyOf = m => [normTeam(m.a.name), normTeam(m.b.name)].sort().join('|');
    // খেলা কতটা এগিয়েছে: শেষ হলে সবচেয়ে বেশি, নইলে মোট কত বল হয়েছে
    const balls = o => { const n = Number(o) || 0; const f = Math.floor(n); return f * 6 + Math.round((n - f) * 10); };
    const prog = m => (m.state === 'done' ? 1e6 : 0) + (m.state === 'live' ? 1 : 0) + (m.inns || []).reduce((t, i) => t + balls(i.o) + (i.w || 0) * 0.01 + (i.r || 0) * 1e-4, 0);
    for (const [id, m] of [...map]) {
      if (id[0] !== 'c') continue;
      const k = keyOf(m);
      const twin = [...smMap.values()].find(x => keyOf(x) === k && Math.abs(x.start - m.start) < 8 * HOUR);
      if (!twin) continue;
      map.delete(id);
      // একই ম্যাচ দুই উৎসে: id থাকে Sportmonks-এর (ভোট যেন না হারায়), স্কোর নেওয়া হয় যেটা বেশি এগিয়ে
      if (prog(m) > prog(twin)) smMap.set(twin.id, { ...twin, state: m.state, a: { ...twin.a, inn: m.a.inn }, b: { ...twin.b, inn: m.b.inn }, inns: m.inns, status: m.status, raw: m.raw, pause: m.pause, result: m.result ?? twin.result, via: 'c' });
    }
    for (const [id, m] of smMap) map.set(id, m);
  }
  for (const [id, m] of Object.entries(doc.fresh || {})) {
    const listAt = id[0] === 'c' ? (c.at || 0) : id[0] === 's' ? (sm.at || 0) : (f.at || 0);
    if ((m._at || 0) > listAt && map.has(id)) map.set(id, m);
  }
  return [...map.values()].filter(m =>
    m.state === 'live' ||
    (m.state === 'upcoming' && m.start > now - 12 * HOUR && m.start < now + 8 * DAY) ||
    (m.state === 'done' && m.start > now - 36 * HOUR));
}

/* ---------- এক ম্যাচের বিস্তারিত ---------- */
export async function getMatch(id, now = Date.now()) {
  if (!/^[a-z]_[A-Za-z0-9_-]{1,60}$/.test(id)) throw new HttpErr(400, 'ভুল ম্যাচ');
  const F = await fb();
  if (id.startsWith('d_')) {
    const x = demoMatch(id, now);
    if (!x) throw new HttpErr(404, 'ম্যাচ পাওয়া যায়নি');
    return { m: x.m, det: x.det, votes: await votesOf(F, id), react: await reactsOf(F, id) };
  }
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const { db } = F;
  const feed = await getFeed(now);
  const ref = db.doc('liveMatch/' + id);
  let md = (await ref.get()).data() || null;
  let S = feed.matches.find(m => m.id === id) || (md && md.sum);
  if (!S) throw new HttpErr(404, 'ম্যাচ পাওয়া যায়নি');
  const sport = id[0] === 'f' ? 'football' : 'cricket';
  const liveN = Math.max(1, feed.matches.filter(m => m.sport === sport && m.state === 'live').length);
  let due = false;
  if (id[0] === 's') {
    // Sportmonks: সীমা অনেক বেশি, তাই চলমান খেলায় ২০ সেকেন্ড পরপর
    if (S.state === 'live' || (S.state === 'upcoming' && S.start <= now && S.start > now - 6 * HOUR)) due = !md || now - (md.at || 0) > 20e3;
    else if (S.state === 'done') due = !md || !md.final;
  } else if (S.state === 'live') {
    const st = (await db.doc('liveMeta/state').get()).data() || {};
    const rem = remOf(sport === 'cricket' ? st.cq : st.fq, now);
    due = !md || now - (md.at || 0) > every(rem, now, MIN, 0.5 / liveN) * (sport === 'cricket' ? 2 : 1);
  } else if (S.state === 'upcoming' && S.start <= now && S.start > now - 6 * HOUR) {
    // শুরুর সময় পার, তালিকা এখনো "আসন্ন": কেউ ম্যাচটা খুললে এই ম্যাচটাই আলাদা করে আনি
    const st = (await db.doc('liveMeta/state').get()).data() || {};
    const rem = remOf(sport === 'cricket' ? st.cq : st.fq, now);
    due = !md || now - (md.at || 0) > every(rem, now, 2 * MIN, 0.25);
  } else if (S.state === 'done') due = !md || !md.final;
  if (due) md = await refreshMatch(F, id, S, md, now) || md;
  // ফিড আর বিস্তারিত: যেটা নতুন সেটাই দেখাই
  const sum = md && md.sum && (md.at || 0) >= (feed.at - 2 * MIN) ? md.sum : S;
  return { m: sum, det: (md && md.det) || null, votes: await votesOf(F, id), react: await reactsOf(F, id) };
}

async function refreshMatch(F, id, S, md, now) {
  const { db } = F;
  const ref = db.doc('liveMatch/' + id);
  const got = await db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const d = s.data() || {};
    if ((d.until || 0) > now) return false;
    tx.set(ref, { until: now + 20e3 }, { merge: true });
    return true;
  }).catch(() => false);
  if (!got) return null;
  try {
    const rid = id.slice(2);
    const st = (await db.doc('liveMeta/state').get()).data() || {};
    let out;
    if (id[0] === 's') {
      const r = await smCall('fixtures/' + rid, { include: DETAIL_INC });
      if (!r.ok || !r.data) { await ref.set({ until: 0 }, { merge: true }); return null; }
      const sum = smSummary(r.data);
      out = { at: now, until: 0, sum, det: smDetail(r.data, sum), final: sum.state === 'done' };
    } else if (id[0] === 'c') {
      const useB = !(st.bbbOff > now);
      const [sc, bb] = await Promise.all([cricCall('match_scorecard', { id: rid }), useB ? cricCall('match_bbb', { id: rid }) : null]);
      let cq = qOf(sc, now, st.cq); if (bb) cq = qOf(bb, now, cq);
      const metaUp = { cq };
      if (bb && !bb.ok) metaUp.bbbOff = now + 6 * HOUR;
      await db.doc('liveMeta/state').set(metaUp, { merge: true });
      if (!sc.ok) { await ref.set({ until: 0 }, { merge: true }); return null; }
      const d = sc.data || {};
      let sum = { ...S, ...cricSummary(d) };
      if (d.matchStarted === undefined && d.matchEnded === undefined) sum.state = sum.result ? 'done' : S.state;
      const card = cricCard(d, sum);
      const snap = snapOf(sum, card);
      let comm = bb && bb.ok ? bbbLines(bb.data) : [];
      if (!comm.length) comm = diffLines(md && md.snap, snap, sum).map(x => ({ ...x, at: now })).concat((md && md.det && md.det.comm) || []);
      out = { at: now, until: 0, sum, snap, det: { card, comm: comm.slice(0, 150) }, final: sum.state === 'done' };
    } else {
      const r = await fbCall('fixtures', { id: rid });
      await db.doc('liveMeta/state').set({ fq: qOf(r, now, st.fq) }, { merge: true });
      if (!r.ok || !r.data[0]) { await ref.set({ until: 0 }, { merge: true }); return null; }
      const sum = fbSummary(r.data[0]);
      out = { at: now, until: 0, sum, det: fbDetail(r.data[0], sum), final: sum.state === 'done' };
    }
    await ref.set(out);
    // তালিকাতেও সঙ্গে সঙ্গে নতুন স্কোর দেখাতে
    await db.doc('liveCache/feed').set({ fresh: { [id]: { ...out.sum, _at: now } } }, { merge: true }).catch(() => {});
    return out;
  } catch (e) {
    console.error('live match', e);
    await ref.set({ until: 0 }, { merge: true }).catch(() => {});
    return null;
  }
}

/* ---------- দর্শকদের ইমোজি প্রতিক্রিয়া (লগইন লাগে না) ---------- */
export const REACTS = ['fire', 'wow', 'clap', 'sad', 'love'];
async function reactsOf(F, id) {
  if (!F) return {};
  const d = (await F.db.doc('liveReact/' + id).get()).data() || {};
  return Object.fromEntries(REACTS.map(k => [k, d[k] || 0]));
}
export async function react(req) {
  const b = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  const id = String(b.id || ''), e = String(b.e || ''), n = Math.max(1, Math.min(10, Number(b.n) || 1));
  if (!REACTS.includes(e) || !/^[a-z]_[A-Za-z0-9_-]{1,60}$/.test(id)) throw new HttpErr(400, 'ভুল');
  const F = await fb();
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  await F.db.doc('liveReact/' + id).set({ [e]: F.FV.increment(n), at: Date.now() }, { merge: true });
  return { ok: true };
}

async function votesOf(F, id) {
  if (!F) return { a: 0, b: 0, d: 0 };
  const v = (await F.db.doc('liveVotes/' + id).get()).data() || {};
  return { a: v.ca || 0, b: v.cb || 0, d: v.cd || 0 };
}

/* ---------- ভোট ---------- */
async function who(F, req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  try { return await F.auth.verifyIdToken(token); } catch (e) { throw new HttpErr(401, 'ভোট দিতে আগে লগইন করুন'); }
}

export async function vote(req, now = Date.now()) {
  const b = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  const id = String(b.id || '');
  let pick = String(b.pick || '');
  // ফুটবলে চাইলে সঠিক স্কোরও (০-১৫)। স্কোর দিলে বিজয়ী সেখান থেকেই ঠিক হয়
  const ga = b.ga == null || b.ga === '' ? null : Number(b.ga), gb = b.gb == null || b.gb === '' ? null : Number(b.gb);
  const hasScore = Number.isInteger(ga) && Number.isInteger(gb) && ga >= 0 && gb >= 0 && ga <= 15 && gb <= 15;
  if (hasScore) pick = ga > gb ? 'a' : gb > ga ? 'b' : 'd';
  if (!['a', 'b', 'd'].includes(pick) || !/^[a-z]_[A-Za-z0-9_-]{1,60}$/.test(id)) throw new HttpErr(400, 'ভুল ভোট');
  const F = await fb();
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const { db, FV } = F;
  const t = await who(F, req);
  const m = id.startsWith('d_') ? (demoMatch(id, now) || {}).m : (await getFeed(now)).matches.find(x => x.id === id);
  if (!m) throw new HttpErr(404, 'ম্যাচ পাওয়া যায়নি');
  if (m.state !== 'upcoming' || m.start <= now) throw new HttpErr(400, 'খেলা শুরু হয়ে গেছে, এখন আর ভোট দেওয়া যাবে না');
  if (pick === 'd' && m.sport === 'cricket' && !m.test) throw new HttpErr(400, 'এই ম্যাচে ড্র হয় না');
  if (hasScore && m.sport !== 'football') throw new HttpErr(400, 'স্কোর আন্দাজ শুধু ফুটবলে');
  const u = (await db.doc('users/' + t.uid).get()).data() || {};
  const name = String(u.username ? '@' + u.username : (u.name || t.name || 'খেলোয়াড়')).slice(0, 24);
  try {
    await db.doc(`liveVotes/${id}/v/${t.uid}`).create({ pick, at: now, name, res: null, ...(hasScore ? { ga, gb } : {}) });
  } catch (e) {
    if (e.code === 6 || /already exists/i.test(e.message)) throw new HttpErr(409, 'আপনি এই ম্যাচে আগেই ভোট দিয়েছেন');
    throw e;
  }
  const demo = !!m.demo;
  const bt = db.batch();
  bt.set(db.doc('liveVotes/' + id), { sport: m.sport, start: m.start, settled: demo, demo, ['c' + pick]: FV.increment(1) }, { merge: true });
  const pu = { name, recent: { [id]: pick + '|' + m.start + (hasScore ? `|${ga}-${gb}` : '') }, at: now };
  if (!demo) Object.assign(pu, { n: FV.increment(1), pts: FV.increment(0), ok: FV.increment(0) });
  bt.set(db.doc('livePoints/' + t.uid), pu, { merge: true });
  await bt.commit();
  return { ok: true, pick, score: hasScore ? [ga, gb] : null };
}

export async function me(req, now = Date.now()) {
  const F = await fb();
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const t = await who(F, req);
  const ref = F.db.doc('livePoints/' + t.uid);
  const d = (await ref.get()).data() || {};
  const rec = d.recent || {};
  const ids = Object.keys(rec);
  if (ids.length > 120) { // পুরোনো ভোটের তালিকা ছোট রাখা
    const old = ids.sort((x, y) => (+String(rec[x]).split('|')[1] || 0) - (+String(rec[y]).split('|')[1] || 0)).slice(0, ids.length - 100);
    await ref.update(Object.fromEntries(old.map(k => ['recent.' + k, F.FV.delete()]))).catch(() => {});
    old.forEach(k => delete rec[k]);
  }
  const picks = Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, String(v).split('|')[0]]));
  const scores = Object.fromEntries(Object.entries(rec).filter(([, v]) => String(v).split('|')[2]).map(([k, v]) => [k, String(v).split('|')[2].split('-').map(Number)]));
  return { name: d.name || null, pts: d.pts || 0, ok: d.ok || 0, n: d.n || 0, ex: d.ex || 0, week: (d.wk || {})[weekKey(now)] || 0, picks, scores };
}

export async function board(period = 'all', now = Date.now()) {
  const F = await fb();
  if (!F) return { list: [] };
  const wk = weekKey(now);
  const field = period === 'week' ? `wk.${wk}` : 'pts';
  const q = await F.db.collection('livePoints').orderBy(field, 'desc').limit(50).get();
  return {
    period, week: wk,
    list: q.docs.map(d => { const x = d.data(); return { name: x.name || 'খেলোয়াড়', pts: period === 'week' ? ((x.wk || {})[wk] || 0) : (x.pts || 0), ok: x.ok || 0, n: x.n || 0, ex: x.ex || 0 }; })
  };
}

/* ---------- খেলা শেষে পয়েন্ট দেওয়া ---------- */
async function settleDue(F, matches, now) {
  const { db } = F;
  const q = await db.collection('liveVotes').where('settled', '==', false).limit(8).get();
  for (const d of q.docs) {
    const id = d.id, v = d.data();
    if ((v.start || 0) > now) continue;
    let m = matches.find(x => x.id === id);
    if (!m || m.state !== 'done') { const md = (await db.doc('liveMatch/' + id).get()).data(); if (md && md.sum && md.sum.state === 'done') m = md.sum; }
    if ((!m || m.state !== 'done') && now - v.start > 8 * HOUR) m = await fetchResult(id) || m;
    if ((!m || m.state !== 'done') && now - v.start > 6 * DAY) m = { state: 'done', result: 'void' };
    if (!m || m.state !== 'done' || !m.result) continue;
    await settleOne(F, id, m.result, m.sport === 'football' && m.a && m.a.g != null ? [m.a.g, m.b.g] : null);
  }
}

// তালিকা থেকে বাদ পড়া পুরোনো ম্যাচের ফলাফল আলাদা করে আনা (খুব কম লাগে)
async function fetchResult(id) {
  const rid = id.slice(2);
  if (id[0] === 'c') { const r = await cricCall('match_info', { id: rid }); return r.ok ? cricSummary(r.data) : null; }
  if (id[0] === 'f') { const r = await fbCall('fixtures', { id: rid }); return r.ok && r.data[0] ? fbSummary(r.data[0]) : null; }
  if (id[0] === 's') { const r = await smCall('fixtures/' + rid, { include: LIST_INC }); return r.ok && r.data ? smSummary(r.data) : null; }
  return null;
}

async function settleOne({ db, FV }, id, result, score = null) {
  const wk = weekKey();
  for (let round = 0; round < 5; round++) {
    const q = await db.collection(`liveVotes/${id}/v`).where('res', '==', null).limit(200).get();
    const b = db.batch();
    for (const v of q.docs) {
      const x = v.data();
      const ok = result !== 'void' && x.pick === result;
      const exact = ok && score && x.ga === score[0] && x.gb === score[1];
      const pts = (ok ? POINTS : 0) + (exact ? EXACT : 0);
      b.update(v.ref, { res: result === 'void' ? 'void' : ok, ...(exact ? { exact: true } : {}) });
      if (pts) b.set(db.doc('livePoints/' + v.id), { pts: FV.increment(pts), ok: FV.increment(1), ...(exact ? { ex: FV.increment(1) } : {}), wk: { [wk]: FV.increment(pts) } }, { merge: true });
    }
    if (q.size < 200) b.set(db.doc('liveVotes/' + id), { settled: true, result, settledAt: Date.now() }, { merge: true });
    await b.commit();
    if (q.size < 200) return;
  }
}

/* ---------- সমস্যা খোঁজার জন্য: কোনো key বা গোপন তথ্য দেখায় না ---------- */
export async function diag(q = '', now = Date.now()) {
  const F = await fb();
  if (!F) return { firebase: false, keys: has() };
  const d = (await F.db.doc('liveCache/feed').get()).data() || {};
  const c = d.c || {}, f = d.f || {};
  const cnt = l => (l || []).reduce((a, m) => (a[m.state] = (a[m.state] || 0) + 1, a), {});
  return {
    keys: has(), v: d.v,
    cricket: { src: c.src, rawRows: c.raw, err: c.err || null, listAt: c.at ? new Date(c.at).toISOString() : null, upAt: c.upAt ? new Date(c.upAt).toISOString() : null,
      list: cnt(c.list), up: cnt(c.up), left: d.cq,
      sample: (c.list || []).filter(m => !q || (m.a.name + ' ' + m.b.name + ' ' + m.tour).toLowerCase().includes(String(q).toLowerCase())).slice(0, 20)
        .map(m => `${m.state} (${m.ms || '-'}) | ${m.a.name} v ${m.b.name} | ${m.tour} | ${new Date(m.start).toISOString().slice(0, 16)} | ${m.raw || ''}`) },
    sportmonks: { on: hasSm(), err: (d.s || {}).err || null, at: (d.s || {}).at ? new Date(d.s.at).toISOString() : null, live: cnt((d.s || {}).live), fx: cnt((d.s || {}).fx) },
    football: { err: f.err || null, at: f.at ? new Date(f.at).toISOString() : null, day: cnt(f.day), live: cnt(f.live), left: d.fq }
  };
}

/* ---------- ফুটবল লিগের পয়েন্ট টেবিল (৬ ঘণ্টায় একবার আনা) ---------- */
export async function table(lg, season, now = Date.now()) {
  lg = Number(lg); season = Number(season);
  if (!lg || !season || !process.env.FOOTBALL_API_KEY) return { groups: [] };
  const F = await fb();
  if (!F) return { groups: [] };
  const ref = F.db.doc(`liveTable/${lg}_${season}`);
  const d = (await ref.get()).data() || null;
  if (d && now - d.at < 6 * HOUR) return { groups: d.groups || [] };
  if (d && (d.until || 0) > now) return { groups: d.groups || [] };
  await ref.set({ until: now + 20e3 }, { merge: true });
  const r = await fbCall('standings', { league: lg, season });
  if (!r.ok) { await ref.set({ until: 0, at: now - 5 * HOUR }, { merge: true }); return { groups: (d && d.groups) || [] }; }
  const st = (((r.data[0] || {}).league || {}).standings) || [];
  const groups = st.map(g => ({
    name: (g[0] && g[0].group) || '',
    rows: g.map(x => [x.rank, (x.team || {}).name || '', (x.all || {}).played || 0, (x.all || {}).win || 0, (x.all || {}).draw || 0, (x.all || {}).lose || 0, x.goalsDiff || 0, x.points || 0])
  })).slice(0, 12);
  await ref.set({ at: now, until: 0, groups });
  return { groups };
}
