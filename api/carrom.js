// খেলাঘর অনলাইন ক্যারম সার্ভার। বন্ধুদের প্রাইভেট রুমে (rooms/{id}) খেলার অবস্থা `cm` ফিল্ডে থাকে।
// সার্ভার পালা আর শটের ক্রম যাচাই করে; বোর্ডের হিসাব শুটারের ফোন করে পাঠায়, বাকিরা সেটার সাথে মিলিয়ে নেয়।
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const IDLE_MS = 45000, STUCK_MS = 15000;
class HttpErr extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function fb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new HttpErr(503, 'অনলাইন সার্ভার এখনো চালু হয়নি');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}
const r4 = v => Math.round(v * 1e4) / 1e4;
// শুরুর বোর্ড: রানী, ভেতরের ৬টা, বাইরের ১২টা (ফোনের newGame-এর একই ক্রম)
export function startBoard() {
  const b = [[0, 0, 1]];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; b.push([r4(Math.cos(a) * 3.2), r4(Math.sin(a) * 3.2), 1]); }
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = i % 2 ? 6.2 : 6.4; b.push([r4(Math.cos(a) * r), r4(Math.sin(a) * r), 1]); }
  return b;
}
const okBoard = b => Array.isArray(b) && b.length === 19 && b.every(p => Array.isArray(p) && p.length === 3 && p.slice(0, 2).every(v => typeof v === 'number' && isFinite(v) && Math.abs(v) < 40) && (p[2] === 0 || p[2] === 1));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST দিয়ে পাঠান' });
  try {
    const { auth, db } = fb();
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    let uid; try { uid = (await auth.verifyIdToken(token)).uid; } catch (e) { throw new HttpErr(401, 'আগে লগইন করুন'); }
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = String(b.roomId || ''); if (!/^[A-Z0-9]{6}$/.test(id)) throw new HttpErr(400, 'ভুল রুম');
    const ref = db.collection('rooms').doc(id);
    const out = await db.runTransaction(async tx => {
      const s = await tx.get(ref); if (!s.exists) throw new HttpErr(404, 'রুম পাওয়া যায়নি');
      const r = s.data(); if (r.game !== 'ক্যারম') throw new HttpErr(400, 'এটা ক্যারমের রুম না');
      return act(tx, ref, r, uid, b);
    });
    return res.status(200).json({ ok: true, ...(out || {}) });
  } catch (e) {
    if (e instanceof HttpErr) return res.status(e.status).json({ error: e.message });
    console.error(e); return res.status(500).json({ error: 'সার্ভারে সমস্যা, একটু পরে চেষ্টা করুন' });
  }
}

function act(tx, ref, r, uid, b) {
  const now = Date.now();
  if (b.action === 'start') {
    if (r.host !== uid) throw new HttpErr(403, 'শুধু রুমের মালিক শুরু করতে পারবেন');
    const n = (r.players || []).length;
    if (n !== 2 && n !== 4) throw new HttpErr(400, n === 3 ? 'ক্যারম ২ জন বা ৪ জনে খেলা যায়, আরেকজন ডাকুন বা একজন কমান' : 'আরো খেলোয়াড় লাগবে');
    if (r.cm && r.cm.status === 'playing') return { started: true };
    const seats = r.players.map((p, i) => ({ uid: p.uid, name: p.name, username: p.username, side: n === 2 ? i * 2 : i, team: (n === 2 ? i : i % 2) ? 'b' : 'w' }));
    tx.update(ref, { status: 'started', cm: { size: n, seats, turn: 0, seq: 0, phase: 'place', shot: null, board: startBoard(), queen: null, qPend: null, turnAt: now, status: 'playing', win: null, why: null, idle: {} } });
    return { started: true };
  }
  const cm = r.cm; if (!cm || cm.status !== 'playing') throw new HttpErr(409, 'খেলা চলছে না');
  const me = cm.seats.findIndex(s => s.uid === uid); if (me < 0) throw new HttpErr(403, 'আপনি এই খেলায় নেই');
  if (b.action === 'shoot') {
    if (cm.phase !== 'place' || cm.turn !== me) throw new HttpErr(409, 'এখন আপনার পালা না');
    if (+b.seq !== cm.seq) throw new HttpErr(409, 'পুরনো চাল');
    const lx = +b.lx, ux = +b.ux, uz = +b.uz, pw = +b.pw;
    if (![lx, ux, uz, pw].every(isFinite) || Math.abs(lx) > 23.6 || pw <= 0 || pw > 1 || Math.abs(Math.hypot(ux, uz) - 1) > .02) throw new HttpErr(400, 'ভুল শট');
    tx.update(ref, { 'cm.phase': 'move', 'cm.shot': { seq: cm.seq, seat: me, lx: r4(lx), ux, uz, pw: r4(pw), at: now }, [`cm.idle.${uid}`]: 0 });
    return {};
  }
  if (b.action === 'result') {
    if (cm.phase !== 'move' || !cm.shot || +b.seq !== cm.shot.seq) throw new HttpErr(409, 'পুরনো ফলাফল');
    if (cm.shot.seat !== me && now - cm.shot.at < STUCK_MS) throw new HttpErr(409, 'শুটারের ফলাফলের অপেক্ষা');
    if (!okBoard(b.board)) throw new HttpErr(400, 'ভুল বোর্ড');
    const turn = +b.turn; if (!(turn >= 0 && turn < cm.size)) throw new HttpErr(400, 'ভুল পালা');
    const win = b.win === 'w' || b.win === 'b' ? b.win : null;
    tx.update(ref, { 'cm.phase': 'place', 'cm.seq': cm.seq + 1, 'cm.board': b.board.map(p => [r4(p[0]), r4(p[1]), p[2]]), 'cm.turn': turn, 'cm.queen': b.queen === 'w' || b.queen === 'b' ? b.queen : null, 'cm.qPend': Number.isInteger(b.qPend) && b.qPend >= 0 && b.qPend < cm.size ? b.qPend : null, 'cm.turnAt': now, 'cm.last': { seat: cm.shot.seat, txt: String(b.txt || '').slice(0, 80) }, ...(win ? { 'cm.status': 'over', 'cm.win': win, 'cm.why': 'clear', status: 'done' } : {}) });
    return {};
  }
  if (b.action === 'tick') {
    // যার পালা সে অনেকক্ষণ চুপ: পালা পরের জনের কাছে। টানা ৩ বার হলে খেলা থেকে বাদ (তার দল হারে)।
    if (cm.phase !== 'place' || now - cm.turnAt < IDLE_MS) return { wait: true };
    const idler = cm.seats[cm.turn], cnt = ((cm.idle || {})[idler.uid] || 0) + 1;
    if (cnt >= 3) { tx.update(ref, { 'cm.status': 'over', 'cm.win': idler.team === 'w' ? 'b' : 'w', 'cm.why': 'idle:' + idler.name, status: 'done' }); return {}; }
    tx.update(ref, { 'cm.turn': (cm.turn + 1) % cm.size, 'cm.turnAt': now, 'cm.seq': cm.seq + 1, [`cm.idle.${idler.uid}`]: cnt, 'cm.last': { seat: cm.turn, txt: idler.name + ' চাল দেননি, পালা গেল' } });
    return {};
  }
  if (b.action === 'leave') {
    const t = cm.seats[me].team;
    tx.update(ref, { 'cm.status': 'over', 'cm.win': t === 'w' ? 'b' : 'w', 'cm.why': 'left:' + cm.seats[me].name, status: 'done' });
    return {};
  }
  throw new HttpErr(400, 'অজানা কাজ');
}
