// খেলা শেষের "খবরের কাগজ" ছবি: ফলাফল দিয়ে একটা পত্রিকার পাতা বানায়, ফোনে সরাসরি ফেসবুক/মেসেঞ্জারে শেয়ার
(function () {
  const bnNum = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const KICKERS = ['বিশেষ প্রতিবেদন', 'এইমাত্র পাওয়া', 'ব্রেকিং নিউজ', 'মাঠ থেকে সরাসরি', 'পাড়ার খবর'];
  const SIDE = ['এলাকায় চায়ের দোকানে এখন একটাই আলোচনা', 'প্রতিবেশীরা বলছেন: "আগেই জানতাম"', 'বিশেষজ্ঞরা এখনো হিসাব মেলাতে পারেননি', 'ঘটনার পর মুরুব্বিরা দোয়া করেছেন'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const txt = id => { const e = document.getElementById(id); return e ? e.textContent.trim() : ''; };
  function wrap(x, text, maxW) { const words = text.split(/\s+/), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
  async function draw() {
    const F = "'Baloo Da 2','Noto Sans Bengali',sans-serif";
    try { await Promise.all([document.fonts.load("800 80px 'Baloo Da 2'"), document.fonts.load("600 40px 'Baloo Da 2'")]); } catch (e) {}
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    // কাগজ
    x.fillStyle = '#f3ead6'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(120,90,40,${Math.random() * .05})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    const g = x.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 900); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,60,20,.22)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1a1410'; x.textAlign = 'center';
    // মাস্টহেড
    x.font = `800 112px ${F}`; x.fillText('খেলাঘর বার্তা', W / 2, 150);
    const d = new Date(); x.font = `600 30px ${F}`; x.fillStyle = '#4a3a2a';
    x.fillText(`ঢাকা, ${bnNum(d.getDate())} ${MONTHS[d.getMonth()]} ${bnNum(d.getFullYear())}  ·  মূল্য: একটা শেয়ার`, W / 2, 200);
    x.fillStyle = '#1a1410'; x.fillRect(60, 222, W - 120, 6); x.fillRect(60, 236, W - 120, 2);
    // কিকার + শিরোনাম
    const game = (document.title || '').split('·')[0].trim();
    x.fillStyle = '#b91c1c'; x.fillRect(60, 270, 380, 54); x.fillStyle = '#fff'; x.font = `800 32px ${F}`; x.textAlign = 'left'; x.fillText(pick(KICKERS) + ' · ' + game, 78, 308);
    x.fillStyle = '#120d09'; x.font = `800 92px ${F}`; let y = 420;
    for (const l of wrap(x, txt('endT') || 'খেলা শেষ', W - 120).slice(0, 3)) { x.fillText(l, 60, y); y += 100; }
    const sub = txt('endTitle'); if (sub) { x.fillStyle = '#7c2d12'; x.font = `700 46px ${F}`; x.fillText('“' + sub + '”', 60, y + 4); y += 70; }
    x.fillStyle = '#1a1410'; x.fillRect(60, y, W - 120, 3); y += 56;
    // প্রতিবেদন
    x.font = `500 36px ${F}`; x.fillStyle = '#2a2018';
    const body = (txt('endLine') || '') + ' ' + pick(SIDE) + '।';
    for (const l of wrap(x, body, W - 120).slice(0, 5)) { x.fillText(l, 60, y); y += 50; }
    // পরিসংখ্যান বাক্স
    const stats = [...document.querySelectorAll('#endO .stats > div')].map(dv => [dv.querySelector('b') ? dv.querySelector('b').textContent : '', dv.querySelector('span') ? dv.querySelector('span').textContent : '']).filter(s => s[0]).slice(0, 3);
    y = y + 40; const bw = (W - 120 - (stats.length - 1) * 24) / Math.max(1, stats.length);
    stats.forEach(([v, l], i) => { const bx = 60 + i * (bw + 24); x.fillStyle = 'rgba(26,20,16,.06)'; x.fillRect(bx, y, bw, 190); x.strokeStyle = '#1a1410'; x.lineWidth = 3; x.strokeRect(bx, y, bw, 190); x.textAlign = 'center'; x.fillStyle = '#b91c1c'; x.font = `800 84px ${F}`; x.fillText(v, bx + bw / 2, y + 105); x.fillStyle = '#2a2018'; x.font = `600 32px ${F}`; x.fillText(l, bx + bw / 2, y + 160); });
    y += 240; const Q = ['"এমন খেলা আগে দেখি নাই" — পাশের বাসার চাচা', '"আমার ছেলেও খেলবে" — এক উৎসাহী মা', '"আমি হলে আরো ভালো করতাম" — মোড়ের চা দোকানদার', '"রেকর্ড ভাঙা সময়ের ব্যাপার" — পাড়ার বড় ভাই'];
    if (y < H - 260) { x.textAlign = 'left'; x.fillStyle = '#7c2d12'; x.font = `800 34px ${F}`; x.fillText('পাঠকের মতামত', 60, y); x.fillStyle = '#2a2018'; x.font = `italic 500 34px ${F}`; for (const l of wrap(x, pick(Q), W - 120).slice(0, 2)) { y += 52; x.fillText(l, 60, y); } }
    // পাদটীকা
    x.textAlign = 'center'; x.fillStyle = '#1a1410'; x.fillRect(60, H - 170, W - 120, 3);
    x.font = `800 46px ${F}`; x.fillText('আপনিও পারবেন? এখনই খেলুন 👉 khelaghorbd.online', W / 2, H - 100);
    x.font = `600 28px ${F}`; x.fillStyle = '#4a3a2a'; x.fillText('ফ্রি · লগইন ছাড়াই · ফোনের ব্রাউজারে', W / 2, H - 55);
    return c;
  }
  async function share(btn) {
    const old = btn.textContent; btn.textContent = 'ছবি তৈরি হচ্ছে…'; btn.disabled = true;
    try {
      const c = await draw(); const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], 'khelaghor.png', { type: 'image/png' }), url = location.origin + location.pathname;
      const text = (txt('endT') || 'খেলাঘর') + ' — আপনিও খেলুন: ' + url;
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text, title: 'খেলাঘর' }); } catch (e) {} }
      else showImg(URL.createObjectURL(blob));
    } catch (e) { }
    btn.textContent = old; btn.disabled = false;
  }
  function showImg(src) {
    const o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px';
    o.innerHTML = `<img src="${src}" alt="ফলাফলের ছবি" style="max-width:100%;max-height:72vh;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6)"><p style="color:#fff;font-weight:700;text-align:center;margin:0">ছবিতে চেপে ধরে সেভ করুন, তারপর ফেসবুকে দিন</p><a download="khelaghor.png" href="${src}" style="color:#2a1a08;background:#ffd23f;padding:10px 18px;border-radius:12px;font-weight:800;text-decoration:none">ছবি নামান</a><button style="border:0;background:rgba(255,255,255,.15);color:#fff;padding:8px 16px;border-radius:12px;font-weight:700">বন্ধ করুন</button>`;
    o.querySelector('button').onclick = () => o.remove(); document.body.appendChild(o);
  }
  function setup() {
    const end = document.getElementById('endO'); if (!end) return;
    const acts = end.querySelector('.acts'); if (!acts || acts.querySelector('.shareImg')) return;
    const b = document.createElement('button'); b.className = 'gbtn shareImg'; b.textContent = '📸 ছবি শেয়ার'; b.style.cssText = 'background:linear-gradient(180deg,#60a5fa,#2563eb);color:#fff;box-shadow:0 4px 0 #1e3a8a';
    b.onclick = () => share(b); acts.insertBefore(b, acts.firstChild.nextSibling);
  }
  window.KHShareCard = { draw, share };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
