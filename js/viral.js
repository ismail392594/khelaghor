// খেলাঘরের ভাইরাল ডায়লগ আর "জানেন কি?" শিক্ষামূলক টিপস: হাব আর সব গেমে একই তালিকা।
// গেমে: KHViral.pop() একটা মজার ডায়লগ বুদবুদে দেখায় আর পড়ে শোনায়; KHViral.tip('jam') একটা শিক্ষামূলক কথা দেয়।
(function () {
window.KH_DLG=[
 ['ভাই, ২ কিলো রাস্তা, ২ ঘণ্টা লাগল। এর চেয়ে হাঁটলে চাকরি বাঁচত!','ঢাকা জ্যাম রানার'],
 ['ওস্তাদ বামে চাপান, আরো দুইজন উঠব, পিছনে খালি!','লোকাল বাস হেলপার'],
 ['পেঁয়াজের দাম শুনে চোখে পানি, কাটার আগেই!','বাজার দর চ্যালেঞ্জ'],
 ['কারেন্ট আসছে! সবাই চার্জার লাগা... গেল আবার!','লোডশেডিং সারভাইভাল'],
 ['এই মশা আমার রক্ত খাইছে, এখন আমার হাতের থাপ্পড় খাবে!','মশা মারো'],
 ['মামা যাবেন? ১০০ টাকা। এই রাস্তা তো আমি হেঁটেই চিনি!','রিকশা ভাড়া দরদাম'],
 ['দরজা বন্ধ হইতেছে! ব্যাগ ভিতরে, আমি বাইরে!','মেট্রোরেল রাশ'],
 ['মামা আরেকটু টক দেন, ঝাল কম... না না, ঝাল বেশি!','ফুচকা মাস্টার'],
 ['আমি বরপক্ষ না কনেপক্ষ? যেই পক্ষে রোস্ট বেশি!','বিয়েবাড়ির বিরিয়ানি'],
 ['ভাই গরুর নাম কী? শাহেনশাহ! দামটাও শাহেনশাহ!','কোরবানির হাট'],
 ['এইটা রাস্তা না নদী? নৌকা আনতাম!','জলাবদ্ধতা রাইড'],
 ['আর ৫ মিনিট রিলস দেখি... সকাল হয়ে গেল!','পরীক্ষার আগের রাত'],
 ['ঘরে যা বাবা, আবার ছক্কা তুলে আয়!','লুডু'],
 ['ভোকাট্টা! নাটাই নিয়া বাসায় যাও!','ঘুড়ি কাটাকাটি'],
 ['দম ফুরাইছে ভাই, কিন্তু ইজ্জত ফুরায় নাই!','হাডুডু'],
 ['তোর মেসি আমার নেইমারের পায়ের ধুলা!','আর্জেন্টিনা বনাম ব্রাজিল'],
 ['আপা আমি গেটে, গেট কোনটা? সব গেট একরকম!','ডেলিভারি রাইডার'],
 ['৫ বছরের অভিজ্ঞতা লাগবে, বয়স ২২। আমি কি মায়ের পেট থেকে কাজ শুরু করব?','ইন্টারভিউ সারভাইভাল'],
 ['ডাল সিদ্ধ হয় নাই, গ্যাস বিদায় নিল!','গ্যাস সিলিন্ডার মিশন'],
 ['আমি না পড়েই শেয়ার দিছি, কারণ শিরোনাম জোস ছিল!','ফেসবুক কমেন্ট যোদ্ধা'],
 ['হারছেন তো কী হইছে, কাল আবার আসবেন, কয়েন রেডি থাকবে!','খেলাঘর']
];
window.KH_DLG18=[
 ['বিয়ের আগে বলছিল চাঁদ এনে দিবে, বিয়ের পর বলে বাজার থেকে আলুটা নিয়া আসো।','সংসার জীবন'],
 ['বেতন আসে ১ তারিখে, চলে যায় ২ তারিখে, বাকি ২৮ দিন আমি শুধু অভিনয় করি।','চাকরিজীবী'],
 ['বউ বলে "কিছু না"। এই কিছু না-র মানে বুঝতে আমার ৫ বছর লাগছে, এখনো শিখতেছি।','সংসার জীবন'],
 ['বস বলে "একটু থাকো"। ওই একটু শেষ হয় রাত ১০টায়।','অফিস'],
 ['এক্স ফোন দিয়া বলে "কেমন আছো?" আগে কই ছিলা যখন আমার ডাটা প্যাক শেষ ছিল?','প্রেম-ছ্যাঁকা'],
 ['ক্রাশের বিয়ের দাওয়াত পাইছি। রোস্টটা অন্তত ভালো হইলে কষ্ট কম পাইতাম।','প্রেম-ছ্যাঁকা'],
 ['সংসার মানে রিমোট আমার হাতে, কিন্তু চ্যানেল চলবে বউয়ের পছন্দে।','সংসার জীবন'],
 ['ব্যাচেলর লাইফ: সকালে ডিম ভাজি, রাতে ডিম ভাজি, আর মা ফোনে বলে "ঠিকমতো খাস তো?"','ব্যাচেলর'],
 ['বিয়ের পর ওজন বাড়ছে কেন? শাশুড়ির ভালোবাসা প্রতি বেলা ৩ প্লেট।','শ্বশুরবাড়ি'],
 ['প্রেমিকা বলছিল তোমার জন্য জান দিতে পারি। রেস্টুরেন্টের বিল আসতেই বলে আজ তুমি দাও না!','প্রেম'],
 ['অফিসের মিটিং: ১ ঘণ্টা আলোচনা, সিদ্ধান্ত হলো পরের মিটিংয়ে দেখা যাবে।','অফিস'],
 ['রাত ২টায় ফ্রিজ খুলি, কিছু খাই না, শুধু তাকাই। এইটাই আমার ডেট নাইট।','ব্যাচেলর'],
 ['শ্বশুরবাড়িতে জামাই আদর ৩ দিন। ৪ নম্বর দিনে শাশুড়ি বলে, বাবা বাজারটা একটু করে দিবা?','শ্বশুরবাড়ি'],
 ['ঘটক বলছিল ছেলে সরকারি চাকরি করে। পরে জানলাম সরকারি অফিসের সামনে চায়ের দোকান।','বিয়ের বাজার'],
 ['বন্ধুরা সবাই বিয়ে করে ফেলছে, আমি এখনো লুডুতে গুটি কাটতেছি।','সিঙ্গেল লাইফ'],
 ['বউয়ের সাথে ঝগড়ায় জিতছিলাম একবার, স্বপ্নে।','সংসার জীবন']
];

const TIPS = {
  jam: ['জানেন কি? লাল বাতিতে থামা শুধু মামলার ভয়ে না, মোড়ের বেশিরভাগ দুর্ঘটনা হয় বাতি না মানার কারণে।', 'জানেন কি? বাইকে চালক আর আরোহী দুজনেরই হেলমেট পরা নিয়ম, মাথার আঘাতই সবচেয়ে বিপজ্জনক।', 'জানেন কি? জেব্রা ক্রসিংয়ে পথচারীর আগে যাওয়ার অধিকার, গাড়িকে থামতে হয়।', 'জানেন কি? ভেজা রাস্তায় ব্রেক ধরতে বেশি জায়গা লাগে, তাই বৃষ্টিতে আস্তে চালান।', 'জানেন কি? মোড়ে ঘোরার আগে ইন্ডিকেটর দিলে পেছনের গাড়ি বুঝতে পারে, ধাক্কা কম হয়।'],
  mosha: ['জানেন কি? ডেঙ্গুর এডিস মশা জমে থাকা পরিষ্কার পানিতে ডিম পাড়ে, তাই ফুলের টব, টায়ার আর বালতির পানি ফেলে দিন।', 'জানেন কি? এডিস মশা সাধারণত দিনের বেলায়, বিশেষ করে সকাল আর বিকেলে কামড়ায়।', 'জানেন কি? জ্বরের সাথে শরীর ব্যথা আর চোখের পেছনে ব্যথা হলে ডেঙ্গু পরীক্ষা করান, নিজে নিজে ব্যথার ওষুধ খাবেন না।', 'জানেন কি? মশারি টানিয়ে ঘুমানো সবচেয়ে সস্তা আর নিরাপদ মশা থেকে বাঁচার উপায়।'],
  bazar: ['জানেন কি? প্যাকেটের জিনিস কেনার আগে মেয়াদ আর সর্বোচ্চ খুচরা মূল্য (MRP) দেখে নিন।', 'জানেন কি? ওজনে কম দিলে বা ভেজাল পেলে ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে অভিযোগ করা যায়।', 'জানেন কি? টাটকা মাছের কানকো লাল আর চোখ চকচকে থাকে, চাপ দিলে শরীর শক্ত লাগে।', 'জানেন কি? বাজারের ফর্দ আগে লিখে নিলে অপ্রয়োজনীয় খরচ অনেক কমে।'],
  ludo: ['জানেন কি? লুডু ভারতের প্রাচীন খেলা "পাচিসি" থেকে এসেছে, শত শত বছরের পুরনো।', 'জানেন কি? ছক্কায় ৬ ওঠার সম্ভাবনা প্রতি চালে ৬ ভাগের ১ ভাগ, তাই ধৈর্য ধরলেই আসবে!', 'জানেন কি? খেলায় হারজিত থাকবেই, বন্ধুর সাথে হাসিমুখে খেলাটাই আসল জয়।']
};
let box = null, hideT = 0;
function pop(text, who, title, byUser) {
  const L = window.KH_DLG || []; if (!text) { const d = L[Math.floor(Math.random() * L.length)]; if (!d) return; text = d[0]; }
  if (!box) { box = document.createElement('div'); box.className = 'khViral'; box.setAttribute('role', 'status'); document.body.appendChild(box);
    const st = document.createElement('style'); st.textContent = '.khViral{position:fixed;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:30;max-width:min(92vw,420px);background:#fff;color:#1d1640;border-radius:18px;padding:10px 14px;font:700 .95rem "Noto Sans Bengali",sans-serif;line-height:1.4;box-shadow:0 10px 26px rgba(0,0,0,.4);pointer-events:none;opacity:0;transition:opacity .25s,transform .25s}.khViral.on{opacity:1;transform:translateX(-50%) translateY(-6px)}.khViral small{display:block;color:#7a70b8;font-size:.7rem;margin-bottom:2px}'; document.head.appendChild(st); }
  box.innerHTML = '<small></small>'; box.querySelector('small').textContent = title || '😂 ভাইরাল ডায়লগ'; box.appendChild(document.createTextNode(text));
  box.classList.add('on'); clearTimeout(hideT); hideT = setTimeout(() => box.classList.remove('on'), Math.max(3500, text.length * 90));
  if (window.KHVoice) window.KHVoice.say(text, true, who, byUser);
}
function tip(game) { const t = TIPS[game] || []; return t[Math.floor(Math.random() * t.length)] || ''; }
// "💬 কথা বলুন": খেলোয়াড় চাপলেই শুধু কথা হয়। opts: { lines, who, host (বোতাম কোথায় বসবে, না দিলে নিচে বামে ভাসমান), onSay(text) }
function chat(opts) {
  if (!document.getElementById('khChatCss')) { const st = document.createElement('style'); st.id = 'khChatCss'; st.textContent = '.khChatBtn{border:0;border-radius:999px;padding:8px 14px;font:800 .9rem "Baloo Da 2","Noto Sans Bengali",sans-serif;background:#fff;color:#1d1640;box-shadow:0 4px 0 rgba(0,0,0,.25);cursor:pointer;white-space:nowrap}.khChatBtn.float{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:25}.khChatPanel{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(120px + env(safe-area-inset-bottom,0px));z-index:40;width:min(94vw,440px);max-height:50vh;overflow:auto;background:rgba(20,16,48,.96);border-radius:20px;padding:12px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;box-shadow:0 14px 34px rgba(0,0,0,.5)}.khChatPanel b{width:100%;text-align:center;color:#fff;font:800 .95rem "Baloo Da 2",sans-serif}.khChatPanel button{border:0;border-radius:14px;padding:8px 11px;font:700 .86rem "Noto Sans Bengali",sans-serif;background:#fff;color:#1d1640;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.25)}.khChatPanel button.v{background:#ffd23f}.khChatPanel button.x{background:rgba(255,255,255,.15);color:#fff}'; document.head.appendChild(st); }
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'khChatBtn' + (opts.host ? '' : ' float'); btn.innerHTML = opts.label || '💬 কথা বলুন';
  (opts.host || document.body).appendChild(btn);
  let panel = null, lastAt = 0;
  const close = () => { if (panel) { panel.remove(); panel = null; } };
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.onclick = e => {
    e.stopPropagation(); if (panel) return close();
    panel = document.createElement('div'); panel.className = 'khChatPanel';
    panel.innerHTML = '<b>কী বলবেন?</b>' + opts.lines.map((l, i) => `<button type="button" data-i="${i}"></button>`).join('') + '<button type="button" class="v" data-v="1">🎲 ভাইরাল ডায়লগ</button><button type="button" class="x" data-x="1">✕ বন্ধ</button>';
    panel.querySelectorAll('[data-i]').forEach(b => b.textContent = opts.lines[+b.dataset.i]);
    panel.addEventListener('pointerdown', ev => ev.stopPropagation());
    panel.onclick = ev => {
      ev.stopPropagation(); const b = ev.target.closest('button'); if (!b) return; if (b.dataset.x) return close();
      if (Date.now() - lastAt < 1500) return; lastAt = Date.now();
      const L = window.KH_DLG || [], text = b.dataset.v ? (L[Math.floor(Math.random() * L.length)] || [''])[0] : opts.lines[+b.dataset.i];
      close(); if (!text) return;
      if (opts.onSay) opts.onSay(text); else pop(text, opts.who, '💬 আপনি বললেন', true);
    };
    document.body.appendChild(panel);
  };
  return { btn, close };
}
// কনফেটি (জয়, রেকর্ড)
function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
  document.body.appendChild(c); const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
  const cols = ['#ffd23f', '#ef4f5f', '#22c55e', '#3b78f0', '#ff7aa8', '#36d1c4', '#fff'];
  const P = Array.from({ length: n || 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .4, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6.3, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function f(t) { const k = (t - t0) / 1000; g.clearRect(0, 0, W, H); P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .05; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - Math.max(0, k - 2.2)); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); g.restore(); }); if (k < 3.3) requestAnimationFrame(f); else c.remove(); })(t0);
}
// কোনো জায়গায় ছোট বিস্ফোরণ (কণা)
function burst(x, y, color, n) {
  for (let i = 0; i < (n || 14); i++) { const d = document.createElement('i'), a = Math.PI * 2 * i / (n || 14), r = 40 + Math.random() * 40;
    d.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:8px;height:8px;margin:-4px;border-radius:50%;background:${color || '#ffd23f'};pointer-events:none;z-index:60;transition:transform .6s cubic-bezier(.1,.7,.3,1),opacity .6s`;
    document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(.3)`; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 650); }
}
window.KHViral = { pop, tip, TIPS, chat, confetti, burst };
})();
