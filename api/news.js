// খেলাঘর "খবর": দেশ আর বিদেশের সর্বশেষ শিরোনাম, সংবাদমাধ্যমের নিজের RSS থেকে।
// শুধু শিরোনাম, ছোট ছবি, সময় আর মূল খবরের লিংক দেখানো হয় (পুরো লেখা নয়); চাপলে মূল সাইটে খোলে।
// খেলাধুলার খবর বাদ (ওটা লাইভ স্কোরের আলাদা অংশে)।
// কোনো key লাগে না। Vercel-এর CDN ৫ মিনিট জমা রাখে, তাই দর্শক যত বাড়ুক, RSS-এ ডাক কম।
//
// GET /api/news            → { at, items: [{ t, u, s, d, img, tab }] }  tab: 'desh' | 'bidesh' | 'more' (বিজ্ঞান-প্রযুক্তি-বিনোদন)
// GET /api/news?diag=1     → কোন উৎস থেকে কয়টা খবর এল (পরীক্ষার জন্য)

const SOURCES = [
  // বাংলা: দেশ আর বিদেশ মেশানো, শিরোনাম দেখে ভাগ হয়
  { n: 'প্রথম আলো', u: 'https://www.prothomalo.com/feed/', tab: 'auto' },
  { n: 'বিবিসি বাংলা', u: 'https://feeds.bbci.co.uk/bengali/rss.xml', tab: 'auto' },
  { n: 'ডয়চে ভেলে বাংলা', u: 'https://rss.dw.com/rdf/rss-ben-all', tab: 'auto' },
  { n: 'জাগো নিউজ', u: 'https://www.jagonews24.com/rss/rss.xml', tab: 'auto' },
  { n: 'বিডিনিউজ২৪', u: 'https://bangla.bdnews24.com/?widgetName=rssfeed&widgetId=1151&getXmlFeed=true', tab: 'auto' },
  { n: 'কালের কণ্ঠ', u: 'https://www.kalerkantho.com/rss.xml', tab: 'auto' },
  // ইংরেজি: দেশের আর বিশ্বের
  { n: 'The Daily Star', u: 'https://www.thedailystar.net/frontpage/rss.xml', tab: 'desh' },
  { n: 'BBC World', u: 'https://feeds.bbci.co.uk/news/world/rss.xml', tab: 'bidesh' },
  { n: 'Al Jazeera', u: 'https://www.aljazeera.com/xml/rss/all.xml', tab: 'bidesh' }
];
// শিরোনামে এই শব্দ থাকলে বিদেশের খবর ধরা হয় (বাংলা মেশানো উৎসে)
const WORLD = /আয়ারল্যান্ড|ডাবলিন|কপ-\d|জলবায়ু সম্মেলন|নিউইয়র্ক|প্যারিস|বার্লিন|টোকিও|সিডনি|থাইল্যান্ড|ভিয়েতনাম|ইন্দোনেশিয়া|ফিলিপাইন|মিসর|কাতার|কুয়েত|ওমান|বাহরাইন|ইরাক|লিবিয়া|সুদান|ব্রাজিল|আর্জেন্টিনা|মেক্সিকো|যুক্তরাষ্ট্র|আমেরিকা|ট্রাম্প|ভারত|দিল্লি|কলকাতা|পশ্চিমবঙ্গ|চীন|রাশিয়া|পুতিন|ইউক্রেন|ইসরায়েল|গাজা|ফিলিস্তিন|ইরান|পাকিস্তান|আফগান|মিয়ানমার|রোহিঙ্গা রাষ্ট্র|সৌদি|দুবাই|আরব|জাতিসংঘ|ইউরোপ|যুক্তরাজ্য|ব্রিটেন|লন্ডন|জাপান|কোরিয়া|তুরস্ক|নেপাল|শ্রীলঙ্কা|মালয়েশিয়া|সিঙ্গাপুর|অস্ট্রেলিয়া|কানাডা|ফ্রান্স|জার্মানি|ইতালি|আফ্রিকা|সিরিয়া|লেবানন|ইয়েমেন|ন্যাটো|বিশ্বব্যাংক|আইএমএফ|মোদি|হোয়াইট হাউস|বেইজিং|মস্কো|কিয়েভ|তেহরান|ওয়াশিংটন/;
const LINK_WORLD = /\/(international|world|bishwo|aantorjatik|antorjatik|international-news|probash|abroad)\b/i;
const LINK_MORE = /\/(science|technology|tech|entertainment|lifestyle|life-style|education|health|feature|religion|binodon|bigyan|projukti)\b/i; // বিজ্ঞান, প্রযুক্তি, বিনোদন, জীবনযাপন → "আরো"
const MORE = /আইনস্টাইন|মহাকাশ|নাসা|গবেষণা|বিজ্ঞানী|টেলিস্কোপ|স্মার্টফোন|এআই|কৃত্রিম বুদ্ধিমত্তা|অ্যাপ|সিনেমা|নাটক|অভিনেতা|অভিনেত্রী|গান|শিল্পী|রেসিপি|স্বাস্থ্য|ডায়াবেটিস|হৃদ্‌রোগ|ত্বক|চুল/;
const LINK_HOME = /\/(bangladesh|national|country|dhaka|politics|bangla|saradesh|capital|economy|business)\b/i;
const SPORTS = /\/(sport|sports|khela|cricket|football)\b|ক্রিকেট|ফুটবল|ম্যাচ|উইকেট|গোল করে|টেস্টে|ওয়ানডে|টি-টোয়েন্টি|বিশ্বকাপ|সাকিব|তামিম|মেসি|রোনালদো|\bcricket\b|\bfootball\b|\bmatch\b/i;

const dec = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/\s+/g, ' ').trim();
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, 'i')); return m ? dec(m[1]) : ''; };
const attr = (x, n, a) => { const m = x.match(new RegExp(`<${n}[^>]*\\s${a}="([^"]+)"`, 'i')); return m ? m[1].replace(/&amp;/g, '&') : ''; };
function parse(xml, src) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 30).map(b => {
    const t = tag(b, 'title'), u = tag(b, 'link') || attr(b, 'link', 'href') || tag(b, 'guid');
    const ds = tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'), d = Date.parse(ds) || 0;
    const img = attr(b, 'media:thumbnail', 'url') || attr(b, 'media:content', 'url') || attr(b, 'enclosure', 'url') || ((b.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || '');
    return { t, u: u.trim(), s: src.n, d, img: /^https:\/\//.test(img) ? img : '', tab: src.tab };
  }).filter(x => x.t && /^https?:\/\//.test(x.u));
}
async function grab(src) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 6000);
  try {
    const r = await fetch(src.u, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KhelaghorNews/1.0; +https://khelaghorbd.online)', Accept: 'application/rss+xml, application/xml, text/xml, */*' } });
    if (!r.ok) return { src, items: [], err: 'HTTP ' + r.status };
    return { src, items: parse(await r.text(), src) };
  } catch (e) { return { src, items: [], err: String(e && e.name || e) }; } finally { clearTimeout(to); }
}
function tabOf(x) {
  if (x.tab !== 'auto') return x.tab;
  if (LINK_WORLD.test(x.u)) return 'bidesh'; if (LINK_MORE.test(x.u)) return 'more'; if (LINK_HOME.test(x.u)) return 'desh';
  return WORLD.test(x.t) ? 'bidesh' : MORE.test(x.t) ? 'more' : 'desh';
}

export default async function handler(req, res) {
  const all = await Promise.all(SOURCES.map(grab)), seen = new Set(), now = Date.now();
  if (req.query && req.query.diag) { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json(all.map(a => ({ s: a.src.n, n: a.items.length, err: a.err || '' }))); }
  const items = all.flatMap(a => a.items)
    .filter(x => !SPORTS.test(x.t) && !SPORTS.test(x.u))
    .filter(x => { const k = x.t.slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(x => ({ ...x, d: x.d && x.d < now + 3600e3 ? x.d : 0, tab: tabOf(x) }))
    .sort((a, b) => b.d - a.d).slice(0, 120);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({ at: now, items, ok: all.filter(a => a.items.length).map(a => a.src.n) });
}
