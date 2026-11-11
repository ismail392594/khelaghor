// লাইভ স্কোর: ক্রিকেটের দ্রুত উৎস Sportmonks (cricket.sportmonks.com)। key থাকে Vercel-এর SPORTMONKS_TOKEN-এ।
// এখানে আসল বল-বাই-বল পাওয়া যায়, আর ঘণ্টায় ২,০০০ বার ডাকা যায়। যে লিগ এখানে নেই, সেগুলো CricketData থেকে আসে।
import { team } from './_teams.js';
import { rankOf } from './_cricket.js';
import { bnNum, gen, ord, cricStatusBn, matchLabel, sameTeam, dismissalBn } from './_bn.js';

const BASE = 'https://cricket.sportmonks.com/api/v2.0/';
export const hasSm = () => !!process.env.SPORTMONKS_TOKEN;

export async function smCall(path, params = {}) {
  const key = process.env.SPORTMONKS_TOKEN;
  if (!key) return { ok: false, err: 'nokey' };
  const u = new URL(BASE + path);
  u.searchParams.set('api_token', key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(u, { signal: ac.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error || j.status === 'error') return { ok: false, err: String((j.error && (j.error.message || j.error)) || j.message || r.status).slice(0, 160) };
    return { ok: true, data: j.data, meta: j.meta || null };
  } catch (e) {
    return { ok: false, err: 'net' };
  } finally { clearTimeout(tm); }
}

export const LIST_INC = 'runs,localteam,visitorteam,league,stage,venue';
export const DETAIL_INC = 'runs,localteam,visitorteam,league,stage,venue,manofmatch,batting.batsman,batting.result,bowling.bowler,balls.score,balls.batsman,balls.bowler';

const FMT = t => { const s = String(t || '').toLowerCase(); return /t20/.test(s) ? 't20' : /t10/.test(s) ? 't10' : /odi|list a|one day|50/.test(s) ? 'odi' : /test|4day|first class/.test(s) ? 'test' : s; };
const DONE = /^(finished|aban|cancl|no result)/i;
const UPC = /^(ns|postp|delayed)/i;

export function smSummary(x) {
  const lt = x.localteam || {}, vt = x.visitorteam || {};
  const na = lt.name || 'দল ১', nb = vt.name || 'দল ২';
  const national = !!(lt.national_team && vt.national_team);
  const sideOf = tid => (tid === x.localteam_id ? 'a' : 'b');
  const runs = (Array.isArray(x.runs) ? x.runs : (x.runs && x.runs.data) || []).slice().sort((p, q) => (p.inning || 0) - (q.inning || 0));
  const inns = runs.map(r => ({ side: sideOf(r.team_id), r: +r.score || 0, w: +r.wickets || 0, o: +r.overs || 0 }));
  const a = { ...team(na, national), inn: inns.filter(i => i.side === 'a').map(({ r, w, o }) => ({ r, w, o })) };
  const b = { ...team(nb, national), inn: inns.filter(i => i.side === 'b').map(({ r, w, o }) => ({ r, w, o })) };
  const status = String(x.status || '');
  // "NS" (শুরু হয়নি) হলে live পতাকা থাকলেও আসন্ন; স্কোর এসে গেলে তবেই লাইভ
  let state = DONE.test(status) ? 'done' : UPC.test(status) && !inns.length ? 'upcoming' : (x.live || inns.length) ? 'live' : 'upcoming';
  const bnOf = n => (sameTeam(n, na) ? a.bn || n : sameTeam(n, nb) ? b.bn || n : n);
  let st;
  let m;
  if (x.note) st = cricStatusBn(x.note, bnOf);
  else if ((m = status.match(/^(\d)(st|nd|rd|th) Innings/i))) st = `${ord(+m[1])} ইনিংস চলছে`;
  else if ((m = status.match(/stump day (\d+)/i))) st = `${ord(+m[1])} দিন শেষ`;
  else if (/^ns$/i.test(status)) st = 'খেলা এখনো শুরু হয়নি';
  else if (/^postp/i.test(status)) st = 'খেলা পিছিয়েছে';
  else if (/^delayed/i.test(status)) st = 'খেলা শুরু হতে দেরি হচ্ছে';
  else if (/^int/i.test(status)) st = 'খেলা থেমে আছে';
  else st = cricStatusBn(status, bnOf) || status;
  const fmt = FMT(x.type);
  const out = {
    id: 's_' + x.id, sport: 'cricket', src: 'sm', state, start: Date.parse(x.starting_at) || 0,
    tour: (x.league && x.league.name ? x.league.name : '') + (x.stage && x.stage.name && x.league && x.stage.name !== x.league.name ? ' · ' + x.stage.name : ''),
    label: matchLabel(x.round) || '', test: fmt === 'test', intl: national, rk: rankOf(na, nb), fmt,
    sid: x.season_id || null, venue: (x.venue && x.venue.name) || '', city: (x.venue && x.venue.city) || '', a, b, inns, status: st, raw: (x.note || status).slice(0, 120)
  };
  if (state === 'live' && /stump/i.test(status)) out.pause = true;
  if (state === 'done') {
    if (x.winner_team_id) out.result = sideOf(x.winner_team_id);
    else if (/draw/i.test(String(x.draw_noresult || '')) || /drawn/i.test(x.note || '')) out.result = 'd';
    else out.result = 'void';
  }
  if (x.toss_won_team_id) out.toss = `টস: ${(sideOf(x.toss_won_team_id) === 'a' ? a : b).bn || (sideOf(x.toss_won_team_id) === 'a' ? na : nb)} (${/bat/i.test(x.elected || '') ? 'ব্যাটিং' : 'বোলিং'})`;
  return out;
}

const pname = p => (p && (p.fullname || p.lastname || p.name)) || '';
const list = v => (Array.isArray(v) ? v : (v && v.data) || []);

// বিস্তারিত: স্কোরকার্ড আর আসল বল-বাই-বল (বাংলায়)
export function smDetail(x, sum) {
  const runs = list(x.runs);
  const teamOfBoard = sb => { const n = +String(sb || '').replace(/\D/g, '') || 1; const r = runs.find(q => +q.inning === n); return r ? (r.team_id === x.localteam_id ? sum.a : sum.b) : null; };
  // খেলোয়াড়ের নম্বর → নাম (এই ম্যাচে যাঁরা ব্যাট বা বল করেছেন), আউটের বিবরণে বোলার আর ফিল্ডারের নাম বসাতে
  const P = new Map();
  for (const b of list(x.batting)) if (b.player_id && b.batsman) P.set(b.player_id, pname(b.batsman));
  for (const b of list(x.bowling)) if (b.player_id && b.bowler) P.set(b.player_id, pname(b.bowler));
  for (const b of list(x.balls)) { if (b.batsman_id && b.batsman) P.set(b.batsman_id, pname(b.batsman)); if (b.bowler_id && b.bowler) P.set(b.bowler_id, pname(b.bowler)); }
  // আউটের ধরন বাংলায়, পত্রিকার স্কোরকার্ডের মতো: "ক্যাচ কোয়েটজি, বল ফরচুইন"
  const outBn = b => {
    const r = String((b.result && b.result.name) || '').toLowerCase();
    const bw = P.get(b.bowling_player_id), f = P.get(b.catch_stump_player_id), ro = P.get(b.runout_by_id);
    if (!r) return b.active ? 'ব্যাট করছেন' : 'অপরাজিত';
    if (/not out/.test(r)) return b.active ? 'ব্যাট করছেন' : 'অপরাজিত';
    if (/catch|caught/.test(r)) return f && bw && f === bw ? `কট অ্যান্ড বোল্ড ${bw}` : `ক্যাচ${f ? ' ' + f : ''}${bw ? ', বল ' + bw : ''}`;
    if (/bowled/.test(r)) return `বোল্ড${bw ? ' ' + bw : ''}`;
    if (/lbw/.test(r)) return `এলবিডব্লিউ${bw ? ' ' + bw : ''}`;
    if (/stump/.test(r)) return `স্টাম্পড${f ? ' ' + f : ''}${bw ? ', বল ' + bw : ''}`;
    if (/run ?out/.test(r)) return `রান আউট${ro || f ? ` (${ro || f})` : ''}`;
    if (/hit ?wicket/.test(r)) return `হিট উইকেট${bw ? ', বল ' + bw : ''}`;
    if (/retired/.test(r)) return /hurt/.test(r) ? 'আহত হয়ে মাঠ ছেড়েছেন' : 'অবসর';
    if (/absent/.test(r)) return 'অনুপস্থিত';
    if (/obstruct|handled|timed/.test(r)) return 'আউট';
    return b.result.name;
  };
  const outOf = new Map(); // ব্যাটারের নম্বর → আউটের বিবরণ (ধারাভাষ্যে লাগে)
  for (const b of list(x.batting)) if (b.player_id && b.result && !/not out/i.test(b.result.name || '')) outOf.set(b.scoreboard + ':' + b.player_id, outBn(b));
  const boards = [...new Set([...list(x.batting).map(b => b.scoreboard), ...list(x.bowling).map(b => b.scoreboard)])].filter(Boolean).sort();
  const card = boards.map(sb => {
    const T = teamOfBoard(sb);
    const n = +String(sb).replace(/\D/g, '') || 1;
    const r = runs.find(q => +q.inning === n);
    return {
      t: (T ? T.bn || T.name : '') + ` · ${ord(Math.ceil(n / 2) || 1)} ইনিংস`,
      tot: r ? { r: +r.score || 0, w: +r.wickets || 0, o: +r.overs || 0 } : null,
      bat: list(x.batting).filter(b => b.scoreboard === sb).sort((p, q) => (p.sort || 0) - (q.sort || 0))
        .map(b => [pname(b.batsman), outBn(b), +b.score || 0, +b.ball || 0, +(b.four_x ?? b.fout_x) || 0, +b.six_x || 0]),
      bowl: list(x.bowling).filter(b => b.scoreboard === sb).sort((p, q) => (p.sort || 0) - (q.sort || 0))
        .map(b => [pname(b.bowler), +b.overs || 0, +b.medians || 0, +b.runs || 0, +b.wickets || 0]),
      ext: null
    };
  });
  // বল নম্বর ০.০ মানে উৎসের ভুল তথ্য, বাদ
  const balls = list(x.balls).filter(b => Number(b.ball) > 0).sort((p, q) => String(p.scoreboard).localeCompare(String(q.scoreboard)) || (+p.ball - +q.ball) || ((p.id || 0) - (q.id || 0)));
  const comm = [];
  const cardRuns = new Map(); // ব্যাটারের আসল রান (স্কোরকার্ড থেকে), মাইলফলক ঘোষণার আগে মিলিয়ে নিতে
  for (const b of list(x.batting)) cardRuns.set(b.scoreboard + ':' + b.player_id, +b.score || 0);
  let lastSb = null, ovNo = -1, ovR = 0, ovW = 0, mine = new Map();
  const endOver = () => { if (ovNo >= 0) comm.push({ o: '', k: 'i', t: `${bnNum(ovNo + 1)} ওভার শেষ · এই ওভারে ${ovR ? bnNum(ovR) + ' রান' : 'কোনো রান হয়নি'}${ovW ? `, ${bnNum(ovW)} উইকেট` : ''}` }); };
  for (let bi = 0; bi < balls.length; bi++) {
    const bl = balls[bi];
    const thisOv = Math.floor(Number(bl.ball) + 1e-9);
    if (bl.scoreboard !== lastSb) {
      if (lastSb) { const T = teamOfBoard(bl.scoreboard); comm.push({ o: '', k: 'i', t: `নতুন ইনিংস শুরু${T ? ': ' + (T.bn || T.name) + ' ব্যাট করছে' : ''}` }); }
      ovNo = thisOv; ovR = 0; ovW = 0; mine = new Map();
    } else if (thisOv !== ovNo) { endOver(); ovNo = thisOv; ovR = 0; ovW = 0; }
    lastSb = bl.scoreboard;
    const s = bl.score || {};
    const bat = pname(bl.batsman), bow = pname(bl.bowler);
    const o = Number(bl.ball).toFixed(1);
    const nmS = String(s.name || '');
    const offBat = +s.runs || 0, extra = (+s.bye || 0) + (+s.leg_bye || 0) + (+s.noball_runs || 0);
    const who = `${bow} থেকে ${bat}`;
    let k = 'r', t;
    if (s.is_wicket || s.out) {
      k = 'W';
      const how = outOf.get(bl.scoreboard + ':' + (bl.batsmanout_id || bl.batsman_id));
      const rr = cardRuns.get(bl.scoreboard + ':' + (bl.batsmanout_id || bl.batsman_id));
      t = `আউট! ${bat}${how ? ', ' + how : ''}${rr != null && !bl.batsmanout_id ? ` · ${bnNum(rr)} রানে ফিরলেন` : ''}`;
      ovW++;
    }
    else if (s.six) { k = '6'; t = `${who}, ছক্কা!`; }
    else if (s.four) { k = '4'; t = `${who}, চার!`; }
    else if (/wide/i.test(nmS)) { k = 'x'; t = `${who}, ওয়াইড · বাড়তি ${bnNum(offBat + extra || 1)} রান`; }
    else if (s.noball) { k = 'x'; t = `${who}, নো বল · ${bnNum(offBat + extra || 1)} রান`; }
    else if (!(offBat + extra)) { k = '0'; t = `${who}, রান হয়নি`; }
    else if (s.bye || s.leg_bye) t = `${who}, ${s.leg_bye ? 'লেগ বাই' : 'বাই'} ${bnNum(offBat + extra)} রান`;
    else t = `${who}, ${bnNum(offBat)} রান`;
    comm.push({ o, k, t });
    ovR += offBat + extra + (/wide/i.test(nmS) && !offBat && !extra ? 1 : 0);
    // অর্ধশতক আর শতক (বল থেকে গোনা রান স্কোরকার্ডের সাথে মিললে তবেই)
    if (!/wide/i.test(nmS) && !s.bye && !s.leg_bye && bl.batsman_id) {
      const key = bl.scoreboard + ':' + bl.batsman_id, was = mine.get(key) || 0, now2 = was + offBat;
      mine.set(key, now2);
      for (const [mark, word] of [[50, 'অর্ধশতক'], [100, 'শতক'], [150, 'দেড়শ'], [200, 'দ্বিশতক']]) if (was < mark && now2 >= mark && (cardRuns.get(key) || 0) >= mark) comm.push({ o: '', k: 'i', t: `${word}! ${bat} ${bnNum(mark)} পেরোলেন` });
    }
  }
  // ওভার প্রতি রান আর উইকেট (গ্রাফের জন্য), প্রতি ইনিংসে আলাদা
  const ovMap = new Map();
  for (const bl of balls) {
    const sb = bl.scoreboard, s = bl.score || {};
    if (!ovMap.has(sb)) ovMap.set(sb, []);
    const arr = ovMap.get(sb), i = Math.floor(Number(bl.ball) + 1e-9);
    while (arr.length <= i) arr.push([0, 0]);
    arr[i][0] += (+s.runs || 0) + (+s.bye || 0) + (+s.leg_bye || 0) + (+s.noball_runs || 0);
    if (s.is_wicket || s.out) arr[i][1]++;
  }
  const ov = [...ovMap.entries()].sort((p, q) => String(p[0]).localeCompare(String(q[0]))).map(([sb, arr]) => { const T = teamOfBoard(sb); return { t: T ? T.bn || T.name : '', o: arr }; });
  // এখন মাঠে: ক্রিজের দুই ব্যাটার, বর্তমান বোলার, চলমান জুটি আর শেষ উইকেট (শেষ ইনিংস থেকে)
  let cur = null;
  const curSb = boards[boards.length - 1];
  if (curSb) {
    const bat = list(x.batting).filter(b => b.scoreboard === curSb);
    const bowl = list(x.bowling).filter(b => b.scoreboard === curSb);
    const n = +String(curSb).replace(/\D/g, '') || 1;
    const r = runs.find(q => +q.inning === n);
    const fow = bat.filter(b => +b.fow_score > 0).map(b => ({ n: pname(b.batsman), r: +b.score || 0, at: +b.fow_score, ov: +b.fow_balls || 0 })).sort((p, q) => p.at - q.at);
    const last = fow[fow.length - 1];
    const tot = r ? +r.score || 0 : 0;
    cur = {
      bat: (bat.some(b => b.active) ? bat.filter(b => b.active || !b.result || /not out/i.test(b.result.name || '')) : bat.filter(b => !b.result || /not out/i.test(b.result.name || ''))).slice(-2).map(b => [pname(b.batsman), +b.score || 0, +b.ball || 0, +(b.four_x ?? b.fout_x) || 0, +b.six_x || 0]),
      bowl: bowl.filter(b => b.active).map(b => [pname(b.bowler), +b.overs || 0, +b.runs || 0, +b.wickets || 0]).slice(0, 1),
      part: r ? tot - (last ? last.at : 0) : null,
      last: last ? [last.n, last.r, last.at, last.ov] : null,
      fow: fow.map(f => [f.n, f.at, f.ov])
    };
  }
  const mom = x.manofmatch ? pname(x.manofmatch) : '';
  return { card, comm: comm.reverse().slice(0, 160), ov, cur, mom };
}
