// লাইভ স্কোর: জেতার আনুমানিক সম্ভাবনা আর রান রেটের হিসাব।
// কোনো API লাগে না, শুধু স্কোর থেকে হিসাব। এটা আন্দাজ, নিশ্চিত ভবিষ্যদ্বাণী নয়।
const bn = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const sig = x => 1 / (1 + Math.exp(-x));
const balls = o => { const n = Number(o) || 0; const f = Math.floor(n); return f * 6 + Math.round((n - f) * 10); };

export function maxOvers(m) {
  const f = String(m.fmt || '').toLowerCase();
  if (f === 't20' || /টি-টোয়েন্টি/.test(m.label || '')) return 20;
  if (f === 'odi' || /ওয়ানডে/.test(m.label || '')) return 50;
  if (f === 't10') return 10;
  if (f === 'test' || m.test) return 0;
  return 0;
}

// ক্রিকেট (সীমিত ওভার) আর ফুটবলের জন্য { a, b, d } (০-১), না পারলে null
export function winProb(m) {
  if (m.state !== 'live' || m.pause || /stumps/i.test(m.raw || '')) return null;
  if (m.sport === 'football') {
    const min = Math.min(90, m.min || (m.per === 'HT' ? 45 : 0));
    const left = Math.max(0, 90 - min) / 90;
    const la = 1.35 * left, lb = 1.15 * left; // বাকি সময়ে গড়ে কত গোল হতে পারে
    const P = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
    let a = 0, b = 0, d = 0;
    const ga = m.a.g || 0, gb = m.b.g || 0;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
      const p = P(la, i) * P(lb, j), x = ga + i, y = gb + j;
      if (x > y) a += p; else if (y > x) b += p; else d += p;
    }
    const t = a + b + d || 1;
    return { a: a / t, b: b / t, d: d / t };
  }
  const mo = maxOvers(m);
  const inns = m.inns || [];
  if (!mo || !inns.length) return null;
  const par = mo === 20 ? 165 : mo === 50 ? 280 : 95;
  const base = mo === 20 ? 8.2 : mo === 50 ? 5.6 : 10;
  const cur = inns[inns.length - 1];
  const bLeft = Math.max(0, mo * 6 - balls(cur.o));
  const wLeft = Math.max(0, 10 - cur.w);
  const wf = Math.pow(Math.min(1, (wLeft + 2) / 8), 0.6);
  const crr = balls(cur.o) ? cur.r / (balls(cur.o) / 6) : base;
  // শেষের ওভারগুলোতে সাধারণত রান বেশি ওঠে
  const late = bLeft <= (mo === 50 ? 60 : mo === 20 ? 30 : 12);
  const b2 = late ? base * 1.18 : base;
  // শুরুর দিকের রান রেট কম বিশ্বাস করি (কয়েক বলের ঝড় দিয়ে পুরো খেলা বোঝা যায় না)
  const wc = 0.5 * Math.min(1, balls(cur.o) / (mo * 3));
  const rate = (wc * crr + (1 - wc) * b2) * wf;
  let pBat;
  if (inns.length === 1) {
    const proj = cur.r + rate * bLeft / 6;
    pBat = sig((proj - par) / (par * 0.11));
  } else {
    const target = inns[0].r + 1, need = target - cur.r;
    if (need <= 0) pBat = 1;
    else if (!wLeft || !bLeft) pBat = 0;
    else { const cap = rate * bLeft / 6; pBat = sig((cap - need) / Math.max(5, Math.sqrt(bLeft) * 1.7)); }
  }
  pBat = Math.min(0.99, Math.max(0.01, pBat));
  return cur.side === 'a' ? { a: pBat, b: 1 - pBat, d: 0 } : { a: 1 - pBat, b: pBat, d: 0 };
}

// রান রেটের ছোট হিসাব (ক্রিকেট, সীমিত ওভার)
export function rates(m) {
  if (m.sport !== 'cricket' || m.state !== 'live') return [];
  const mo = maxOvers(m), inns = m.inns || [];
  if (!inns.length) return [];
  const cur = inns[inns.length - 1], b = balls(cur.o);
  const out = [];
  const crr = b ? cur.r / (b / 6) : 0;
  out.push(['রান রেট', bn(crr.toFixed(2))]);
  if (mo && inns.length === 1) out.push(['সম্ভাব্য স্কোর', bn(Math.round(cur.r + crr * (mo * 6 - b) / 6))]);
  if (mo && inns.length >= 2) {
    const need = inns[0].r + 1 - cur.r, left = mo * 6 - b;
    if (need > 0 && left > 0) { out.push(['দরকারি রান রেট', bn((need / (left / 6)).toFixed(2))]); out.push(['বাকি', `${bn(left)} বলে ${bn(need)} রান`]); }
  }
  if (!mo && inns.length >= 2) {
    const own = side => inns.filter(i => i.side === side).reduce((s, i) => s + i.r, 0);
    const d = own(cur.side) - own(cur.side === 'a' ? 'b' : 'a');
    out.push([d >= 0 ? 'এগিয়ে' : 'পিছিয়ে', `${bn(Math.abs(d))} রান`]);
  }
  out.push(['উইকেট বাকি', bn(Math.max(0, 10 - cur.w))]);
  return out;
}

// ওভার/আন্ডার (আনুমানিক): ফুটবলে ২.৫ গোলের বেশি হওয়ার সম্ভাবনা, ক্রিকেটে প্রথম ইনিংসে একটা রানের সীমা পার হওয়ার সম্ভাবনা
const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
const ncdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
export function overUnder(m) {
  const out = [];
  if (m.sport === 'football') {
    let have = (m.a.g || 0) + (m.b.g || 0), lam;
    if (m.state === 'live') lam = 2.5 * Math.max(0, 90 - Math.min(90, m.min || (m.per === 'HT' ? 45 : 0))) / 90;
    else if (m.state === 'upcoming') { have = 0; lam = m.pred && m.pred.la != null ? m.pred.la + m.pred.lb : m.pred && m.pred.gh != null && m.pred.ga != null ? m.pred.gh + m.pred.ga : 2.6; }
    else return out;
    for (const line of [1.5, 2.5, 3.5]) {
      if (have > line) continue;
      let under = 0; for (let k = 0; k + have <= line; k++) under += pois(lam, k);
      out.push([`${bn(line)}-এর বেশি গোল`, Math.round((1 - under) * 100)]);
    }
  } else if (m.sport === 'cricket' && m.state === 'live' && !m.pause) {
    const mo = maxOvers(m), inns = m.inns || [];
    if (!mo || inns.length !== 1) return out;
    const cur = inns[0], b = balls(cur.o), left = mo * 6 - b;
    if (!left) return out;
    const crr = b ? cur.r / (b / 6) : 0;
    const base = mo === 20 ? 8.2 : mo === 50 ? 5.6 : 10;
    const wf = Math.pow(Math.min(1, (10 - cur.w + 2) / 8), 0.6);
    const proj = cur.r + (0.5 * crr + 0.5 * base) * wf * left / 6;
    const sd = Math.max(6, Math.sqrt(left) * 2.2);
    const line = Math.round(proj / 5) * 5 + 0.5;
    out.push([`${bn(Math.floor(line))}-এর বেশি রান`, Math.round((1 - ncdf((line - proj) / sd)) * 100)]);
  }
  return out;
}

// ফুটবল: খেলার কোন ১৫ মিনিটে সাধারণত কত ভাগ গোল হয় (শেষের দিকে বেশি)
const SLOT = [0.13, 0.15, 0.16, 0.16, 0.19, 0.21];
const SLOT_T = ['০-১৫', '১৫-৩০', '৩০-৪৫', '৪৫-৬০', '৬০-৭৫', '৭৫-৯০'];
// এখন থেকে খেলার শেষ পর্যন্ত গোলের কত ভাগ বাকি
function leftShare(min) {
  let s = 0;
  for (let i = 0; i < 6; i++) { const a = i * 15, b = a + 15; if (min <= a) s += SLOT[i]; else if (min < b) s += SLOT[i] * (b - min) / 15; }
  return s;
}
// কখন কী হতে পারে: পরের/প্রথম গোল, দুই দলই গোল, প্রথমার্ধে গোল, কোন সময়ে গোল বেশি, সম্ভাব্য ফল।
// খেলাঘরের হিসাবের গোল (pred.la, pred.lb) লাগে; না থাকলে null
export function fbOutlook(m) {
  const p = m.pred;
  if (m.sport !== 'football' || !p || p.la == null || !['live', 'upcoming'].includes(m.state)) return null;
  const live = m.state === 'live';
  const min = live ? Math.min(90, m.min || (m.per === 'HT' ? 45 : 0)) : 0;
  const fr = leftShare(min);
  const la = p.la * fr, lb = p.lb * fr, lt = la + lb;
  const ga = live ? m.a.g || 0 : 0, gb = live ? m.b.g || 0 : 0;
  const any = 1 - Math.exp(-lt);
  const out = { live, n: p.n, next: { a: lt ? la / lt * any : 0, b: lt ? lb / lt * any : 0, none: 1 - any } };
  out.btts = (ga ? 1 : 1 - Math.exp(-la)) * (gb ? 1 : 1 - Math.exp(-lb));
  if (min < 45) out.half = 1 - Math.exp(-(p.la + p.lb) * (leftShare(min) - leftShare(45)));
  out.slots = SLOT.map((s, i) => {
    const a = i * 15; if (a + 15 <= min) return null;
    const part = min > a ? s * (a + 15 - min) / 15 : s;
    return [SLOT_T[i], 1 - Math.exp(-(p.la + p.lb) * part)];
  }).filter(Boolean);
  const sc = [];
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) sc.push([ga + i, gb + j, pois(la, i) * pois(lb, j) * (ga + i === gb + j ? 1.08 : 1)]);
  const tot = sc.reduce((t, x) => t + x[2], 0);
  out.scores = sc.sort((x, y) => y[2] - x[2]).slice(0, 3).map(([x, y, q]) => [x, y, q / tot]);
  return out;
}
// বেশি/কম গোলের সম্ভাবনা (মোট গোল line-এর বেশি)
export function overProb(m, line) {
  const p = m.pred; if (!p || p.la == null) return null;
  const lt = p.la + p.lb; let under = 0;
  for (let k = 0; k <= line; k++) under += pois(lt, k);
  return 1 - under;
}
