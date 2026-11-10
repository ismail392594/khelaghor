// খেলাঘর AI: ম্যাচ নিয়ে প্রশ্নের উত্তর সহজ বাংলায় (Google Gemini দিয়ে)।
// Vercel-এ GEMINI_API_KEY থাকলে চালু হয়, না থাকলে বোতামই দেখায় না। মডেল বদলাতে LIVE_AI_MODEL।
// উত্তর শুধু আমাদের কাছে থাকা ম্যাচের তথ্য থেকে; বাজি বা টাকার পরামর্শ দেয় না। প্রতিজন দিনে ১০টা প্রশ্ন।
import { fb, getMatch, HttpErr } from './_store.js';

export const aiOn = () => !!process.env.GEMINI_API_KEY;
const LIMIT = 10;

const SYS = `তুমি "খেলাঘর AI", বাংলাদেশের একটা খেলার স্কোর সাইটের সহকারী।
- সব উত্তর সহজ বাংলায়, ছোট করে (৩-৬ বাক্য)। সংখ্যা বাংলা অঙ্কে।
- শুধু নিচে দেওয়া ম্যাচের তথ্য থেকে উত্তর দেবে। তথ্যে না থাকলে সোজা বলবে "এই তথ্য আমার কাছে নেই"। বানিয়ে কিছু বলবে না।
- পূর্বাভাস বললে মনে করিয়ে দেবে এটা আন্দাজ, নিশ্চিত নয়।
- কখনো টাকার বাজি, জুয়া বা বেটিং সাইটের পরামর্শ দেবে না। খেলাঘরের পয়েন্ট শুধু মজার জন্য, টাকায় বদলানো যায় না।
- খেলার বাইরের প্রশ্ন হলে ভদ্রভাবে বলবে তুমি শুধু খেলা নিয়ে সাহায্য করো।`;

// AI-কে দেওয়ার জন্য ম্যাচের ছোট বিবরণ (লেখা হিসেবে)
function brief(m, det, votes, x) {
  const nm = t => (t.bn ? `${t.bn} (${t.name})` : t.name);
  const L = [`খেলা: ${m.sport === 'cricket' ? 'ক্রিকেট' : 'ফুটবল'} · ${nm(m.a)} বনাম ${nm(m.b)}`, `প্রতিযোগিতা: ${m.tour || ''} ${m.label || ''}`, `অবস্থা: ${m.state === 'live' ? 'চলছে' : m.state === 'done' ? 'শেষ' : 'শুরু হয়নি'} · ${m.status || ''}`,
    `শুরু (UTC): ${new Date(m.start).toISOString()}`, m.venue ? `মাঠ: ${m.venue} ${m.city || ''}` : '', m.toss ? `টস: ${m.toss}` : ''];
  if (m.sport === 'football' && m.a.g != null) L.push(`স্কোর: ${m.a.g}-${m.b.g}${m.min ? `, ${m.min} মিনিট` : ''}${m.pen ? `, টাইব্রেকার ${m.pen[0]}-${m.pen[1]}` : ''}`);
  for (const s of ['a', 'b']) for (const i of m[s].inn || []) L.push(`${nm(m[s])}: ${i.r}/${i.w} (${i.o} ওভার)`);
  if (m.pred) L.push(`খেলাঘরের পূর্বাভাস: ${nm(m.a)} ${Math.round(m.pred.a * 100)}%, ${nm(m.b)} ${Math.round(m.pred.b * 100)}%${m.pred.d ? `, ড্র ${Math.round(m.pred.d * 100)}%` : ''}${m.pred.la != null ? `; আনুমানিক গোল ${m.pred.la}-${m.pred.lb}` : ''}`);
  if (votes) L.push(`দর্শকের ভোট: ${votes.a} / ${votes.b} / ড্র ${votes.d}`);
  if (x && x.form) L.push(`শেষ ৫ খেলার ফর্ম (W=জয়, D=ড্র, L=হার): ${m.a.name} ${x.form.a || '?'}, ${m.b.name} ${x.form.b || '?'}`);
  if (x && x.h2h && x.h2h.length) L.push('আগের মুখোমুখি: ' + x.h2h.map(h => `${h.h} ${h.hg}-${h.ag} ${h.a}`).join('; '));
  if (det && det.gl && det.gl.length) L.push('গোল/লাল কার্ড: ' + det.gl.map(g => `${g.n} ${g.m}' (${g.s === 'a' ? m.a.name : m.b.name}${g.k === 'R' ? ', লাল কার্ড' : ''})`).join('; '));
  if (det && det.cur && det.cur.bat) L.push('এখন ব্যাটে: ' + det.cur.bat.map(b => `${b[0]} ${b[1]}(${b[2]})`).join(', '));
  if (det && det.card) for (const c of det.card.slice(-2)) L.push(`${c.t}: সেরা ব্যাটার ${c.bat.slice().sort((p, q) => q[2] - p[2]).slice(0, 3).map(b => `${b[0]} ${b[2]}`).join(', ')}; সেরা বোলার ${c.bowl.slice().sort((p, q) => q[4] - p[4]).slice(0, 2).map(b => `${b[0]} ${b[4]}/${b[3]}`).join(', ')}`);
  if (det && det.comm) L.push('সাম্প্রতিক ঘটনা: ' + det.comm.slice(0, 8).map(c => `${c.o || ''} ${c.t}`).join(' | '));
  if (det && det.stats && det.stats.length) L.push('পরিসংখ্যান: ' + det.stats.map(s => `${s[0]} ${s[1]}-${s[2]}`).join(', '));
  return L.filter(Boolean).join('\n').slice(0, 6000);
}

export async function ask(req, now = Date.now()) {
  if (!aiOn()) throw new HttpErr(503, 'AI এখনো চালু হয়নি');
  const b = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  const q = String(b.q || '').trim().slice(0, 300), id = String(b.id || '');
  if (q.length < 3) throw new HttpErr(400, 'প্রশ্নটা লিখুন');
  const F = await fb();
  if (!F) throw new HttpErr(503, 'সার্ভার এখনো চালু হয়নি');
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  let t; try { t = await F.auth.verifyIdToken(token); } catch (e) { throw new HttpErr(401, 'প্রশ্ন করতে আগে লগইন করুন'); }
  // দিনে ১০টা প্রশ্ন (খরচ সীমায় রাখতে)
  const day = new Date(now + 6 * 3600e3).toISOString().slice(0, 10);
  const ref = F.db.doc('liveAsk/' + t.uid);
  const left = await F.db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data() || {};
    const n = d.day === day ? d.n || 0 : 0;
    if (n >= LIMIT) return -1;
    tx.set(ref, { day, n: n + 1, at: now });
    return LIMIT - n - 1;
  });
  if (left < 0) throw new HttpErr(429, "আজকের ১০টা প্রশ্ন শেষ, কাল আবার করুন");
  let ctx = 'কোনো নির্দিষ্ট ম্যাচ নয়।';
  if (/^[a-z]_[A-Za-z0-9_-]{1,60}$/.test(id)) { try { const d = await getMatch(id, now); ctx = brief(d.m, d.det, d.votes, d.x); } catch (e) {} }
  // মডেলের নাম Google মাঝে মাঝে বদলায়: আগে "সর্বশেষ Flash" নাম, না পেলে পরেরটা
  const models = [process.env.LIVE_AI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 20000);
  try {
    let r;
    for (const model of models) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: ac.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS }] },
          contents: [{ role: 'user', parts: [{ text: `ম্যাচের তথ্য:\n${ctx}\n\nপ্রশ্ন: ${q}` }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
        })
      });
      if (r.status !== 404) break;
    }
    const j = await r.json().catch(() => ({}));
    const text = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('').trim();
    if (!r.ok || !text) { console.error('ask', r.status, JSON.stringify(j).slice(0, 300)); throw new HttpErr(502, 'AI এখন উত্তর দিতে পারছে না, একটু পরে চেষ্টা করুন'); }
    return { a: text.slice(0, 1500), left };
  } catch (e) {
    if (e instanceof HttpErr) throw e;
    throw new HttpErr(502, 'AI এখন উত্তর দিতে পারছে না, একটু পরে চেষ্টা করুন');
  } finally { clearTimeout(tm); }
}

// সমস্যা খোঁজার জন্য: AI চলছে কিনা (?f=diag&q=ai) — key দেখায় না, ছোট একটা প্রশ্ন পাঠিয়ে উত্তর আসে কিনা দেখে
export async function aiPing() {
  if (!aiOn()) return { ai: false };
  const out = [];
  for (const model of [process.env.LIVE_AI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean)) {
    const ac = new AbortController(), t0 = Date.now(); const tm = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'এক শব্দে বলুন: ঠিক আছে' }] }], generationConfig: { maxOutputTokens: 20 } })
      });
      const j = await r.json().catch(() => ({}));
      out.push({ model, status: r.status, ok: r.ok, ms: Date.now() - t0, err: j.error ? String(j.error.message || '').slice(0, 160) : null });
      if (r.status !== 404) break;
    } catch (e) { out.push({ model, ms: Date.now() - t0, err: e.name === 'AbortError' ? 'সময় পেরিয়ে গেছে (৮ সেকেন্ড)' : String(e.message || e).slice(0, 120) }); }
    finally { clearTimeout(tm); }
  }
  console.log('aiPing', JSON.stringify(out));
  return { ai: true, tries: out };
}
