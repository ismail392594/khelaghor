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

export const POINTS = 10; // সঠিক অনুমানে কত পয়েন্ট
const CACHE_V = 3; // ক্যাশের ছাঁচ বদলালে বাড়াতে হয়, তাহলে পুরোনো ক্যাশ ফেলে সব নতুন করে আনে
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

const has = () => ({ c: !!process.env.CRICKET_API_KEY, f: !!process.env.FOOTBALL_API_KEY });
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
  const demoWant = { cricket: !H.c, football: !H.f };
  const demo = (H.c && H.f) ? [] : demoAll(now, demoWant).map(x => x.m);
  if (!H.c && !H.f) return { at: now, matches: demo, demo: true };
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
  const cLive = (c.list || []).some(m => m.state === 'live');
  const fAll = [...(f.day || []), ...(f.live || [])];
  const fLive = fAll.some(m => m.state === 'live' || (m.state === 'upcoming' && m.start <= now + MIN && m.start > now - 3 * HOUR));
  const stale = doc.v !== CACHE_V;
  const d = {
    cList: H.c && stale || H.c && now - (c.at || 0) > (cLive ? every(cRem, now, MIN, 0.35) : Math.max(15 * MIN, every(cRem, now, 15 * MIN, 0.1))),
    cUp: H.c && stale || H.c && now - (c.upAt || 0) > Math.max(3 * HOUR, every(cRem, now, 3 * HOUR, 0.05)),
    fLive: H.f && fLive && now - (f.at || 0) > every(fRem, now, MIN, 0.35),
    fDay: H.f && stale || H.f && (now - (f.dayAt || 0) > Math.max(30 * MIN, every(fRem, now, 30 * MIN, 0.1)) || f.dayKey !== dhakaDay(now))
  };
  d.any = d.cList || d.cUp || d.fLive || d.fDay;
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
  const c = { ...(doc.c || {}) }, f = { ...(doc.f || {}) };
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
    if (due.cUp) jobs.push(pages('matches', 4).then(l => {
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
      f.live = r.data.map(fbSummary); f.at = now;
      // তালিকায় "চলছে" ছিল কিন্তু এখন লাইভে নেই → খেলা শেষ, ফলাফল আনি
      const liveIds = new Set(f.live.map(m => m.id));
      const gone = (f.day || []).filter(m => m.state === 'live' && !liveIds.has(m.id)).map(m => m.id.slice(2)).slice(0, 20);
      if (gone.length) {
        const g = await fbCall('fixtures', { ids: gone.join('-') });
        fq = qOf(g, now, fq);
        if (g.ok) { const upd = new Map(g.data.map(fbSummary).map(m => [m.id, m])); f.day = (f.day || []).map(m => upd.get(m.id) || m); }
      }
    }));
    await Promise.all(jobs);
    const out = { v: CACHE_V, c, f, cq, fq };
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
    return { m: x.m, det: x.det, votes: await votesOf(F, id) };
  }
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const { db } = F;
  const feed = await getFeed(now);
  const ref = db.doc('liveMatch/' + id);
  let md = (await ref.get()).data() || null;
  let S = feed.matches.find(m => m.id === id) || (md && md.sum);
  if (!S) throw new HttpErr(404, 'ম্যাচ পাওয়া যায়নি');
  const sport = id[0] === 'c' ? 'cricket' : 'football';
  const liveN = Math.max(1, feed.matches.filter(m => m.sport === sport && m.state === 'live').length);
  let due = false;
  if (S.state === 'live') {
    const st = (await db.doc('liveMeta/state').get()).data() || {};
    const rem = remOf(sport === 'cricket' ? st.cq : st.fq, now);
    due = !md || now - (md.at || 0) > every(rem, now, MIN, 0.5 / liveN) * (sport === 'cricket' ? 2 : 1);
  } else if (S.state === 'done') due = !md || !md.final;
  if (due) md = await refreshMatch(F, id, S, md, now) || md;
  // ফিড আর বিস্তারিত: যেটা নতুন সেটাই দেখাই
  const sum = md && md.sum && (md.at || 0) >= (feed.at - 2 * MIN) ? md.sum : S;
  return { m: sum, det: (md && md.det) || null, votes: await votesOf(F, id) };
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
    if (id[0] === 'c') {
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
    return out;
  } catch (e) {
    console.error('live match', e);
    await ref.set({ until: 0 }, { merge: true }).catch(() => {});
    return null;
  }
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
  const id = String(b.id || ''), pick = String(b.pick || '');
  if (!['a', 'b', 'd'].includes(pick) || !/^[a-z]_[A-Za-z0-9_-]{1,60}$/.test(id)) throw new HttpErr(400, 'ভুল ভোট');
  const F = await fb();
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const { db, FV } = F;
  const t = await who(F, req);
  const m = id.startsWith('d_') ? (demoMatch(id, now) || {}).m : (await getFeed(now)).matches.find(x => x.id === id);
  if (!m) throw new HttpErr(404, 'ম্যাচ পাওয়া যায়নি');
  if (m.state !== 'upcoming' || m.start <= now) throw new HttpErr(400, 'খেলা শুরু হয়ে গেছে, এখন আর ভোট দেওয়া যাবে না');
  if (pick === 'd' && m.sport === 'cricket' && !m.test) throw new HttpErr(400, 'এই ম্যাচে ড্র হয় না');
  const u = (await db.doc('users/' + t.uid).get()).data() || {};
  const name = String(u.username ? '@' + u.username : (u.name || t.name || 'খেলোয়াড়')).slice(0, 24);
  try {
    await db.doc(`liveVotes/${id}/v/${t.uid}`).create({ pick, at: now, name, res: null });
  } catch (e) {
    if (e.code === 6 || /already exists/i.test(e.message)) throw new HttpErr(409, 'আপনি এই ম্যাচে আগেই ভোট দিয়েছেন');
    throw e;
  }
  const demo = !!m.demo;
  const bt = db.batch();
  bt.set(db.doc('liveVotes/' + id), { sport: m.sport, start: m.start, settled: demo, demo, ['c' + pick]: FV.increment(1) }, { merge: true });
  const pu = { name, recent: { [id]: pick + '|' + m.start }, at: now };
  if (!demo) Object.assign(pu, { n: FV.increment(1), pts: FV.increment(0), ok: FV.increment(0) });
  bt.set(db.doc('livePoints/' + t.uid), pu, { merge: true });
  await bt.commit();
  return { ok: true, pick };
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
  return { name: d.name || null, pts: d.pts || 0, ok: d.ok || 0, n: d.n || 0, picks };
}

export async function board() {
  const F = await fb();
  if (!F) return { list: [] };
  const q = await F.db.collection('livePoints').orderBy('pts', 'desc').limit(50).get();
  return { list: q.docs.map(d => { const x = d.data(); return { name: x.name || 'খেলোয়াড়', pts: x.pts || 0, ok: x.ok || 0, n: x.n || 0 }; }) };
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
    await settleOne(F, id, m.result);
  }
}

// তালিকা থেকে বাদ পড়া পুরোনো ম্যাচের ফলাফল আলাদা করে আনা (খুব কম লাগে)
async function fetchResult(id) {
  const rid = id.slice(2);
  if (id[0] === 'c') { const r = await cricCall('match_info', { id: rid }); return r.ok ? cricSummary(r.data) : null; }
  if (id[0] === 'f') { const r = await fbCall('fixtures', { id: rid }); return r.ok && r.data[0] ? fbSummary(r.data[0]) : null; }
  return null;
}

async function settleOne({ db, FV }, id, result) {
  for (let round = 0; round < 5; round++) {
    const q = await db.collection(`liveVotes/${id}/v`).where('res', '==', null).limit(200).get();
    const b = db.batch();
    for (const v of q.docs) {
      const ok = result !== 'void' && v.data().pick === result;
      b.update(v.ref, { res: result === 'void' ? 'void' : ok });
      if (ok) b.set(db.doc('livePoints/' + v.id), { pts: FV.increment(POINTS), ok: FV.increment(1) }, { merge: true });
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
    football: { err: f.err || null, at: f.at ? new Date(f.at).toISOString() : null, day: cnt(f.day), live: cnt(f.live), left: d.fq }
  };
}
