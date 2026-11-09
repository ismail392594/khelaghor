// খেলাঘর লাইভ স্কোর: একটাই সার্ভার ফাংশন (Vercel-এর ফাংশনের সংখ্যা কম রাখতে)।
//
// দরকার (Vercel → Settings → Environment Variables):
//   CRICKET_API_KEY          : cricketdata.org থেকে পাওয়া key (না থাকলে ক্রিকেটে নমুনা ডাটা দেখায়)
//   SPORTMONKS_TOKEN         : (ইচ্ছা হলে) Sportmonks ক্রিকেটের token, থাকলে দ্রুত স্কোর আর আসল বল-বাই-বল
//   FOOTBALL_API_KEY         : dashboard.api-football.com থেকে পাওয়া key (না থাকলে ফুটবলে নমুনা ডাটা)
//   FIREBASE_SERVICE_ACCOUNT : আগে থেকেই আছে
//   LIVE_FB_LEAGUES          : (ইচ্ছা হলে) কোন ফুটবল প্রতিযোগিতা দেখাবে, যেমন "1,2,39"
//
// GET  /api/live?f=feed            → সব ম্যাচ (CDN-এ ১৫ সেকেন্ড জমা থাকে)
// GET  /api/live?f=match&id=c_xxx  → এক ম্যাচের বিস্তারিত + ভোটের গোনা
// GET  /api/live?f=board[&p=week]  → লিডারবোর্ড (সব সময় / এই সপ্তাহ)
// GET  /api/live?f=table&lg=39&season=2026 → ফুটবল লিগের পয়েন্ট টেবিল
// GET  /api/live?f=me              → (লগইন) আমার পয়েন্ট আর ভোট
// GET  /live/m/{id} (= ?f=page&id=) → Google-এর জন্য ম্যাচের পাতা;  /live/sitemap.xml (= ?f=sitemap)
// GET  /api/live?f=share&id=..   → শেয়ারের লিংক (প্রিভিউতে স্কোর দেখায়, তারপর ম্যাচের পাতায় নিয়ে যায়)
// GET  /api/live?f=diag            → ডাটা ঠিকমতো আসছে কিনা দেখার ছোট রিপোর্ট (কোনো key দেখায় না)
// POST /api/live?f=vote {id,pick}  → (লগইন) "কে জিতবে?" ভোট
// POST /api/live?f=vote {id,mk:'ou',side:'o'|'u'} → বেশি/কম অনুমান
// POST /api/live?f=combo {legs:[{id,mk,pick}]} → কম্বো (২-৬টা ম্যাচ, সব মিললে বোনাস)
// POST /api/live?f=group {act:'create'|'join'|'leave', name|code} → বন্ধুদের গ্রুপ;  GET ?f=gboard&code=&p= → গ্রুপের লিডারবোর্ড
// POST /api/live?f=push {token,teams} → প্রিয় দলের খবর ফোনে পেতে নাম লেখানো (teams খালি = বন্ধ)
// POST /api/live?f=react {id,e,n}  → দর্শকের ইমোজি প্রতিক্রিয়া (fire, wow, clap, sad, love)
import { shareHtml } from './_share.js';
import { matchPage, sitemapXml } from './_seo.js';
import { group, gboard } from './_store.js';
import { getFeed, getMatch, vote, combo, me, board, diag, table, react, push, HttpErr, POINTS, EXACT, COMBO } from './_store.js';

const cache = (res, s, swr) => res.setHeader('Cache-Control', s ? `public, max-age=0, s-maxage=${s}, stale-while-revalidate=${swr}` : 'no-store');

export default async function handler(req, res) {
  const q = req.query || {};
  const f = String(q.f || 'feed');
  try {
    if (req.method === 'POST') {
      cache(res, 0);
      if (f === 'vote') return res.status(200).json(await vote(req));
      if (f === 'combo') return res.status(200).json(await combo(req));
      if (f === 'group') return res.status(200).json(await group(req));
      if (f === 'react') return res.status(200).json(await react(req));
      if (f === 'push') return res.status(200).json(await push(req));
      throw new HttpErr(405, 'ভুল অনুরোধ');
    }
    if (req.method !== 'GET') throw new HttpErr(405, 'ভুল অনুরোধ');
    if (f === 'feed') {
      const d = await getFeed();
      cache(res, 15, 45);
      return res.status(200).json({ ...d, points: POINTS, exact: EXACT, combo: COMBO });
    }
    if (f === 'match') {
      const d = await getMatch(String(q.id || ''));
      cache(res, d.m.state === 'done' ? 120 : d.m.state === 'live' ? 10 : 30, 30);
      return res.status(200).json(d);
    }
    if (f === 'gboard') { cache(res, 30, 60); return res.status(200).json(await gboard(q.code, q.p === 'week' ? 'week' : 'all')); }
    if (f === 'board') { cache(res, 60, 120); return res.status(200).json(await board(q.p === 'week' ? 'week' : 'all')); }
    if (f === 'table') { cache(res, 1800, 3600); return res.status(200).json(await table(q.lg, q.season)); }
    if (f === 'page') {
      // Google-এর জন্য ম্যাচের পাতা (/live/m/{id})
      const id = String(q.id || '').slice(0, 70);
      let m = null;
      try { m = (await getFeed()).matches.find(x => x.id === id) || null; } catch (e) {}
      if (!m && /^[a-z]_[A-Za-z0-9_-]{1,60}$/.test(id) && !id.startsWith('d_')) { try { m = (await getMatch(id)).m; } catch (e) {} }
      cache(res, m && m.state === 'done' ? 3600 : 60, 600);
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.status(m ? 200 : 404).send(matchPage(m, id));
    }
    if (f === 'sitemap') {
      let list = [];
      try { list = (await getFeed()).matches; } catch (e) {}
      cache(res, 900, 3600);
      res.setHeader('content-type', 'application/xml; charset=utf-8');
      return res.status(200).send(sitemapXml(list));
    }
    if (f === 'share') {
      const id = String(q.id || '');
      let m = null;
      try { m = (await getFeed()).matches.find(x => x.id === id) || null; } catch (e) {}
      cache(res, 60, 300);
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.status(200).send(shareHtml(m, id, q.p === '1'));
    }
    if (f === 'diag') { cache(res, 0); return res.status(200).json(await diag(String(q.q || '').slice(0, 40))); }
    if (f === 'me') { cache(res, 0); return res.status(200).json(await me(req)); }
    throw new HttpErr(404, 'পাওয়া যায়নি');
  } catch (e) {
    if (!(e instanceof HttpErr)) console.error('live', e);
    cache(res, 0);
    return res.status(e.status || 500).json({ error: e instanceof HttpErr ? e.message : 'সার্ভারে সমস্যা, একটু পরে চেষ্টা করুন' });
  }
}
