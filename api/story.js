// খেলাঘর "গল্পের আসর": AI (Google Gemini) দিয়ে একবার লেখা বানিয়ে Firestore-এ সেভ রাখে।
// পরে সবাই ডাটাবেজ থেকেই পড়ে, তাই একই লেখার জন্য AI-কে আর ডাকতে হয় না।
//
// দরকার (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY  : aistudio.google.com থেকে বানানো চাবি
//   CRON_SECRET     : যেকোনো লম্বা এলোমেলো লেখা (প্রতিদিনের অটো-লেখার পাহারাদার)
//   FIREBASE_SERVICE_ACCOUNT : আগে থেকেই আছে
//
// GET  /api/story?list=1[&type=golpo]   → সাম্প্রতিক লেখার তালিকা (সারাংশসহ)
// GET  /api/story?id=XXXX               → একটা পুরো লেখা
// GET  /api/story?cron=1                → Vercel Cron: প্রতিদিন নিজে থেকে নতুন লেখা
// POST {action:'gen', type, topic}      → অ্যাডমিন: এখনই নতুন লেখা
// POST {action:'hide'|'show'|'del', id} → অ্যাডমিন
// POST {action:'cfg', auto, perDay}     → অ্যাডমিন: অটো-লেখা চালু/বন্ধ
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ADMINS = ['ismail392594@gmail.com'];
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const TYPES = {
  golpo: { n: 'ছোটগল্প', ask: 'একটা মৌলিক বাংলা ছোটগল্প লেখো (৬০০ থেকে ৯০০ শব্দ)। বাংলাদেশের গ্রাম বা শহরের মানুষের জীবন, সম্পর্ক, ছোট ছোট আনন্দ-বেদনা। শেষে একটা সুন্দর মোড় থাকবে।' },
  kobita: { n: 'কবিতা', ask: 'একটা মৌলিক বাংলা কবিতা লেখো (১৬ থেকে ২৮ লাইন), ছন্দ আর অন্ত্যমিলসহ। বিষয় হতে পারে প্রকৃতি, ঋতু, মা, শৈশব, গ্রাম, নদী, দেশ বা স্বপ্ন। প্রতিটা লাইন আলাদা লাইনে, স্তবকের মাঝে একটা ফাঁকা লাইন।' },
  itihas: { n: 'ইতিহাসের গল্প', ask: 'বাংলা, বাংলাদেশ, উপমহাদেশ বা বিশ্বের একটা সুপরিচিত ও ভালোভাবে নথিভুক্ত সত্য ঐতিহাসিক ঘটনা বা মানুষের কথা সহজ গল্পের মতো করে লেখো (৫০০ থেকে ৮০০ শব্দ)। সাল-তারিখ দাও। শুধু প্রতিষ্ঠিত তথ্য লিখবে; কোনো বানানো উক্তি, সংখ্যা বা ঘটনা যোগ করবে না। কোনো তথ্যে সন্দেহ থাকলে সেটা বাদ দেবে। রাজনৈতিক বিতর্কিত বিষয়ে কোনো পক্ষ নেবে না।' },
  lok: { n: 'লোককাহিনী', ask: 'বাংলার প্রচলিত লোককাহিনী, রূপকথা বা গোপাল ভাঁড়, বীরবল, শেখ চিল্লির মতো ঐতিহ্যবাহী গল্পের ধাঁচে একটা গল্প নিজের ভাষায় নতুন করে লেখো (৪০০ থেকে ৭০০ শব্দ)। কোনো আধুনিক লেখকের বই থেকে হুবহু নেবে না। শেষে ছোট একটা শিক্ষা।' },
  moja: { n: 'মজার গল্প', ask: 'একটা মৌলিক হাসির বাংলা গল্প লেখো (৪০০ থেকে ৭০০ শব্দ)। ঢাকার জ্যাম, বাজার, লোডশেডিং, পরীক্ষা, বিয়েবাড়ি, পাড়ার চায়ের দোকান এমন চেনা জীবনের মজা। কাউকে অপমান বা কোনো গোষ্ঠীকে খোঁচা দেবে না।' },
  biggan: { n: 'জানার আনন্দ', ask: 'বিজ্ঞান, প্রকৃতি, মহাকাশ, শরীর বা আবিষ্কারের একটা মজার বিষয় ছোটদের-বড়দের সবার বোঝার মতো গল্পের ঢঙে লেখো (৪০০ থেকে ৬০০ শব্দ)। শুধু সঠিক, প্রতিষ্ঠিত তথ্য।' },
  uponnas: { n: 'ধারাবাহিক উপন্যাস', ask: '' }
};
const ROTATE = ['golpo', 'kobita', 'itihas', 'lok', 'moja', 'biggan'];
const SYS = 'তুমি খেলাঘর (বাংলাদেশের একটা পরিবারবান্ধব বাংলা বিনোদন সাইট)-এর লেখক। সবসময় শুদ্ধ, প্রাঞ্জল বাংলায় লেখো, বাংলাদেশের মানুষের চেনা শব্দে। সব বয়সের জন্য উপযুক্ত লেখা: কোনো অশ্লীলতা, সহিংসতার বর্ণনা, ঘৃণা বা ধর্ম-রাজনীতি নিয়ে খোঁচা নয়। কোনো বাস্তব জীবিত মানুষকে নিয়ে বানানো কথা নয়। কোনো প্রকাশিত বই, গান বা কবিতা হুবহু বা আংশিক কপি করবে না, সবকিছু নিজের ভাষায় নতুন করে লিখবে। মার্কডাউন চিহ্ন (#, *, _) ব্যবহার করবে না। অনুচ্ছেদের মাঝে একটা ফাঁকা লাইন রাখবে।';

class HttpErr extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function fb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}
const col = db => db.collection('stories');
const cfgRef = db => db.collection('config').doc('stories');

export default async function handler(req, res) {
  try {
    const { auth, db } = fb();
    const q = req.query || {};
    if (req.method === 'GET') {
      if (q.cron) return res.status(200).json(await cron(req, db));
      if (q.id) return await sendOne(res, db, String(q.id));
      return await sendList(res, db, String(q.type || ''));
    }
    if (req.method !== 'POST') throw new HttpErr(405, 'ভুল অনুরোধ');
    res.setHeader('Cache-Control', 'no-store');
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    let who;
    try { who = await auth.verifyIdToken(token); } catch (e) { throw new HttpErr(401, 'আগে লগইন করুন'); }
    if (!who.email_verified || !ADMINS.includes(who.email)) throw new HttpErr(403, 'শুধু অ্যাডমিন');
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (b.action === 'gen') { const type = TYPES[b.type] ? b.type : 'golpo'; const out = await generate(db, type, String(b.topic || '').slice(0, 120)); return res.status(200).json({ ok: true, ...out }); }
    if (b.action === 'cfg') { await cfgRef(db).set({ auto: !!b.auto, perDay: Math.max(1, Math.min(4, +b.perDay || 2)) }, { merge: true }); return res.status(200).json({ ok: true }); }
    if (b.action === 'adminList') { const s = await col(db).orderBy('at', 'desc').limit(80).get(); const c = await cfgRef(db).get(); return res.status(200).json({ ok: true, cfg: c.exists ? c.data() : {}, key: !!process.env.GEMINI_API_KEY, cronKey: !!process.env.CRON_SECRET, items: s.docs.map(d => brief(d)) }); }
    const id = String(b.id || ''); if (!/^[A-Za-z0-9]{10,40}$/.test(id)) throw new HttpErr(400, 'ভুল আইডি');
    if (b.action === 'hide' || b.action === 'show') { await col(db).doc(id).update({ on: b.action === 'show' }); return res.status(200).json({ ok: true }); }
    if (b.action === 'del') { await col(db).doc(id).delete(); return res.status(200).json({ ok: true }); }
    throw new HttpErr(400, 'অজানা কাজ');
  } catch (e) {
    if (!(e instanceof HttpErr)) console.error(e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(e.status || 500).json({ error: e instanceof HttpErr ? e.message : 'সার্ভারে সমস্যা, পরে চেষ্টা করুন' });
  }
}

function brief(d) { const x = d.data(); return { id: d.id, type: x.type, title: x.title, summary: x.summary, series: x.series || null, seriesTitle: x.seriesTitle || null, chapter: x.chapter || null, on: x.on !== false, at: x.at && x.at.toMillis ? x.at.toMillis() : (+x.at || 0), len: (x.body || '').length }; }
async function sendList(res, db, type) {
  // একক ফিল্ডে সাজানো (আলাদা ইনডেক্স বানাতে হয় না), বাকি বাছাই এখানে
  const s = await col(db).orderBy('at', 'desc').limit(300).get();
  const items = s.docs.map(brief).filter(x => x.on && (!TYPES[type] || x.type === type)).slice(0, 80);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).json({ items });
}
async function sendOne(res, db, id) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) throw new HttpErr(400, 'ভুল আইডি');
  const d = await col(db).doc(id).get();
  if (!d.exists || d.data().on === false) throw new HttpErr(404, 'লেখাটা পাওয়া যায়নি');
  const x = d.data();
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ ...brief(d), body: x.body, ai: true });
}

/* ---------- প্রতিদিনের অটো-লেখা ---------- */
async function cron(req, db) {
  const sec = process.env.CRON_SECRET;
  if (!sec || req.headers.authorization !== 'Bearer ' + sec) throw new HttpErr(401, 'অনুমতি নেই');
  const c = await cfgRef(db).get(), cfg = c.exists ? c.data() : {};
  if (cfg.auto === false) return { skipped: 'auto off' };
  const n = Math.max(1, Math.min(4, cfg.perDay || 2)), made = [];
  let ri = cfg.rot || 0;
  for (let i = 0; i < n; i++) {
    // প্রতিদিন উপন্যাসের একটা পর্ব, বাকিগুলো ঘুরে ঘুরে
    const type = i === 0 ? 'uponnas' : ROTATE[ri++ % ROTATE.length];
    try { made.push((await generate(db, type, '')).title); } catch (e) { console.error('cron gen', type, e.message); }
  }
  await cfgRef(db).set({ rot: ri, lastCron: Date.now() }, { merge: true });
  return { made };
}

/* ---------- AI দিয়ে লেখা ---------- */
async function gemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpErr(503, 'GEMINI_API_KEY এখনো Vercel-এ বসানো হয়নি');
  const body = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1, maxOutputTokens: 8192, responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: { type: 'OBJECT', properties: { title: { type: 'STRING' }, summary: { type: 'STRING' }, body: { type: 'STRING' } }, required: ['title', 'summary', 'body'] }
    }
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
  if (!r.ok) { const t = (await r.text()).slice(0, 300); console.error('gemini', r.status, t); throw new HttpErr(502, r.status === 429 ? 'AI-এর আজকের ফ্রি সীমা শেষ, কাল আবার চেষ্টা করুন' : 'AI থেকে লেখা আনা যায়নি (' + r.status + ')'); }
  const j = await r.json(), txt = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
  let out; try { out = JSON.parse(txt); } catch (e) { throw new HttpErr(502, 'AI-এর উত্তর বোঝা যায়নি, আবার চেষ্টা করুন'); }
  return out;
}
const clean = s => String(s || '').replace(/[#*_`>]+/g, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();

export async function generate(db, type, topic) {
  const T = TYPES[type]; let prompt, extra = {};
  const all = await col(db).orderBy('at', 'desc').limit(300).get();
  const recent = { docs: all.docs.filter(d => d.data().type === type).slice(0, 40) };
  const titles = recent.docs.map(d => d.data().title).filter(Boolean);
  if (type === 'uponnas') {
    // ধারাবাহিক উপন্যাস: আগের পর্বগুলোর সারাংশ ধরে পরের পর্ব
    const cRef = cfgRef(db), c = (await cRef.get()).data() || {}; let sr = c.novel;
    if (!sr || sr.chapter >= (sr.total || 10)) sr = { sid: 'n' + Date.now().toString(36), title: '', chapter: 0, total: 10, sums: [] };
    const first = sr.chapter === 0;
    prompt = first
      ? `একটা নতুন ধারাবাহিক বাংলা উপন্যাস শুরু করো, মোট ${sr.total} পর্ব হবে। এটা প্রথম পর্ব (৮০০ থেকে ১১০০ শব্দ)। বাংলাদেশের পটভূমিতে পারিবারিক, রহস্য বা অ্যাডভেঞ্চার ধাঁচের গল্প, সব বয়সের পাঠকের জন্য। title-এ উপন্যাসের নাম দাও (পর্ব নম্বর ছাড়া)। summary-তে এই পর্বের মূল ঘটনা আর চরিত্রদের নাম ৩-৪ বাক্যে লেখো, যাতে পরের পর্ব লিখতে কাজে লাগে।${titles.length ? ' আগের উপন্যাসগুলোর নাম (এগুলো থেকে আলাদা হবে): ' + [...new Set(recent.docs.map(d => d.data().seriesTitle))].join(', ') : ''}`
      : `ধারাবাহিক উপন্যাস "${sr.title}"-এর ${sr.chapter + 1} নম্বর পর্ব লেখো (মোট ${sr.total} পর্ব, ৮০০ থেকে ১১০০ শব্দ)। আগের পর্বগুলোর সারাংশ:\n${sr.sums.map((s, i) => 'পর্ব ' + (i + 1) + ': ' + s).join('\n')}\n${sr.chapter + 1 === sr.total ? 'এটা শেষ পর্ব, সব রহস্যের সমাধান করে সুন্দরভাবে শেষ করো।' : 'চরিত্রদের নাম আর ঘটনা আগের সাথে মিলিয়ে গল্প এগিয়ে নাও, শেষে পাঠককে পরের পর্বের জন্য আগ্রহী রাখো।'} title-এ এই পর্বের ছোট শিরোনাম দাও। summary-তে এই পর্বের মূল ঘটনা ৩-৪ বাক্যে।`;
    const o = await gemini(prompt);
    const ch = sr.chapter + 1, seriesTitle = first ? clean(o.title).slice(0, 80) : sr.title;
    extra = { series: sr.sid, seriesTitle, chapter: ch, total: sr.total };
    const doc = await save(db, type, first ? 'পর্ব ১: শুরু' : clean(o.title), o, extra, topic);
    await cRef.set({ novel: { sid: sr.sid, title: seriesTitle, chapter: ch, total: sr.total, sums: [...sr.sums, clean(o.summary).slice(0, 400)].slice(-12) } }, { merge: true });
    return doc;
  }
  prompt = T.ask + (topic ? `\nবিষয়: ${topic}` : '') + (titles.length ? `\nআগে এই শিরোনামগুলোতে লেখা হয়েছে, এগুলো থেকে একদম আলাদা বিষয় বেছে নাও: ${titles.join(' | ')}` : '') + '\ntitle-এ সুন্দর ছোট শিরোনাম, summary-তে এক-দুই বাক্যে লেখাটা কী নিয়ে, body-তে পুরো লেখা।';
  const o = await gemini(prompt);
  return save(db, type, clean(o.title), o, extra, topic);
}
async function save(db, type, title, o, extra, topic) {
  const body = clean(o.body);
  if (body.length < 200 || !/[ঀ-৿]/.test(body)) throw new HttpErr(502, 'AI-এর লেখা ঠিকমতো আসেনি, আবার চেষ্টা করুন');
  const ref = col(db).doc();
  const data = { type, title: title.slice(0, 120) || TYPES[type].n, summary: clean(o.summary).slice(0, 300), body: body.slice(0, 12000), on: true, src: 'ai', model: MODEL, topic: topic || null, at: FieldValue.serverTimestamp(), ...extra };
  await ref.set(data);
  return { id: ref.id, title: data.title, type };
}
