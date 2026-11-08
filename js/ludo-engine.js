// খেলাঘর লুডু ইঞ্জিন: সব নিয়ম এক জায়গায়। সার্ভার (আসল খেলা) আর ফোন (অনুশীলন, ছবি আঁকা) দুটোই এটা ব্যবহার করে।
//
// নিয়ম (Ludo King ধাঁচে):
// - প্রত্যেকের ৪টা গুটি। ঘর থেকে বের হতে ৬ লাগে।
// - ৬ উঠলে আবার চাল। টানা তিনবার ৬ উঠলে সেই পালা বাতিল।
// - প্রতিপক্ষের গুটি কাটলে সেটা ঘরে ফেরে, আর আপনি আবার চাল পান।
// - তারকা আর শুরুর ঘর নিরাপদ, সেখানে কাটা যায় না।
// - নিজের রঙের রাস্তা দিয়ে মাঝখানে পৌঁছাতে ঠিক সংখ্যা লাগে। গুটি পৌঁছালে আবার চাল।
// - ৩০ সেকেন্ডে চাল না দিলে নিজে থেকে চাল হয় (সব মোডে); অনলাইনে টানা ৩ বার হলে খেলোয়াড় বাদ।
// - কেউ চারটা গুটি তুলে ফেললে খেলা শেষ। বাকিদের অবস্থান কে কতদূর এগিয়েছে তা দিয়ে।

export const START = [0, 13, 26, 39];          // লাল, সবুজ, হলুদ, নীল কোথা থেকে শুরু করে
export const STARS = [8, 21, 34, 47];
export const SAFE = new Set([...START, ...STARS]);
export const HOME = 56;                         // ০-৫০ বাইরের রাস্তা, ৫১-৫৫ নিজের রঙের রাস্তা, ৫৬ = পৌঁছে গেছে
export const TURN_MS = 30000;
export const AFK_LIMIT = 3;
export const COLOR_NAMES = ['লাল', 'সবুজ', 'হলুদ', 'নীল'];
// খেলার মাঝে দ্রুত কথা (সার্ভার শুধু এই তালিকার নম্বর নেয়, তাই কেউ খারাপ কথা পাঠাতে পারে না)
export const QUICK = ['ঘরে যা বাবা!', 'ছক্কা দে আল্লাহ!', 'কপাল খারাপ ভাই!', 'এইবার তোরে কাটমু!', 'জলদি চাল দেন মামা!', 'ভালো খেলছেন! 👍', 'হাহা, ধরা খাইলা!', 'চা খাইয়া আসি, খেলা চালাও', 'আমার গুটি ছুঁইবা না!', 'আজকে আমিই জিতমু!'];

export class LudoError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }

export const trackIdx = (color, v) => (v >= 0 && v <= 50 ? (START[color] + v) % 52 : -1);
const clone = o => JSON.parse(JSON.stringify(o));

/* নতুন খেলা। players: [{uid, name, username, cpu}] */
export function newGame(players, opts = {}) {
  const n = players.length;
  if (n < 2 || n > 4) throw new LudoError('bad-size', 'লুডু ২ থেকে ৪ জনে খেলা যায়');
  const colors = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  const pos = {};
  players.forEach((_, i) => { pos[i] = [-1, -1, -1, -1]; });
  return {
    status: 'playing',
    mode: opts.mode || 'online',
    entry: opts.entry || 0,
    players: players.map((p, i) => ({ uid: p.uid || null, name: p.name || ('খেলোয়াড় ' + (i + 1)), username: p.username || '', cpu: !!p.cpu, color: colors[i], out: false, afk: 0 })),
    uids: players.filter(p => p.uid).map(p => p.uid),
    pos, turn: 0, dice: 0, rolled: false, sixes: 0, movable: [],
    turnAt: opts.now || 0, seq: 0, log: [], result: null
  };
}

export function movableTokens(g, p, d) {
  return g.pos[p].map((v, i) => ((v < 0 ? d === 6 : v + d <= HOME) ? i : -1)).filter(i => i >= 0);
}
export const progress = (g, p) => g.pos[p].reduce((s, v) => s + (v + 1), 0);
const humansLeft = g => g.players.filter(p => !p.out && !p.cpu).length;
const activeLeft = g => g.players.map((p, i) => (p.out ? -1 : i)).filter(i => i >= 0);

function ev(g, e) {
  g.seq += 1; e.s = g.seq; g.log.push(e);
  if (g.log.length > 60) g.log = g.log.slice(-60);
}

function nextTurn(g, extra, now) {
  g.rolled = false; g.dice = 0; g.movable = [];
  if (!(extra && !g.players[g.turn].out)) {
    g.sixes = 0;
    const n = g.players.length;
    for (let k = 1; k <= n; k++) { const q = (g.turn + k) % n; if (!g.players[q].out) { g.turn = q; break; } }
  }
  g.turnAt = now;
  ev(g, { k: 'turn', p: g.turn });
}

function finish(g, winner) {
  const others = g.players.map((_, i) => i).filter(i => i !== winner);
  others.sort((a, b) => (g.players[a].out - g.players[b].out) || (progress(g, b) - progress(g, a)));
  g.status = 'finished'; g.rolled = false; g.movable = []; g.dice = 0;
  g.result = { ranks: [winner, ...others] };
  ev(g, { k: 'end', p: winner, ranks: g.result.ranks });
}

function checkLastStanding(g) {
  if (g.status !== 'playing') return true;
  const act = activeLeft(g);
  if (act.length === 1) { finish(g, act[0]); return true; }
  if (humansLeft(g) === 0) { // সব মানুষ চলে গেলে: সবচেয়ে এগিয়ে থাকা কম্পিউটার জেতে
    const best = act.sort((a, b) => progress(g, b) - progress(g, a))[0];
    finish(g, best); return true;
  }
  return false;
}

function doRoll(g, p, d, now) {
  ev(g, { k: 'roll', p, d });
  g.sixes = d === 6 ? g.sixes + 1 : 0;
  if (g.sixes >= 3) { ev(g, { k: 'skip', p, why: '3six' }); nextTurn(g, false, now); return; }
  const m = movableTokens(g, p, d);
  if (!m.length) { ev(g, { k: 'skip', p, why: 'nomove' }); nextTurn(g, false, now); return; }
  g.dice = d; g.rolled = true; g.movable = m;
  if (m.length === 1 || new Set(m.map(t => g.pos[p][t])).size === 1) doMove(g, p, m[0], now);
}

function doMove(g, p, t, now) {
  const from = g.pos[p][t], to = from < 0 ? 0 : from + g.dice;
  g.pos[p][t] = to;
  ev(g, { k: 'move', p, t, from, to });
  let captured = false;
  const ti = trackIdx(g.players[p].color, to);
  if (ti >= 0 && !SAFE.has(ti)) {
    g.players.forEach((q, qi) => {
      if (qi === p) return;
      g.pos[qi].forEach((v, vt) => {
        if (trackIdx(q.color, v) === ti) { g.pos[qi][vt] = -1; captured = true; ev(g, { k: 'cap', p, q: qi, t: vt }); }
      });
    });
  }
  const home = to === HOME;
  if (home) ev(g, { k: 'home', p, t });
  if (g.pos[p].every(v => v === HOME)) { finish(g, p); return; }
  nextTurn(g, g.dice === 6 || captured || home, now);
}

/* কম্পিউটারের বুদ্ধি: কাটা > ঘরে তোলা > বের করা > নিরাপদ ঘর > বিপদ এড়ানো > এগিয়ে যাওয়া */
export function aiPick(g, p) {
  const me = g.players[p];
  let best = g.movable[0], bs = -1e9;
  g.movable.forEach(t => {
    const v = g.pos[p][t], nv = v < 0 ? 0 : v + g.dice, ti = trackIdx(me.color, nv);
    let s = nv;
    const hits = ti >= 0 && !SAFE.has(ti) && g.players.some((q, qi) => qi !== p && g.pos[qi].some(x => trackIdx(q.color, x) === ti));
    if (hits) s += 120;
    if (nv === HOME) s += 90;
    if (v < 0) s += 70;
    if (ti >= 0 && SAFE.has(ti)) s += 25;
    if (nv > 50) s += 30;
    if (ti >= 0 && !SAFE.has(ti)) { // পেছনে ৬ ঘরের মধ্যে শত্রু থাকলে বিপদ
      const danger = g.players.some((q, qi) => qi !== p && g.pos[qi].some(x => { const xi = trackIdx(q.color, x); if (xi < 0) return false; const gap = (ti - xi + 52) % 52; return gap >= 1 && gap <= 6; }));
      if (danger) s -= 40;
    }
    const cur = trackIdx(me.color, v);
    if (cur >= 0 && !SAFE.has(cur)) { // এখন বিপদে থাকা গুটি সরানো ভালো
      const inDanger = g.players.some((q, qi) => qi !== p && g.pos[qi].some(x => { const xi = trackIdx(q.color, x); if (xi < 0) return false; const gap = (cur - xi + 52) % 52; return gap >= 1 && gap <= 6; }));
      if (inDanger) s += 35;
    }
    if (s > bs) { bs = s; best = t; }
  });
  return best;
}

function runCpu(g, rand, now) {
  let guard = 0;
  while (g.status === 'playing' && g.players[g.turn].cpu && guard++ < 400) {
    const p = g.turn;
    if (!g.rolled) doRoll(g, p, rand(), now);
    else doMove(g, p, aiPick(g, p), now);
  }
}

/* একটা কাজ চালানো। a = {type: 'roll'|'move'|'tick'|'leave', p, t}
   rand() = ১-৬ ছক্কা (সার্ভারে নিরাপদ র‍্যান্ডম)। বৈধ না হলে LudoError ছোড়ে। নতুন অবস্থা ফেরত দেয়। */
export function act(game, a, rand, now) {
  const g = clone(game);
  if (g.status !== 'playing') throw new LudoError('not-playing', 'খেলা চলছে না');
  const p = a.p, pl = g.players[p];
  if (!pl) throw new LudoError('not-player', 'আপনি এই খেলায় নেই');

  if (a.type === 'leave') {
    if (pl.out) return g;
    pl.out = true; ev(g, { k: 'out', p, why: 'left' });
    if (!checkLastStanding(g) && g.turn === p) nextTurn(g, false, now);
    if (g.status === 'playing') runCpu(g, rand, now);
    return g;
  }

  if (a.type === 'tick') {
    const cur = g.turn, cp = g.players[cur];
    if (cp.cpu) { runCpu(g, rand, now); return g; }
    if (now - g.turnAt < TURN_MS) throw new LudoError('early', 'এখনো সময় আছে');
    cp.afk += 1;
    ev(g, { k: 'skip', p: cur, why: 'afk' });
    if (g.mode === 'online' && cp.afk >= AFK_LIMIT) { // শুধু অনলাইনে বাদ পড়ে; কম্পিউটার বা এক ফোনের খেলায় শুধু নিজে থেকে চাল হয়
      cp.out = true; ev(g, { k: 'out', p: cur, why: 'afk' });
      if (!checkLastStanding(g)) nextTurn(g, false, now);
    } else if (!g.rolled) {
      doRoll(g, cur, rand(), now);
      if (g.status === 'playing' && g.turn === cur && g.rolled) doMove(g, cur, aiPick(g, cur), now);
    } else {
      doMove(g, cur, aiPick(g, cur), now);
    }
    if (g.status === 'playing') runCpu(g, rand, now);
    return g;
  }

  if (pl.out) throw new LudoError('out', 'আপনি খেলা থেকে বাদ পড়েছেন');
  if (g.turn !== p) throw new LudoError('not-turn', 'এখন আপনার চাল না');

  if (a.type === 'roll') {
    if (g.rolled) throw new LudoError('rolled', 'আগে গুটি চালুন');
    pl.afk = 0;
    doRoll(g, p, rand(), now);
  } else if (a.type === 'move') {
    if (!g.rolled) throw new LudoError('not-rolled', 'আগে ছক্কা চালুন');
    if (!g.movable.includes(a.t)) throw new LudoError('bad-move', 'এই গুটি চালা যাবে না');
    pl.afk = 0;
    doMove(g, p, a.t, now);
  } else throw new LudoError('bad-action', 'অজানা কাজ');

  if (g.status === 'playing') runCpu(g, rand, now);
  return g;
}

/* খেলা শেষে কে কত পয়েন্ট ফেরত পাবে (এন্ট্রি আগেই কাটা হয়েছে)। মোট বণ্টন = মোট এন্ট্রি, তাই পয়েন্ট বানানো যায় না।
   কম্পিউটারের সাথে: জিতলে এন্ট্রির দ্বিগুণ। */
export function payouts(g) {
  const out = {}, E = g.entry || 0, r = g.result ? g.result.ranks : [];
  g.players.forEach(pl => { if (pl.uid) out[pl.uid] = 0; });
  if (!E || !r.length) return out;
  if (g.mode === 'cpu') { const w = g.players[r[0]]; if (w.uid) out[w.uid] = 2 * E; return out; }
  const n = g.players.length;
  const share = n === 2 ? [2, 0] : n === 3 ? [2, 1, 0] : [2.5, 1.5, 0, 0];
  r.forEach((pi, rank) => { const pl = g.players[pi]; if (pl.uid) out[pl.uid] = Math.round(share[rank] * E); });
  return out;
}
