// খেলাঘরের নিজের ফুটবল পূর্বাভাস (বিনামূল্যে, কোনো বাড়তি API ডাক ছাড়া)।
// প্রতিদিন যে খেলাগুলোর ফল আমাদের তালিকায় আসে, সেগুলো থেকে প্রতিটা দলের "শক্তির নম্বর" (Elo) শেখা হয়।
// জিতলে নম্বর বাড়ে, হারলে কমে, বড় ব্যবধানে বেশি। দুই দলের নম্বরের পার্থক্য থেকে সম্ভাব্য গোল,
// আর সেখান থেকে জয়-ড্র-হার, বেশি/কম গোল, কে আগে গোল করবে ইত্যাদির সম্ভাবনা।
// Firestore: liveElo/fb = { r: { 'f<দলের id>': [নম্বর, কত খেলা] }, seen: { '<ম্যাচ id>': দিন }, bf: [আগের যে দিনগুলো পড়া হয়েছে] }

const HOME = 55;      // নিজের মাঠের সুবিধা (নম্বরে)
const K = 22;         // প্রতি খেলায় কতটা বদলায়
const BASE = 2.6;     // গড়ে এক খেলায় মোট গোল
const PER100 = 0.42;  // ১০০ নম্বর বেশি মানে গড়ে কত গোল বেশি

const keyOf = t => (t && t.tid ? 'f' + t.tid : null);
const startOf = m => (m.rk >= 3 ? 1650 : m.intl ? 1600 : 1500);

// নতুন শেষ হওয়া খেলাগুলো দিয়ে নম্বর হালনাগাদ। বদলালে true
export function learn(E, list, day) {
  E.r = E.r || {}; E.seen = E.seen || {};
  let ch = false;
  const done = list.filter(m => m && m.sport === 'football' && m.state === 'done' && m.a.g != null && m.b.g != null && m.result !== 'void' && !E.seen[m.id])
    .sort((x, y) => x.start - y.start);
  for (const m of done) {
    const ka = keyOf(m.a), kb = keyOf(m.b);
    E.seen[m.id] = day;
    if (!ka || !kb) continue;
    const ra = E.r[ka] || [startOf(m), 0], rb = E.r[kb] || [startOf(m), 0];
    const ea = 1 / (1 + Math.pow(10, (rb[0] - ra[0] - HOME) / 400));
    // টাইব্রেকারে জিতলেও মূল খেলাটা ড্র ধরা হয়
    const sa = m.a.g > m.b.g ? 1 : m.a.g < m.b.g ? 0 : 0.5;
    const gd = Math.abs(m.a.g - m.b.g);
    const mult = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8;
    // নতুন দলের নম্বর দ্রুত ঠিক জায়গায় যায়
    const ka2 = K * mult * (ra[1] < 5 ? 1.6 : 1), kb2 = K * mult * (rb[1] < 5 ? 1.6 : 1);
    E.r[ka] = [Math.round(ra[0] + ka2 * (sa - ea)), ra[1] + 1];
    E.r[kb] = [Math.round(rb[0] - kb2 * (sa - ea)), rb[1] + 1];
    ch = true;
  }
  return ch;
}

// পুরনো "দেখা হয়েছে" চিহ্ন মুছে জায়গা বাঁচানো
export function prune(E, today) {
  const cut = new Date(Date.parse(today) - 6 * 864e5).toISOString().slice(0, 10);
  for (const [id, d] of Object.entries(E.seen || {})) if (d < cut) delete E.seen[id];
}

const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };

// এক ম্যাচের পূর্বাভাস: { a, d, b, la, lb, n, src:'elo' }; n = দুই দলের মধ্যে কম খেলা দলের খেলার সংখ্যা (কতটা ভরসা)
export function model(E, m) {
  const ka = keyOf(m.a), kb = keyOf(m.b);
  if (!ka || !kb) return null;
  const ra = (E.r || {})[ka] || [startOf(m), 0], rb = (E.r || {})[kb] || [startOf(m), 0];
  const n = Math.min(ra[1], rb[1]);
  const trust = Math.min(1, 0.35 + n / 8);
  const sup = (ra[0] + HOME - rb[0]) / 100 * PER100 * trust;
  const la = Math.max(0.2, BASE / 2 + sup / 2), lb = Math.max(0.2, BASE / 2 - sup / 2);
  let a = 0, d = 0, b = 0;
  for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) {
    const p = pois(la, i) * pois(lb, j) * (i === j ? 1.12 : 1);
    if (i > j) a += p; else if (i < j) b += p; else d += p;
  }
  const t = a + d + b;
  return { a: +(a / t).toFixed(3), d: +(d / t).toFixed(3), b: +(b / t).toFixed(3), la: +la.toFixed(2), lb: +lb.toFixed(2), n, src: 'elo' };
}
