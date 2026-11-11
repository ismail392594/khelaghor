// লাইভ স্কোর: Google-এর জন্য প্রতিটা ম্যাচের আলাদা পাতা (/live/m/{id}) আর ম্যাচের sitemap (/live/sitemap.xml)।
// পাতাটা সার্ভারেই তৈরি হয় (Google সহজে পড়তে পারে), ভেতরে Google-এর বোঝার ভাষায় (schema.org SportsEvent) ম্যাচের তথ্য।
const SITE = 'https://khelaghorbd.online';
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nm = t => t.bn || t.name;
const MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export const pageUrl = id => `${SITE}/live/m/${encodeURIComponent(id)}`;

function dhaka(t) {
  const d = new Date(t + 6 * 3600e3);
  const h = d.getUTCHours(), mm = String(d.getUTCMinutes()).padStart(2, '0');
  const per = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  return `${bn(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${bn(d.getUTCFullYear())}, ${per} ${bn(`${h % 12 || 12}:${mm}`)} (বাংলাদেশ সময়)`;
}
function score(m, s) {
  const t = m[s];
  if (m.sport === 'football') return t.g == null ? '' : bn(t.g);
  return (t.inn || []).map(i => bn(i.w >= 10 ? i.r : `${i.r}/${i.w}`) + ` (${bn(i.o)})`).join(' ও ');
}
const flag = t => (t.flag ? `<img src="https://flagcdn.com/w80/${esc(t.flag)}.png" alt="${esc(t.name)} পতাকা" width="48" height="32" loading="lazy">` : `<span class="mn">${esc(t.mono || '?')}</span>`);

// খেলাঘরের নিজের লেখা ছোট বাংলা প্রতিবেদন (আগে: প্রিভিউ, চলার সময়: এখনকার অবস্থা, শেষে: ফলাফল)। সব তথ্য আমাদের ডাটা থেকে।
const pc = v => bn(Math.round(v * 100)) + '%';
const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
export function story(m) {
  const A = nm(m.a), B = nm(m.b), out = [];
  const where = m.venue ? `${m.venue}${m.city && !String(m.venue).includes(m.city) ? ', ' + m.city : ''}` : '';
  if (m.state === 'upcoming') {
    out.push(`${m.tour ? m.tour + '-এর ' : ''}${m.label ? m.label + ' ' : ''}খেলায় মুখোমুখি হচ্ছে ${A} আর ${B}। খেলা শুরু ${dhaka(m.start)}${where ? `, মাঠ ${where}` : ''}।`);
    const p = m.pred;
    if (p && p.a != null) {
      const fav = p.a >= p.b ? A : B, gap = Math.abs(p.a - p.b);
      out.push(gap < 0.08 ? `খেলাঘরের হিসাবে দুই দল প্রায় সমান: ${A} ${pc(p.a)}, ${B} ${pc(p.b)}${p.d ? `, ড্র ${pc(p.d)}` : ''}।`
        : `খেলাঘরের হিসাবে ${fav} এগিয়ে: ${A} জেতার সম্ভাবনা ${pc(p.a)}, ${B} ${pc(p.b)}${p.d ? `, ড্র ${pc(p.d)}` : ''}।`);
      if (m.sport === 'football' && p.la != null) {
        let best = [0, 0, 0];
        for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) { const q = pois(p.la, i) * pois(p.lb, j); if (q > best[2]) best = [i, j, q]; }
        const btts = (1 - Math.exp(-p.la)) * (1 - Math.exp(-p.lb));
        out.push(`আনুমানিক গোল: ${A} ${bn(p.la.toFixed(1))}, ${B} ${bn(p.lb.toFixed(1))}। সবচেয়ে সম্ভাব্য ফল ${bn(best[0])}-${bn(best[1])}, আর দুই দলই গোল করার সম্ভাবনা ${pc(btts)}।`);
      }
    }
    out.push('খেলা শুরু হলে এই পাতায় আর খেলাঘরের লাইভ পাতায় বাংলায় স্কোর আসবে। খেলার আগে "কে জিতবে" অনুমান দিয়ে পয়েন্ট জেতা যায়।');
  } else if (m.state === 'live') {
    out.push(`${A} বনাম ${B} খেলা এখন চলছে${m.tour ? ` (${m.tour})` : ''}। ${m.sport === 'football' ? `স্কোর ${A} ${bn(m.a.g ?? 0)}, ${B} ${bn(m.b.g ?? 0)}${m.min ? `, খেলার ${bn(m.min)} মিনিট` : ''}।` : `${m.status || ''}।`}`);
    out.push('প্রতিটা ঘটনা, জেতার সম্ভাবনা আর খেলার অ্যানিমেশন দেখতে লাইভ পাতা খুলুন।');
  } else {
    const sa = score(m, 'a'), sb = score(m, 'b');
    out.push(`${m.tour ? m.tour + '-এর ' : ''}খেলায় ${A} ${sa || ''} আর ${B} ${sb || ''}। ${m.status || 'খেলা শেষ'}।`);
    if (m.pen) out.push(`নির্ধারিত সময়ে খেলা ড্র থাকায় টাইব্রেকার হয়, সেখানে ফল ${bn(m.pen[0])}-${bn(m.pen[1])}।`);
    if (where) out.push(`খেলা হয়েছে ${where}-এ, ${dhaka(m.start)}।`);
  }
  return out.join(' ');
}

export function matchPage(m, id) {
  const live = `/live/#m=${encodeURIComponent(id)}`;
  if (!m) {
    return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ম্যাচ পাওয়া যায়নি · খেলাঘর লাইভ স্কোর</title></head>
<body style="background:#06180f;color:#eef2e4;font-family:sans-serif;text-align:center;padding:40px"><p>এই ম্যাচটা এখন আর তালিকায় নেই।</p><p><a style="color:#e8b649" href="/live/">সব লাইভ স্কোর দেখুন ›</a></p></body></html>`;
  }
  const ic = m.sport === 'cricket' ? '🏏' : '⚽';
  const sportBn = m.sport === 'cricket' ? 'ক্রিকেট' : 'ফুটবল';
  const vsBn = `${nm(m.a)} বনাম ${nm(m.b)}`, vsEn = `${m.a.name} vs ${m.b.name}`;
  const stateBn = m.state === 'live' ? 'লাইভ স্কোর' : m.state === 'done' ? 'ফলাফল ও স্কোরকার্ড' : 'খেলার সময় ও পূর্বাভাস';
  const title = `${vsBn} ${stateBn} | ${vsEn} ${m.state === 'done' ? 'Result' : 'Live Score'} · খেলাঘর`;
  const sa = score(m, 'a'), sb = score(m, 'b');
  const desc = (m.state === 'upcoming' ? `${vsBn} (${sportBn}) খেলা শুরু ${dhaka(m.start)}। ` : `${nm(m.a)} ${sa || ''}, ${nm(m.b)} ${sb || ''}। ${m.status || ''} `) + `${m.tour || ''}। বাংলায় বল-বাই-বল, স্কোরকার্ড আর বিশ্লেষণ।`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'SportsEvent', name: `${vsEn}${m.tour ? ' - ' + m.tour : ''}`,
    sport: m.sport === 'cricket' ? 'Cricket' : 'Soccer', startDate: new Date(m.start).toISOString(),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: pageUrl(id), description: desc.slice(0, 300),
    homeTeam: { '@type': 'SportsTeam', name: m.a.name }, awayTeam: { '@type': 'SportsTeam', name: m.b.name },
    competitor: [{ '@type': 'SportsTeam', name: m.a.name }, { '@type': 'SportsTeam', name: m.b.name }],
    location: { '@type': 'Place', name: m.venue || m.city || 'TBA', address: m.city || m.venue || 'TBA' },
    organizer: { '@type': 'Organization', name: m.tour || sportBn }
  };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'খেলাঘর', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: 'লাইভ স্কোর', item: SITE + '/live/' },
    { '@type': 'ListItem', position: 3, name: vsBn, item: pageUrl(id) }] };
  const pill = m.state === 'live' ? '<span class="p lv">● লাইভ</span>' : m.state === 'done' ? '<span class="p dn">খেলা শেষ</span>' : '<span class="p">আসন্ন</span>';
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc.slice(0, 160))}">
<link rel="canonical" href="${esc(pageUrl(id))}">
<meta property="og:type" content="website"><meta property="og:site_name" content="খেলাঘর"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc.slice(0, 200))}"><meta property="og:url" content="${esc(pageUrl(id))}"><meta property="og:image" content="${SITE}/icons/og.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#06180f"><link rel="icon" href="/icons/icon-192.png"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wdth,wght@85,700&family=Hind+Siliguri:wght@400;500;600&display=swap">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify(crumbs).replace(/</g, '\\u003c')}</script>
<style>body{margin:0;background:#06180f;color:#eef2e4;font-family:'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif;line-height:1.55}main{max-width:600px;margin:0 auto;padding:16px}
nav{font-size:.8rem;color:#a9b9a6}nav a{color:#a9b9a6}h1{font-family:'Anek Bangla','Hind Siliguri',sans-serif;font-size:1.5rem;line-height:1.2;margin:12px 0 4px}h2{font-size:.95rem;color:#a9b9a6;font-weight:500;margin:0 0 14px}
.c{background:#0b2318;border:1px solid rgba(226,238,214,.1);border-radius:14px;padding:16px}.r{display:flex;align-items:center;gap:12px;padding:8px 0}.r b{flex:1;font-size:1.1rem;font-weight:600}
.r i{font-style:normal;font-family:'Anek Bangla',sans-serif;font-weight:700;font-size:1.5rem}img,.mn{border-radius:4px}.mn{display:inline-grid;place-items:center;width:48px;height:32px;background:#2f6fc9;font-weight:700}
.p{display:inline-block;border-radius:6px;padding:2px 10px;font-size:.8rem;font-weight:700;border:1px solid rgba(226,238,214,.16)}.p.lv{background:#f42a41;border-color:#f42a41}.p.dn{color:#43c97c;border-color:rgba(67,201,124,.35)}
.st{margin:10px 0 0;color:#ffc9cf;font-weight:600}.mt{color:#a9b9a6;font-size:.85rem;margin-top:8px}
.go{display:block;text-align:center;margin:16px 0 8px;padding:13px;border-radius:10px;background:#f42a41;color:#fff;font-weight:700;text-decoration:none}
.go.y{background:#e8b649;color:#241a02}footer{color:#728a75;font-size:.75rem;text-align:center;margin:20px 0}</style></head>
<body><main>
<nav><a href="/">খেলাঘর</a> › <a href="/live/">লাইভ স্কোর</a> › ${esc(vsBn)}</nav>
<h1>${esc(vsBn)} ${esc(stateBn)}</h1>
<h2>${esc(vsEn)} · ${esc(m.tour || sportBn)}${m.label ? ' · ' + esc(m.label) : ''}</h2>
<section class="c">${pill}
<div class="r">${flag(m.a)}<b>${esc(nm(m.a))}</b><i>${sa}</i></div>
<div class="r">${flag(m.b)}<b>${esc(nm(m.b))}</b><i>${sb}</i></div>
${m.status ? `<p class="st">${esc(m.status)}</p>` : ''}
<p class="mt">🕒 ${esc(dhaka(m.start))}${m.venue ? ` · 📍 ${esc(m.venue)}` : ''}${m.toss ? ` · ${esc(m.toss)}` : ''}</p></section>
<section class="c" style="margin-top:14px"><h3 style="margin:0 0 6px;font-size:1rem">${m.state === 'upcoming' ? 'ম্যাচ প্রিভিউ' : m.state === 'live' ? 'এখনকার অবস্থা' : 'ম্যাচ রিপোর্ট'}</h3><p style="margin:0">${esc(story(m))}</p></section>
<a class="go" href="${esc(live)}">${m.state === 'done' ? 'পুরো স্কোরকার্ড দেখুন' : 'লাইভ স্কোর আর বল-বাই-বল দেখুন'}</a>
${m.state === 'upcoming' ? `<a class="go y" href="/live/predict/#m=${encodeURIComponent(id)}">কে জিতবে? অনুমান দিয়ে পয়েন্ট জিতুন</a>` : ''}
<p class="mt">খেলাঘরে ${esc(vsBn)} (${esc(vsEn)}) ম্যাচের ${m.state === 'live' ? 'লাইভ স্কোর' : 'স্কোর'} বাংলায় দেখুন। প্রতি মিনিটে আপডেট, বল-বাই-বল ধারাভাষ্য, স্কোরকার্ড, জেতার সম্ভাবনা আর মাঠের আবহাওয়া।</p>
<footer>শুধু স্কোর দেখানো হয়, কোনো ভিডিও নয়। · <a style="color:#a9b0e0" href="/live/">সব খেলা</a></footer>
</main></body></html>`;
}

export function sitemapXml(matches, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const list = (matches || []).filter(m => !m.demo)
    .sort((x, y) => ((y.state === 'live') - (x.state === 'live')) || ((y.rk || 1) - (x.rk || 1)))
    .slice(0, 1000);
  const u = (loc, pr, cf) => `<url><loc>${esc(loc)}</loc><lastmod>${day}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [u(SITE + '/live/', '0.9', 'always'), u(SITE + '/live/predict/', '0.8', 'hourly'),
      ...list.map(m => u(pageUrl(m.id), m.state === 'live' ? '0.9' : (m.rk || 1) >= 3 ? '0.8' : '0.5', m.state === 'done' ? 'daily' : 'hourly'))].join('\n') + '\n</urlset>\n';
}
