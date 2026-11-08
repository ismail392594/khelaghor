// খেলাঘরের ছোট দাবা ইঞ্জিন: ১০×১২ মেইলবক্স বোর্ড, সব নিয়ম (ক্যাসলিং, আঁ পাসঁ, প্রমোশন), আলফা-বিটা + কুইয়েসেন্স
// বর্গ: 21 (a8) ... 98 (h1); সাদা বড় হাতের অক্ষর (PNBRQK), কালো ছোট হাতের
const N = -10, S = 10, E = 1, W = -1;
const DIRS = { N: [N + N + E, N + N + W, S + S + E, S + S + W, E + E + N, E + E + S, W + W + N, W + W + S], B: [N + E, N + W, S + E, S + W], R: [N, S, E, W], Q: [N, S, E, W, N + E, N + W, S + E, S + W], K: [N, S, E, W, N + E, N + W, S + E, S + W] };
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
// বর্গের মান (সাদার দৃষ্টিতে, a8 থেকে h1 সারি ধরে)
const PST = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
};
export const sq64 = s => { const r = Math.floor(s / 10) - 2, f = s % 10 - 1; return r * 8 + f; }; // ০ = a8
export const sq120 = i => (Math.floor(i / 8) + 2) * 10 + (i % 8) + 1;
export const sqName = s => 'abcdefgh'[s % 10 - 1] + (10 - Math.floor(s / 10));
const isW = p => p >= 'A' && p <= 'Z', isB = p => p >= 'a' && p <= 'z' && p !== 'x';
export function newGame() {
  const b = Array(120).fill('x'), rows = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) b[(r + 2) * 10 + f + 1] = rows[r][f];
  return { b, side: 'w', castle: 'KQkq', ep: 0, half: 0, hist: [] };
}
const own = (p, side) => side === 'w' ? isW(p) : isB(p);
const enemy = (p, side) => side === 'w' ? isB(p) : isW(p);
export function attacked(b, sq, bySide) {
  // bySide-এর কোনো ঘুঁটি sq আক্রমণ করছে কিনা
  const up = bySide === 'w' ? 1 : -1, P = bySide === 'w' ? 'P' : 'p', Nn = bySide === 'w' ? 'N' : 'n', Bb = bySide === 'w' ? 'B' : 'b', Rr = bySide === 'w' ? 'R' : 'r', Qq = bySide === 'w' ? 'Q' : 'q', Kk = bySide === 'w' ? 'K' : 'k';
  if (b[sq + 10 * up + 1] === P || b[sq + 10 * up - 1] === P) return true;
  for (const d of DIRS.N) if (b[sq + d] === Nn) return true;
  for (const d of DIRS.K) if (b[sq + d] === Kk) return true;
  for (const d of DIRS.B) { let t = sq + d; while (b[t] === '.') t += d; if (b[t] === Bb || b[t] === Qq) return true; }
  for (const d of DIRS.R) { let t = sq + d; while (b[t] === '.') t += d; if (b[t] === Rr || b[t] === Qq) return true; }
  return false;
}
const kingSq = (b, side) => b.indexOf(side === 'w' ? 'K' : 'k');
export const inCheck = g => attacked(g.b, kingSq(g.b, g.side), g.side === 'w' ? 'b' : 'w');
function pseudo(g, capsOnly) {
  const b = g.b, side = g.side, mv = [], fwd = side === 'w' ? N : S, start = side === 'w' ? 8 : 3, promoRow = side === 'w' ? 2 : 9;
  for (let s = 21; s <= 98; s++) {
    const p = b[s]; if (!own(p, side)) continue; const t = p.toUpperCase();
    if (t === 'P') {
      const one = s + fwd;
      if (!capsOnly && b[one] === '.') { push(mv, s, one, Math.floor(one / 10) === promoRow); if (Math.floor(s / 10) === start && b[one + fwd] === '.') mv.push({ f: s, t: one + fwd, dbl: 1 }); }
      for (const c of [fwd + 1, fwd - 1]) { const to = s + c; if (enemy(b[to], side)) push(mv, s, to, Math.floor(to / 10) === promoRow, b[to]); else if (to === g.ep) mv.push({ f: s, t: to, ep: 1, cap: side === 'w' ? 'p' : 'P' }); }
      continue;
    }
    const slide = t === 'B' || t === 'R' || t === 'Q';
    for (const d of DIRS[t]) { let to = s + d; while (b[to] !== 'x') { if (b[to] === '.') { if (!capsOnly) mv.push({ f: s, t: to }); } else { if (enemy(b[to], side)) mv.push({ f: s, t: to, cap: b[to] }); break; } if (!slide) break; to += d; } }
    if (t === 'K' && !capsOnly) { // ক্যাসলিং
      const opp = side === 'w' ? 'b' : 'w', r = side === 'w' ? 90 : 20, K = side === 'w' ? 'K' : 'k', Q = side === 'w' ? 'Q' : 'q';
      if (s === r + 5 && !attacked(b, s, opp)) {
        if (g.castle.includes(K) && b[r + 6] === '.' && b[r + 7] === '.' && !attacked(b, r + 6, opp) && !attacked(b, r + 7, opp)) mv.push({ f: s, t: r + 7, castle: 'K' });
        if (g.castle.includes(Q) && b[r + 4] === '.' && b[r + 3] === '.' && b[r + 2] === '.' && !attacked(b, r + 4, opp) && !attacked(b, r + 3, opp)) mv.push({ f: s, t: r + 3, castle: 'Q' });
      }
    }
  }
  return mv;
  function push(arr, f, t, promo, cap) { if (promo) for (const q of ['Q', 'N', 'R', 'B']) arr.push({ f, t, promo: side === 'w' ? q : q.toLowerCase(), cap }); else arr.push({ f, t, cap }); }
}
export function make(g, m) {
  const b = g.b.slice(), p = b[m.f], side = g.side; let castle = g.castle, ep = 0, half = g.half + 1;
  b[m.t] = m.promo || p; b[m.f] = '.';
  if (m.ep) b[m.t + (side === 'w' ? S : N)] = '.';
  if (m.dbl) ep = m.f + (side === 'w' ? N : S);
  if (m.castle) { const r = side === 'w' ? 90 : 20, R = side === 'w' ? 'R' : 'r'; if (m.castle === 'K') { b[r + 8] = '.'; b[r + 6] = R; } else { b[r + 1] = '.'; b[r + 4] = R; } }
  if (p === 'K') castle = castle.replace('K', '').replace('Q', ''); if (p === 'k') castle = castle.replace('k', '').replace('q', '');
  for (const [sq, c] of [[98, 'K'], [91, 'Q'], [28, 'k'], [21, 'q']]) if (m.f === sq || m.t === sq) castle = castle.replace(c, '');
  if (p.toUpperCase() === 'P' || m.cap) half = 0;
  return { b, side: side === 'w' ? 'b' : 'w', castle, ep, half, hist: g.hist };
}
export function legalMoves(g, capsOnly) { return pseudo(g, capsOnly).filter(m => { const n = make(g, m); return !attacked(n.b, kingSq(n.b, g.side), n.side); }); }
const CD = i => { const r = Math.floor(i / 8), f = i % 8; return Math.max(3 - r, r - 4) + Math.max(3 - f, f - 4); }; // কেন্দ্র থেকে দূরত্ব (০-৬)
export function evaluate(g) {
  let v = 0, bishops = { w: 0, b: 0 }, mat = { w: 0, b: 0 }, kw = 0, kb = 0;
  for (let i = 0; i < 64; i++) {
    const s = sq120(i), p = g.b[s]; if (p === '.') continue; const t = p.toUpperCase();
    if (t === 'K') { if (isW(p)) kw = i; else kb = i; continue; }
    if (isW(p)) { v += VAL[t] + PST[t][i]; if (t === 'B') bishops.w++; if (t !== 'P') mat.w += VAL[t]; }
    else { v -= VAL[t] + PST[t][(7 - Math.floor(i / 8)) * 8 + i % 8]; if (t === 'B') bishops.b++; if (t !== 'P') mat.b += VAL[t]; }
  }
  if (bishops.w >= 2) v += 30; if (bishops.b >= 2) v -= 30;
  const end = mat.w + mat.b <= 1700;
  if (!end) { v += PST.K[kw] - PST.K[(7 - Math.floor(kb / 8)) * 8 + kb % 8]; }
  else {
    // শেষ পর্যায়: রাজা মাঝে আসবে; এগিয়ে থাকা পক্ষ প্রতিপক্ষের রাজাকে কোণে ঠেলবে
    v += (CD(kb) - CD(kw)) * 8;
    const diff = v, kd = Math.abs(Math.floor(kw / 8) - Math.floor(kb / 8)) + Math.abs(kw % 8 - kb % 8);
    if (diff > 250) v += CD(kb) * 12 + (14 - kd) * 5; else if (diff < -250) v -= CD(kw) * 12 + (14 - kd) * 5;
  }
  return g.side === 'w' ? v : -v;
}
export const posKey = g => g.b.join('') + g.side + g.castle + g.ep;
const mvv = m => (m.cap ? VAL[m.cap.toUpperCase()] * 10 : 0) + (m.promo ? 800 : 0);
let nodes = 0;
function quiesce(g, a, b, d) {
  nodes++; const stand = evaluate(g); if (stand >= b) return b; if (a < stand) a = stand; if (d <= 0) return a;
  const mv = legalMoves(g, true).sort((x, y) => mvv(y) - mvv(x));
  for (const m of mv) { const v = -quiesce(make(g, m), -b, -a, d - 1); if (v >= b) return b; if (v > a) a = v; }
  return a;
}
function negamax(g, d, a, b, ply) {
  nodes++;
  const mv = legalMoves(g); if (!mv.length) return inCheck(g) ? -100000 + ply : 0;
  if (g.half >= 100) return 0;
  if (d <= 0) return quiesce(g, a, b, 4);
  mv.sort((x, y) => mvv(y) - mvv(x));
  for (const m of mv) { const v = -negamax(make(g, m), d - 1, -b, -a, ply + 1); if (v >= b) return b; if (v > a) a = v; }
  return a;
}
// সেরা চাল: depth অনুযায়ী, noise দিয়ে সহজ লেভেলে ভুল
export function bestMove(g, depth, noise = 0, seen) {
  nodes = 0; const mv = legalMoves(g); if (!mv.length) return null;
  mv.sort((x, y) => mvv(y) - mvv(x));
  let best = null, bv = -1e9;
  for (const m of mv) {
    const n = make(g, m); let v = seen && seen.get(posKey(n)) ? 0 : -negamax(n, depth - 1, -1e9, noise ? 1e9 : -bv + 1, 1); // আগের অবস্থান ফিরলে ড্র ধরা
    v += noise ? (Math.random() - .5) * noise : 0; if (v > bv) { bv = v; best = m; }
  }
  return best;
}
export function status(g) {
  const mv = legalMoves(g);
  if (!mv.length) return inCheck(g) ? 'mate' : 'stalemate';
  if (g.half >= 100) return 'fifty';
  const pcs = g.b.filter(p => p !== 'x' && p !== '.' && p.toUpperCase() !== 'K');
  if (!pcs.length || (pcs.length === 1 && 'NBnb'.includes(pcs[0]))) return 'material';
  return inCheck(g) ? 'check' : 'ok';
}
export const getNodes = () => nodes;
export function fromFEN(f) {
  const [pos, side, castle, ep, half] = f.split(' '), b = Array(120).fill('x'); let r = 0, c = 0;
  for (const ch of pos) { if (ch === '/') { r++; c = 0; } else if (/\d/.test(ch)) { for (let k = 0; k < +ch; k++) b[(r + 2) * 10 + (c++) + 1] = '.'; } else b[(r + 2) * 10 + (c++) + 1] = ch; }
  const epSq = ep && ep !== '-' ? (10 - +ep[1] + 2 - 2 + 2) * 10 - 10 + 'abcdefgh'.indexOf(ep[0]) + 1 : 0;
  return { b, side, castle: castle === '-' ? '' : castle, ep: epSq, half: +half || 0, hist: [] };
}
