// গল্প শোনানোর জন্য লেখাকে ছোট ছোট অংশে ভাগ (সার্ভার আর ফোন একই নিয়মে ভাগ করে)
export function splitStory(title, body, max = 1100) {
  const paras = (String(title || '') + '।\n\n' + String(body || '')).split(/\n+/).map(s => s.trim()).filter(Boolean);
  const out = []; let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (let p of paras) {
    while (p.length > max) { // খুব লম্বা অনুচ্ছেদ: দাঁড়ি ধরে কাটা
      let cut = p.lastIndexOf('।', max); if (cut < max * .4) cut = p.lastIndexOf(' ', max); if (cut < 1) cut = max;
      push(); out.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim();
    }
    if ((cur + '\n' + p).length > max) push();
    cur += (cur ? '\n' : '') + p;
  }
  push();
  return out;
}
