// লাইভ স্কোর: নমুনা ডাটা। API key বসানোর আগ পর্যন্ত পাতাটা দেখতে কেমন হবে, তা বোঝানোর জন্য।
// সময় অনুযায়ী নিজে নিজে খেলা চলে (প্রতি ২ ঘণ্টায় নতুন করে শুরু), সব কাল্পনিক খেলোয়াড়।
import { team } from './_teams.js';
import { bnNum, ballsToOvers, gen } from './_bn.js';

const H = 3600e3, CYCLE = 2 * H;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const P = {
  bd: ['রাফি', 'নাঈম', 'জাহিদ', 'সোহেল', 'রিয়াদ', 'ইমন', 'শাকিল', 'তানভীর', 'আরিফ', 'সাব্বির', 'মাসুম'],
  in: ['অর্জুন', 'রোহন', 'বিক্রম', 'করণ', 'আদিত্য', 'সঞ্জয়', 'দীপক', 'অমিত', 'বরুণ', 'নিখিল', 'প্রীতম'],
  au: ['জ্যাক', 'লিয়াম', 'অলিভার', 'নোয়া', 'উইলিয়াম', 'হেনরি', 'থমাস', 'লুকাস', 'ম্যাক্স', 'চার্লি', 'স্যাম'],
  en: ['জর্জ', 'হ্যারি', 'অস্কার', 'আর্চি', 'লিও', 'আলফি', 'জোশ', 'ড্যানি', 'বেন', 'টম', 'ফ্রেডি']
};

/* ---------- ক্রিকেট: টি-টোয়েন্টির নকল খেলা ---------- */
// balls: কতগুলো বল হয়ে গেছে (Infinity = পুরো খেলা শেষ)
function simT20(seed, A, B, pa, pb, balls) {
  const R = rng(seed);
  const inns = [], comm = [];
  let target = null, ballNo = 0, result = null;
  for (let ii = 0; ii < 2 && ballNo < balls && !result; ii++) {
    const bat = ii === 0 ? A : B, bowlT = ii === 0 ? B : A;
    const bp = ii === 0 ? pa : pb, wp = ii === 0 ? pb : pa;
    const card = { t: (bat.bn || bat.name) + ' · ইনিংস', bat: [], bowl: [], ext: 0, tot: null };
    const bowlers = [6, 7, 8, 9, 10].map(i => [wp[i], 0, 0, 0, 0]);
    const add = n => { const x = [bp[n], 'ব্যাট করছেন', 0, 0, 0, 0]; card.bat.push(x); return x; };
    let st = add(0), ns = add(1), next = 2, r = 0, w = 0, legal = 0;
    const ovr = [];
    const oAdd = (runs, wk) => { const i = Math.floor(legal / 6); while (ovr.length <= i) ovr.push([0, 0]); ovr[i][0] += runs; ovr[i][1] += wk; };
    while (legal < 120 && w < 10 && ballNo < balls) {
      const bw = bowlers[Math.floor(legal / 6) % 5];
      const o = `${Math.floor(legal / 6)}.${legal % 6 + 1}`;
      const x = R(); ballNo++;
      const tag = `${bw[0]} থেকে ${st[0]}`;
      if (x < 0.035) { // ওয়াইড
        oAdd(1, 0); r++; card.ext++; bw[3]++; comm.push({ o, k: 'x', t: `ওয়াইড! অতিরিক্ত ১ রান · ${bnNum(r)}/${bnNum(w)}`, inn: ii });
      } else {
        const pre = legal; legal++; st[3]++;
        let k, t, run = 0;
        if (x < 0.085) {
          w++; bw[4]++; st[1] = `বোল্ড ${bw[0]}`;
          k = 'W'; t = `আউট! ${st[0]} ${bnNum(st[2])} রান করে বোল্ড, বোলার ${bw[0]}`;
        } else if (x < 0.40) { k = '0'; t = `ডট বল। ${tag}`; }
        else if (x < 0.72) { run = 1; k = 'r'; t = `১ রান। ${tag}`; }
        else if (x < 0.80) { run = 2; k = 'r'; t = `২ রান। ${tag}`; }
        else if (x < 0.81) { run = 3; k = 'r'; t = `৩ রান। ${tag}`; }
        else if (x < 0.94) { run = 4; k = '4'; t = `চার! ${gen(st[0])} দারুণ শট, ${gen(bw[0])} বলে`; st[4]++; }
        else { run = 6; k = '6'; t = `ছক্কা! ${st[0]} বল পাঠালেন মাঠের বাইরে`; st[5]++; }
        { const i = Math.floor(pre / 6); while (ovr.length <= i) ovr.push([0, 0]); ovr[i][0] += run; if (k === 'W') ovr[i][1]++; }
        r += run; st[2] += run; bw[3] += run;
        comm.push({ o, k, t: `${t} · ${bnNum(r)}/${bnNum(w)}`, inn: ii });
        if (k === 'W' && w < 10) st = add(next++);
        else if (run % 2) [st, ns] = [ns, st];
        if (legal % 6 === 0) {
          comm.push({ o: String(legal / 6), k: 'i', t: `${bnNum(legal / 6)} ওভার শেষ · ${bat.bn || bat.name} ${bnNum(r)}/${bnNum(w)}`, inn: ii });
          [st, ns] = [ns, st];
        }
      }
      if (target && r >= target) { result = ii === 1 ? 'b' : 'a'; break; }
    }
    bowlers.forEach(b => { b[1] = 0; });
    // বোলারের ওভার আবার গোনা
    for (let i = 0; i < legal; i++) bowlers[Math.floor(i / 6) % 5][1] += 1;
    card.bowl = bowlers.filter(b => b[1] > 0).map(b => [b[0], ballsToOvers(b[1]), b[2], b[3], b[4]]);
    card.tot = { r, w, o: +ballsToOvers(legal) };
    const done = legal >= 120 || w >= 10 || !!result;
    if (done) card.bat.forEach(b => { if (b[1] === 'ব্যাট করছেন') b[1] = 'অপরাজিত'; });
    inns.push({ side: ii === 0 ? 'a' : 'b', r, w, o: +ballsToOvers(legal), legal, card, done, ovr, tn: bat.bn || bat.name });
    if (ii === 0) {
      target = r + 1;
      if (inns[0].done) comm.push({ o: ballsToOvers(legal), k: 'i', t: `ইনিংস শেষ। ${bat.bn} ${bnNum(r)}/${bnNum(w)}। ${gen(bowlT.bn)} লক্ষ্য ${bnNum(target)} রান`, inn: 0 });
    }
  }
  if (!result && inns.length === 2 && inns[1].done) result = inns[1].r >= target ? 'b' : inns[1].r === target - 1 ? 'void' : 'a';
  return { inns, comm: comm.reverse().slice(0, 150), result, target, balls: ballNo };
}

function cricMatch(id, A, B, pa, pb, start, now, tour, label, seed) {
  const a = team(A), b = team(B);
  const elapsed = now - start;
  const BALL = 18e3; // প্রতি ১৮ সেকেন্ডে এক বল
  let balls = elapsed < 0 ? 0 : Math.floor(elapsed / BALL);
  const sim = simT20(seed, a, b, pa, pb, elapsed < 0 ? 0 : balls);
  const state = elapsed < 0 ? 'upcoming' : sim.result ? 'done' : 'live';
  const m = {
    id, sport: 'cricket', state, start, tour, label, test: false, intl: true, fmt: 't20', rk: 3, venue: 'নমুনা মাঠ', demo: true,
    a: { ...a, inn: sim.inns.filter(x => x.side === 'a').map(x => ({ r: x.r, w: x.w, o: x.o })) },
    b: { ...b, inn: sim.inns.filter(x => x.side === 'b').map(x => ({ r: x.r, w: x.w, o: x.o })) },
    inns: sim.inns.map(x => ({ side: x.side, r: x.r, w: x.w, o: x.o }))
  };
  if (state === 'upcoming') m.status = 'খেলা এখনো শুরু হয়নি';
  else if (state === 'done') {
    m.result = sim.result;
    const i2 = sim.inns[1];
    m.status = sim.result === 'b' ? `${b.bn} ${bnNum(10 - i2.w)} উইকেটে জিতেছে` : sim.result === 'a' ? `${a.bn} ${bnNum(sim.target - 1 - i2.r)} রানে জিতেছে` : 'ম্যাচ টাই হয়েছে';
  } else if (sim.inns.length === 2) {
    const i2 = sim.inns[1];
    m.status = `${gen(b.bn)} জিততে ${bnNum(120 - i2.legal)} বলে ${bnNum(sim.target - i2.r)} রান দরকার`;
  } else m.status = sim.inns[0] && sim.inns[0].done ? 'ইনিংস বিরতি' : `${a.bn} ব্যাট করছে`;
  m.toss = `টস: ${a.bn} (ব্যাটিং)`;
  const li = sim.inns[sim.inns.length - 1];
  const cur = li && state === 'live' ? { bat: li.card.bat.filter(b => b[1] === 'ব্যাট করছেন').map(b => [b[0], b[2], b[3], b[4], b[5]]), bowl: li.card.bowl.slice(-1).map(b => [b[0], b[1], b[3], b[4]]), part: li.card.bat.filter(b => b[1] === 'ব্যাট করছেন').reduce((t, b) => t + b[2], 0), last: null, fow: [] } : null;
  const mom = state === 'done' ? (sim.result === 'b' ? pb[2] : pa[2]) : '';
  return { m, det: { card: sim.inns.map(x => x.card), comm: sim.comm, ov: sim.inns.map(x => ({ t: x.tn, o: x.ovr })), cur, mom } };
}

/* ---------- ফুটবল: ৯০ মিনিটের নকল খেলা ---------- */
const FP = {
  ar: ['মার্তিন', 'লাউতারো', 'হুলিয়ান', 'আলেক্সিস', 'রদ্রিগো', 'নিকোলাস', 'ক্রিস্তিয়ান'],
  br: ['গ্যাব্রিয়েল', 'লুকাস', 'রাফায়েল', 'ব্রুনো', 'মাথেউস', 'ফেলিপে', 'দানিলো'],
  bd: ['রাকিব', 'মোরছালিন', 'জামাল', 'তপু', 'সোহেল', 'ফাহিম', 'রহমত'],
  np: ['অঞ্জন', 'বিমল', 'রোহিত', 'সুজল', 'অনন্ত', 'নবীন', 'দীপেশ']
};
function fbMatch(id, A, B, pa, pb, start, now, tour, label, seed, national = true) {
  const a = team(A, national), b = team(B, national);
  const min = Math.floor((now - start) / 60e3); // বাস্তব ১ মিনিট = খেলার ১ মিনিট
  const R = rng(seed);
  const ev = [], gl = [];
  let ga = 0, gb = 0;
  const playMin = min < 0 ? -1 : min <= 45 ? min : min < 60 ? 45 : Math.min(90, min - 15);
  for (let t = 1; t <= 90; t++) {
    const x = R(), y = R(), z = R();
    if (t > playMin) continue;
    if (x < 0.022) { ga++; gl.push({ s: 'a', m: t, n: pa[Math.floor(z * 7)], k: 'G' }); ev.push({ o: t + "'", k: 'G', t: `গোল! ${pa[Math.floor(z * 7)]} (${a.bn || a.name}) · ${bnNum(ga)}-${bnNum(gb)}` }); }
    else if (x < 0.040) { gb++; gl.push({ s: 'b', m: t, n: pb[Math.floor(z * 7)], k: 'G' }); ev.push({ o: t + "'", k: 'G', t: `গোল! ${pb[Math.floor(z * 7)]} (${b.bn || b.name}) · ${bnNum(ga)}-${bnNum(gb)}` }); }
    else if (y < 0.04) { const s = z < 0.5; ev.push({ o: t + "'", k: 'Y', t: `হলুদ কার্ড: ${(s ? pa : pb)[Math.floor(R() * 7)]} (${s ? a.bn || a.name : b.bn || b.name})` }); }
    else if (t > 58 && y > 0.965) { const s = z < 0.5; ev.push({ o: t + "'", k: 'S', t: `বদলি (${s ? a.bn || a.name : b.bn || b.name}): নতুন খেলোয়াড় ঢুকলেন` }); }
  }
  const state = min < 0 ? 'upcoming' : min >= 105 ? 'done' : 'live';
  const per = state === 'upcoming' ? 'NS' : state === 'done' ? 'FT' : min <= 45 ? '1H' : min < 60 ? 'HT' : '2H';
  const m = {
    id, sport: 'football', state, start, tour, label, intl: national, lg: 1, season: 2026, venue: 'নমুনা স্টেডিয়াম', demo: true,
    a: { ...a, g: state === 'upcoming' ? null : ga }, b: { ...b, g: state === 'upcoming' ? null : gb },
    per, min: state === 'live' && per !== 'HT' ? playMin : null,
    status: { NS: 'শুরু হয়নি', '1H': 'প্রথমার্ধ', HT: 'বিরতি', '2H': 'দ্বিতীয়ার্ধ', FT: 'খেলা শেষ' }[per]
  };
  if (state === 'done') {
    m.result = ga > gb ? 'a' : gb > ga ? 'b' : 'd';
    m.status = m.result === 'd' ? 'ম্যাচ ড্র হয়েছে' : `${(m.result === 'a' ? a : b).bn || (m.result === 'a' ? a : b).name} জিতেছে`;
  }
  const comm = ev.slice().reverse();
  if (per === 'HT') comm.unshift({ o: "45'", k: 'i', t: 'বিরতি চলছে' });
  if (per === 'FT') comm.unshift({ o: "90'", k: 'i', t: 'খেলা শেষ! ' + m.status });
  if (state !== 'upcoming') comm.push({ o: "1'", k: 'i', t: 'খেলা শুরু!' });
  const sh = Math.max(1, playMin);
  const stats = state === 'upcoming' ? [] : [
    ['বল দখল', Math.round(50 + (R() - 0.5) * 20) + '%', null], ['মোট শট', Math.round(sh / 7 + R() * 3), Math.round(sh / 8 + R() * 3)],
    ['লক্ষ্যে শট', ga + Math.round(R() * 3), gb + Math.round(R() * 3)], ['কর্নার', Math.round(sh / 15 + R() * 2), Math.round(sh / 16 + R() * 2)],
    ['ফাউল', Math.round(sh / 9), Math.round(sh / 8)]
  ];
  if (stats.length) stats[0][2] = (100 - parseInt(stats[0][1])) + '%';
  const pos = ['G', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'F', 'F', 'F'];
  const xi = ps => pos.map((p, i) => [i + 1, (ps[i % ps.length] || 'খেলোয়াড়') + (i >= ps.length ? ' ' + (i + 1) : ''), p]);
  const lu = state === 'upcoming' ? [] : [{ t: a.bn || a.name, f: '4-3-3', coach: 'নমুনা কোচ', xi: xi(pa), sub: [] }, { t: b.bn || b.name, f: '4-4-2', coach: 'নমুনা কোচ', xi: xi(pb), sub: [] }];
  // নমুনায় খেলাঘরের হিসাবের মতো পূর্বাভাস (পাতা কেমন দেখায় বোঝাতে)
  if (state !== 'done') { m.pred = { a: 0.63, d: 0.22, b: 0.15, la: 1.9, lb: 0.8, n: 6, src: 'elo' }; m.oul = 2.5; }
  return { m, det: { comm, stats, lu, gl } };
}

// সব নমুনা ম্যাচ (id-তে চক্র নম্বর থাকে, তাই প্রতিটা চক্রে ভোটও নতুন)
export function demoAll(now = Date.now(), want = { cricket: true, football: true }) {
  const k = Math.floor(now / CYCLE), c0 = k * CYCLE;
  const list = [];
  if (want.cricket) {
    list.push(cricMatch(`d_c1_${k}`, 'Bangladesh', 'India', P.bd, P.in, c0, now, 'নমুনা সিরিজ', '১ম টি-টোয়েন্টি', k * 7 + 1));
    list.push(cricMatch(`d_c2_${k}`, 'Pakistan', 'Sri Lanka', P.in, P.bd, c0 + 3 * H + 30 * 60e3, now, 'নমুনা ত্রিদেশীয় কাপ', '৩য় ম্যাচ', k * 7 + 2));
    list.push(cricMatch(`d_c3_${k}`, 'Australia', 'England', P.au, P.en, c0 - 20 * H, now, 'নমুনা অ্যাশেজ টি-টোয়েন্টি', '২য় টি-টোয়েন্টি', k * 7 + 3));
  }
  if (want.football) {
    list.push(fbMatch(`d_f1_${k}`, 'Argentina', 'Brazil', FP.ar, FP.br, c0 + 5 * 60e3, now, 'নমুনা বিশ্বকাপ বাছাই', 'ম্যাচডে ৯', k * 7 + 4));
    list.push(fbMatch(`d_f2_${k}`, 'Bangladesh', 'Nepal', FP.bd, FP.np, c0 - 22 * H, now, 'নমুনা সাফ চ্যাম্পিয়নশিপ', 'গ্রুপ এ', k * 7 + 5));
    list.push(fbMatch(`d_f3_${k}`, 'Dhaka City FC', 'Chattogram United', FP.bd, FP.np, c0 + 5 * H, now, 'নমুনা ক্লাব লিগ', 'ম্যাচডে ৪', k * 7 + 6, false));
  }
  return list;
}

export function demoMatch(id, now = Date.now()) {
  const m = String(id).match(/^d_[cf]\d_(\d+)$/);
  if (!m) return null;
  const k = +m[1];
  // পুরোনো চক্রের ম্যাচ: সেই চক্রের শেষ মুহূর্তের হিসাবে দেখাই
  const t = Math.min(now, (k + 1) * CYCLE - 1);
  return demoAll(t).find(x => x.m.id === id) || null;
}
