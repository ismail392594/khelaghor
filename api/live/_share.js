// লাইভ স্কোর: ফেসবুক/হোয়াটসঅ্যাপে লিংক শেয়ার করলে স্কোরসহ প্রিভিউ।
// /api/live?f=share&id=... একটা ছোট পাতা দেয়, যার শিরোনাম আর বিবরণে স্কোর থাকে; মানুষ খুললে সোজা ম্যাচের পাতায় চলে যায়।
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nm = t => t.bn || t.name;
function sc(m, s) {
  const t = m[s];
  if (m.sport === 'football') return t.g == null ? '' : bn(t.g);
  const l = (t.inn || [])[(t.inn || []).length - 1];
  return l ? bn(l.w >= 10 ? l.r : `${l.r}/${l.w}`) : '';
}
export function shareHtml(m, id) {
  const url = `https://khelaghorbd.online/live/#m=${encodeURIComponent(id)}`;
  let title = 'লাইভ স্কোর বাংলায় · খেলাঘর', desc = 'ক্রিকেট আর ফুটবলের লাইভ স্কোর বাংলায়, আর কে জিতবে ভোট দিয়ে পয়েন্ট জিতুন।';
  if (m) {
    const ic = m.sport === 'cricket' ? '🏏' : '⚽';
    const live = m.state === 'live' ? '🔴 লাইভ: ' : m.state === 'done' ? '🏁 ' : '';
    if (m.state === 'upcoming') title = `${ic} ${nm(m.a)} বনাম ${nm(m.b)} · কে জিতবে? ভোট দিন`;
    else if (m.sport === 'football') title = `${live}${ic} ${nm(m.a)} ${sc(m, 'a')} - ${sc(m, 'b')} ${nm(m.b)}`;
    else title = `${live}${ic} ${nm(m.a)} ${sc(m, 'a')} বনাম ${nm(m.b)} ${sc(m, 'b')}`.replace(/\s+/g, ' ');
    desc = `${m.status || ''}${m.tour ? ' · ' + m.tour : ''} · খেলাঘরে বাংলায় বল-বাই-বল আর কে জিতবে ভোট।`;
  }
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website"><meta property="og:site_name" content="খেলাঘর">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="https://khelaghorbd.online/icons/og.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${esc(url)}"><link rel="canonical" href="${esc(url)}">
</head><body style="background:#0d1238;color:#fff;font-family:sans-serif;text-align:center;padding:40px">
<p>${esc(title)}</p><p><a style="color:#ffc727" href="${esc(url)}">ম্যাচ দেখুন ›</a></p>
<script>location.replace(${JSON.stringify(url)})</script></body></html>`;
}
