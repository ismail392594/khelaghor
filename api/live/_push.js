// লাইভ স্কোর: প্রিয় দলের খবর ফোনে (Firebase Cloud Messaging দিয়ে ওয়েব পুশ)।
// কে কোন দলের খবর চায়: Firestore livePush/{token-এর hash} = { token, teams: [দলের ইংরেজি নাম], at }
import { createHash } from 'node:crypto';

const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const nm = t => t.bn || t.name;
const hash = t => createHash('sha1').update(String(t)).digest('hex');

// সাইন আপ বা বাতিল: { token, teams: [...] } (teams খালি হলে মুছে ফেলা)
export async function pushSub(F, b) {
  const token = String(b.token || '').slice(0, 4096);
  if (token.length < 20) return { ok: false };
  const teams = [...new Set((Array.isArray(b.teams) ? b.teams : []).map(x => String(x).slice(0, 60)).filter(Boolean))].slice(0, 30);
  const ref = F.db.doc('livePush/' + hash(token));
  if (!teams.length) { await ref.delete().catch(() => {}); return { ok: true, off: true }; }
  await ref.set({ token, teams, at: Date.now() });
  return { ok: true, n: teams.length };
}

const wk = m => (m.inns || []).reduce((t, i) => t + (i.w || 0), 0);
// আগের আর নতুন তালিকা মিলিয়ে খবর: খেলা শুরু, উইকেট, গোল, খেলা শেষ
export function events(oldList, newList) {
  const old = new Map((oldList || []).map(m => [m.id, m]));
  const out = [];
  for (const m of newList || []) {
    const o = old.get(m.id);
    if (!o || m.demo) continue;
    const url = '/live/#m=' + m.id, vs = `${nm(m.a)} বনাম ${nm(m.b)}`;
    const base = { teams: [m.a.name, m.b.name], url, tag: m.id };
    if (o.state === 'upcoming' && m.state === 'live' && !m.pause) out.push({ ...base, title: `🔴 খেলা শুরু: ${vs}`, body: m.tour || 'খেলাঘরে লাইভ স্কোর দেখুন' });
    else if (o.state === 'live' && m.state === 'done') out.push({ ...base, title: `🏁 খেলা শেষ: ${vs}`, body: m.status || '' });
    else if (m.state === 'live' && m.sport === 'cricket' && wk(m) > wk(o)) {
      const c = (m.inns || [])[(m.inns || []).length - 1];
      const T = c && c.side === 'a' ? m.a : m.b;
      out.push({ ...base, title: `☝️ উইকেট! ${nm(T)} ${c ? bn(`${c.r}/${c.w}`) : ''}`, body: `${vs}${c ? ` · ${bn(c.o)} ওভার` : ''}` });
    } else if (m.state === 'live' && m.sport === 'football' && ((m.a.g || 0) + (m.b.g || 0)) > ((o.a.g || 0) + (o.b.g || 0))) {
      out.push({ ...base, title: `⚽ গোল! ${nm(m.a)} ${bn(m.a.g || 0)} - ${bn(m.b.g || 0)} ${nm(m.b)}`, body: m.min ? `${bn(m.min)} মিনিট` : (m.tour || '') });
    }
  }
  return out.slice(0, 12);
}

export async function sendEvents(F, evs) {
  if (!evs.length || !F.msg) return 0;
  let sent = 0;
  for (const ev of evs) {
    const q = await F.db.collection('livePush').where('teams', 'array-contains-any', ev.teams.slice(0, 10)).limit(500).get();
    if (q.empty) continue;
    const docs = q.docs;
    const r = await F.msg.sendEachForMulticast({
      tokens: docs.map(d => d.data().token),
      webpush: { headers: { Urgency: 'high', TTL: '900' }, data: { title: ev.title, body: ev.body || '', url: ev.url, tag: ev.tag } }
    }).catch(e => { console.error('push', e.message); return null; });
    if (!r) continue;
    sent += r.successCount;
    // বাতিল হয়ে যাওয়া token মুছে ফেলা
    const bad = r.responses.map((x, i) => (!x.success && /not-registered|invalid-registration|invalid-argument/.test((x.error && x.error.code) || '') ? docs[i].ref : null)).filter(Boolean);
    for (const ref of bad) await ref.delete().catch(() => {});
  }
  return sent;
}
