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
  const rate = (0.5 * crr + 0.5 * b2) * wf;
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
