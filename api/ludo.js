// খেলাঘর লুডু সার্ভার (Vercel-এ চলে)। ছক্কা, চাল যাচাই, জয়-হার আর পয়েন্ট সব এখানে হয়।
// খেলোয়াড়ের ফোন শুধু অনুরোধ পাঠায়; পয়েন্ট বদলানোর ক্ষমতা ফোনের নেই।
//
// দরকার: Vercel → Settings → Environment Variables → FIREBASE_SERVICE_ACCOUNT
// (Firebase → Project settings → Service accounts → Generate new private key থেকে পাওয়া পুরো JSON)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { newGame, act, payouts, LudoError, QUICK } from '../js/ludo-engine.js';

const CPU_ENTRY = 100;
const ENTRIES = [100, 500, 1000];
const WAIT_START_MS = 45000;   // ৪ জনের খেলায় এতক্ষণ পরে ২-৩ জন থাকলেই শুরু
const CPU_NAMES = ['রহিম চাচা (কম্পিউটার)', 'মিনা খালা (কম্পিউটার)', 'টুনটুনি (কম্পিউটার)'];

class HttpErr extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const dice = () => randomInt(1, 7);

function fb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new HttpErr(503, 'অনলাইন সার্ভার এখনো চালু হয়নি। অনুশীলন মোডে খেলুন।');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST দিয়ে পাঠান' });
  try {
    const { auth, db } = fb();
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) throw new HttpErr(401, 'আগে লগইন করুন');
    let uid;
    try { uid = (await auth.verifyIdToken(token)).uid; } catch (e) { throw new HttpErr(401, 'লগইন মেয়াদ শেষ, আবার লগইন করুন'); }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const out = await route(db, uid, body);
    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    if (e instanceof LudoError) return res.status(409).json({ error: e.message, code: e.code });
    if (e instanceof HttpErr) return res.status(e.status).json({ error: e.message });
    console.error(e);
    return res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে, একটু পরে চেষ্টা করুন' });
  }
}

async function route(db, uid, b) {
  switch (b.action) {
    case 'cpu': return startCpu(db, uid);
    case 'quick': return quick(db, uid, +b.size === 4 ? 4 : 2, ENTRIES.includes(+b.entry) ? +b.entry : 100);
    case 'room': return startRoom(db, uid, String(b.roomId || ''), ENTRIES.includes(+b.entry) ? +b.entry : 100);
    case 'chat': return chat(db, uid, String(b.matchId || ''), +b.i);
    case 'roll': case 'move': case 'tick': case 'leave':
      return play(db, uid, String(b.matchId || ''), { type: b.action, t: +b.t });
    default: throw new HttpErr(400, 'অজানা কাজ');
  }
}

const userRef = (db, uid) => db.collection('users').doc(uid);
/* দ্রুত কথা: শুধু তালিকার লাইন, ৩ সেকেন্ডে একবার */
async function chat(db, uid, matchId, i) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(matchId) || !(i >= 0 && i < QUICK.length && Number.isInteger(i))) throw new HttpErr(400, 'ভুল অনুরোধ');
  return db.runTransaction(async tx => {
    const ref = db.collection('matches').doc(matchId), s = await tx.get(ref);
    if (!s.exists) throw new HttpErr(404, 'খেলা খুঁজে পাওয়া যায়নি');
    const m = s.data(), p = (m.players || []).findIndex(pl => pl.uid === uid);
    if (p < 0 || m.status !== 'playing') throw new HttpErr(403, 'এখন কথা পাঠানো যাবে না');
    const now = Date.now(), last = (m.chat && m.chat.p === p && m.chat.at) || 0;
    if (now - last < 3000) throw new HttpErr(429, 'একটু থামেন, পরে বলেন');
    tx.update(ref, { chat: { p, i, at: now, n: ((m.chat && m.chat.n) || 0) + 1 } });
    return {};
  });
}
function profileOf(snap) {
  if (!snap.exists) throw new HttpErr(403, 'আগে ইউজারনেম বেছে নিন');
  const u = snap.data();
  if (u.banned) throw new HttpErr(403, 'আপনার একাউন্ট আপাতত বন্ধ। যোগাযোগ পাতায় অ্যাডমিনকে লিখুন।');
  return u;
}
async function liveMatch(tx, db, u) {
  if (!u.activeMatch) return null;
  const m = await tx.get(db.collection('matches').doc(u.activeMatch));
  return m.exists && (m.data().status === 'playing' || m.data().status === 'waiting') ? m.id : null;
}

/* কম্পিউটারের সাথে */
async function startCpu(db, uid) {
  return db.runTransaction(async tx => {
    const uRef = userRef(db, uid), u = profileOf(await tx.get(uRef));
    const cur = await liveMatch(tx, db, u);
    if (cur) return { matchId: cur, resumed: true };
    if ((u.points || 0) < CPU_ENTRY) throw new HttpErr(402, 'পয়েন্ট কম! দৈনিক বোনাস নিন বা দোকান থেকে কিনুন।');
    const ref = db.collection('matches').doc();
    const g = newGame([{ uid, name: u.name, username: u.username }, { cpu: true, name: CPU_NAMES[randomInt(0, CPU_NAMES.length)] }], { mode: 'cpu', entry: CPU_ENTRY, now: Date.now() });
    tx.set(ref, { ...g, createdAt: FieldValue.serverTimestamp() });
    tx.update(uRef, { points: FieldValue.increment(-CPU_ENTRY), activeMatch: ref.id });
    return { matchId: ref.id };
  });
}

/* অনলাইনে অচেনা খেলোয়াড়ের সাথে */
async function quick(db, uid, size, entry) {
  const candidates = await db.collection('matches').where('status', '==', 'waiting').where('size', '==', size).where('entry', '==', entry).limit(10).get();
  return db.runTransaction(async tx => {
    const uRef = userRef(db, uid), u = profileOf(await tx.get(uRef));
    const cur = await liveMatch(tx, db, u);
    if (cur) return { matchId: cur, resumed: true };
    if ((u.points || 0) < entry) throw new HttpErr(402, 'এই টেবিলে খেলতে ' + entry + ' পয়েন্ট লাগবে');
    const me = { uid, name: u.name, username: u.username };
    for (const c of candidates.docs) {
      const s = await tx.get(c.ref), w = s.data();
      if (!s.exists || w.status !== 'waiting' || w.uids.includes(uid) || w.uids.length >= size) continue;
      const players = [...w.waiting, me];
      tx.update(uRef, { points: FieldValue.increment(-entry), activeMatch: c.id });
      if (players.length >= size) tx.set(c.ref, { ...newGame(players, { mode: 'online', entry, now: Date.now() }), size, kind: 'quick', waiting: players, createdAt: w.createdAt });
      else tx.update(c.ref, { waiting: players, uids: players.map(p => p.uid) });
      return { matchId: c.id };
    }
    const ref = db.collection('matches').doc();
    tx.set(ref, { status: 'waiting', kind: 'quick', mode: 'online', size, entry, waiting: [me], uids: [uid], waitSince: Date.now(), seq: 0, log: [], createdAt: FieldValue.serverTimestamp() });
    tx.update(uRef, { points: FieldValue.increment(-entry), activeMatch: ref.id });
    return { matchId: ref.id };
  });
}

/* বন্ধুদের রুম থেকে */
async function startRoom(db, uid, roomId, entry) {
  if (!/^[A-Z0-9]{6}$/.test(roomId)) throw new HttpErr(400, 'রুম কোড ঠিক নেই');
  return db.runTransaction(async tx => {
    const rRef = db.collection('rooms').doc(roomId), rs = await tx.get(rRef);
    if (!rs.exists) throw new HttpErr(404, 'রুমটা আর নেই');
    const r = rs.data();
    if (r.host !== uid) throw new HttpErr(403, 'শুধু রুমের মালিক খেলা শুরু করতে পারবে');
    if (r.matchId) return { matchId: r.matchId };
    const uids = [...new Set(r.uids || [])].slice(0, 4);
    if (uids.length < 2) throw new HttpErr(400, 'অন্তত ২ জন লাগবে');
    const snaps = await Promise.all(uids.map(id => tx.get(userRef(db, id))));
    const users = snaps.map(profileOf);
    for (let i = 0; i < users.length; i++) {
      if (await liveMatch(tx, db, users[i])) throw new HttpErr(409, '@' + users[i].username + ' অন্য একটা খেলায় আছে');
      if ((users[i].points || 0) < entry) throw new HttpErr(402, '@' + users[i].username + ' এর ' + entry + ' পয়েন্ট নেই');
    }
    const ref = db.collection('matches').doc();
    const players = uids.map((id, i) => ({ uid: id, name: users[i].name, username: users[i].username }));
    tx.set(ref, { ...newGame(players, { mode: 'online', entry, now: Date.now() }), size: players.length, kind: 'room', roomId, createdAt: FieldValue.serverTimestamp() });
    uids.forEach(id => tx.update(userRef(db, id), { points: FieldValue.increment(-entry), activeMatch: ref.id }));
    tx.update(rRef, { status: 'started', matchId: ref.id });
    return { matchId: ref.id };
  });
}

/* খেলা চলাকালীন: ছক্কা, চাল, সময় শেষ, খেলা ছাড়া */
async function play(db, uid, matchId, a) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(matchId)) throw new HttpErr(400, 'খেলা খুঁজে পাওয়া যায়নি');
  return db.runTransaction(async tx => {
    const ref = db.collection('matches').doc(matchId), s = await tx.get(ref);
    if (!s.exists) throw new HttpErr(404, 'খেলা খুঁজে পাওয়া যায়নি');
    const m = s.data();
    if (!(m.uids || []).includes(uid)) throw new HttpErr(403, 'আপনি এই খেলায় নেই');

    if (m.status === 'waiting') return waitingAction(db, tx, ref, m, uid, a);
    if (m.status !== 'playing') return { status: m.status };

    const humanUids = m.players.filter(p => p.uid).map(p => p.uid);
    const uSnaps = await Promise.all(humanUids.map(id => tx.get(userRef(db, id)))); // লেখার আগে সব পড়া
    const p = m.players.findIndex(pl => pl.uid === uid);
    const before = m.players.map(pl => pl.out);
    const g = act(m, { ...a, p }, dice, Date.now());

    // খেলা ছেড়ে গেলে বা বাদ পড়লে সে নতুন খেলা শুরু করতে পারবে
    g.players.forEach((pl, i) => { if (pl.uid && pl.out && !before[i] && g.status === 'playing') tx.update(userRef(db, pl.uid), { activeMatch: FieldValue.delete() }); });

    if (g.status === 'finished') {
      const po = payouts(g), winner = g.players[g.result.ranks[0]];
      g.result.payouts = {};
      humanUids.forEach((id, i) => {
        if (!uSnaps[i].exists) return;
        g.result.payouts[id] = po[id] - g.entry;
        tx.update(userRef(db, id), {
          points: FieldValue.increment(po[id] || 0),
          games: FieldValue.increment(1),
          wins: FieldValue.increment(winner.uid === id ? 1 : 0),
          activeMatch: FieldValue.delete()
        });
      });
      g.finishedAt = Date.now();
    }
    tx.set(ref, g);
    return { status: g.status };
  });
}

async function waitingAction(db, tx, ref, m, uid, a) {
  if (a.type === 'leave') {
    const players = m.waiting.filter(p => p.uid !== uid);
    tx.update(userRef(db, uid), { points: FieldValue.increment(m.entry), activeMatch: FieldValue.delete() }); // টাকা ফেরত
    if (!players.length) tx.delete(ref);
    else tx.update(ref, { waiting: players, uids: players.map(p => p.uid) });
    return { status: 'left' };
  }
  if (a.type === 'tick' && m.waiting.length >= 2 && Date.now() - m.waitSince > WAIT_START_MS) {
    tx.set(ref, { ...newGame(m.waiting, { mode: 'online', entry: m.entry, now: Date.now() }), size: m.size, kind: 'quick', waiting: m.waiting, createdAt: m.createdAt });
    return { status: 'playing' };
  }
  return { status: 'waiting' };
}
