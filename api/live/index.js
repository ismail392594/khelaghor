// খেলাঘর লাইভ স্কোর: একটাই সার্ভার ফাংশন (Vercel-এর ফাংশনের সংখ্যা কম রাখতে)।
//
// দরকার (Vercel → Settings → Environment Variables):
//   CRICKET_API_KEY          : cricketdata.org থেকে পাওয়া key (না থাকলে ক্রিকেটে নমুনা ডাটা দেখায়)
//   FOOTBALL_API_KEY         : dashboard.api-football.com থেকে পাওয়া key (না থাকলে ফুটবলে নমুনা ডাটা)
//   FIREBASE_SERVICE_ACCOUNT : আগে থেকেই আছে
//   LIVE_FB_LEAGUES          : (ইচ্ছা হলে) কোন ফুটবল প্রতিযোগিতা দেখাবে, যেমন "1,2,39"
//
// GET  /api/live?f=feed            → সব ম্যাচ (CDN-এ ১৫ সেকেন্ড জমা থাকে)
// GET  /api/live?f=match&id=c_xxx  → এক ম্যাচের বিস্তারিত + ভোটের গোনা
// GET  /api/live?f=board[&p=week]  → লিডারবোর্ড (সব সময় / এই সপ্তাহ)
// GET  /api/live?f=table&lg=39&season=2026 → ফুটবল লিগের পয়েন্ট টেবিল
// GET  /api/live?f=me              → (লগইন) আমার পয়েন্ট আর ভোট
// GET  /api/live?f=diag            → ডাটা ঠিকমতো আসছে কিনা দেখার ছোট রিপোর্ট (কোনো key দেখায় না)
// POST /api/live?f=vote {id,pick}  → (লগইন) "কে জিতবে?" ভোট
import { getFeed, getMatch, vote, me, board, diag, table, HttpErr, POINTS, EXACT } from './_store.js';

const cache = (res, s, swr) => res.setHeader('Cache-Control', s ? `public, max-age=0, s-maxage=${s}, stale-while-revalidate=${swr}` : 'no-store');

export default async function handler(req, res) {
  const q = req.query || {};
  const f = String(q.f || 'feed');
  try {
    if (req.method === 'POST') {
      cache(res, 0);
      if (f === 'vote') return res.status(200).json(await vote(req));
      throw new HttpErr(405, 'ভুল অনুরোধ');
    }
    if (req.method !== 'GET') throw new HttpErr(405, 'ভুল অনুরোধ');
    if (f === 'feed') {
      const d = await getFeed();
      cache(res, 15, 45);
      return res.status(200).json({ ...d, points: POINTS, exact: EXACT });
    }
    if (f === 'match') {
      const d = await getMatch(String(q.id || ''));
      cache(res, d.m.state === 'done' ? 120 : d.m.state === 'live' ? 10 : 30, 30);
      return res.status(200).json(d);
    }
    if (f === 'board') { cache(res, 60, 120); return res.status(200).json(await board(q.p === 'week' ? 'week' : 'all')); }
    if (f === 'table') { cache(res, 1800, 3600); return res.status(200).json(await table(q.lg, q.season)); }
    if (f === 'diag') { cache(res, 0); return res.status(200).json(await diag(String(q.q || '').slice(0, 40))); }
    if (f === 'me') { cache(res, 0); return res.status(200).json(await me(req)); }
    throw new HttpErr(404, 'পাওয়া যায়নি');
  } catch (e) {
    if (!(e instanceof HttpErr)) console.error('live', e);
    cache(res, 0);
    return res.status(e.status || 500).json({ error: e instanceof HttpErr ? e.message : 'সার্ভারে সমস্যা, একটু পরে চেষ্টা করুন' });
  }
}
