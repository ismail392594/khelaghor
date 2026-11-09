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
export const DETAIL_INC = 'runs,localteam,visitorteam,league,stage,venue,batting.batsman,batting.result,bowling.bowler,balls.score,balls.batsman,balls.bowler';

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
    venue: (x.venue && x.venue.name) || '', city: (x.venue && x.venue.city) || '', a, b, inns, status: st, raw: (x.note || status).slice(0, 120)
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
  const boards = [...new Set([...list(x.batting).map(b => b.scoreboard), ...list(x.bowling).map(b => b.scoreboard)])].filter(Boolean).sort();
  const card = boards.map(sb => {
    const T = teamOfBoard(sb);
    const n = +String(sb).replace(/\D/g, '') || 1;
    const r = runs.find(q => +q.inning === n);
    return {
      t: (T ? T.bn || T.name : '') + ` · ${ord(Math.ceil(n / 2) || 1)} ইনিংস`,
      tot: r ? { r: +r.score || 0, w: +r.wickets || 0, o: +r.overs || 0 } : null,
      bat: list(x.batting).filter(b => b.scoreboard === sb).sort((p, q) => (p.sort || 0) - (q.sort || 0))
        .map(b => [pname(b.batsman), b.result && b.result.name ? b.result.name : (b.active ? 'ব্যাট করছেন' : dismissalBn('not out')), +b.score || 0, +b.ball || 0, +(b.four_x ?? b.fout_x) || 0, +b.six_x || 0]),
      bowl: list(x.bowling).filter(b => b.scoreboard === sb).sort((p, q) => (p.sort || 0) - (q.sort || 0))
        .map(b => [pname(b.bowler), +b.overs || 0, +b.medians || 0, +b.runs || 0, +b.wickets || 0]),
      ext: null
    };
  });
  const balls = list(x.balls).slice().sort((p, q) => String(p.scoreboard).localeCompare(String(q.scoreboard)) || (+p.ball - +q.ball) || ((p.id || 0) - (q.id || 0)));
  const comm = [];
  let lastSb = null;
  for (const bl of balls) {
    if (bl.scoreboard !== lastSb && lastSb) { const T = teamOfBoard(bl.scoreboard); comm.push({ o: '', k: 'i', t: `নতুন ইনিংস শুরু${T ? ': ' + (T.bn || T.name) + ' ব্যাট করছে' : ''}` }); }
    lastSb = bl.scoreboard;
    const s = bl.score || {};
    const bat = pname(bl.batsman), bow = pname(bl.bowler);
    const o = Number(bl.ball).toFixed(1);
    const nmS = String(s.name || '');
    let k = 'r', t;
    if (s.is_wicket || s.out) { k = 'W'; t = `আউট! ${bat} (${nmS || 'উইকেট'}), বোলার ${bow}`; }
    else if (s.six) { k = '6'; t = `ছক্কা! ${gen(bow)} বলে ${bat}`; }
    else if (s.four) { k = '4'; t = `চার! ${gen(bow)} বলে ${bat}`; }
    else if (/wide/i.test(nmS) || s.noball) { k = 'x'; t = `${/wide/i.test(nmS) ? 'ওয়াইড' : 'নো বল'}! অতিরিক্ত ${bnNum((+s.runs || 0) + (+s.noball_runs || 0) + (+s.bye || 0) + (+s.leg_bye || 0) || 1)} রান`; }
    else {
      const rr = (+s.runs || 0) + (+s.bye || 0) + (+s.leg_bye || 0);
      if (!rr) { k = '0'; t = `ডট বল। ${bow} থেকে ${bat}`; }
      else t = `${bnNum(rr)} রান${s.bye || s.leg_bye ? ' (বাই/লেগ বাই)' : ''}। ${bow} থেকে ${bat}`;
    }
    comm.push({ o, k, t });
  }
  return { card, comm: comm.reverse().slice(0, 160) };
}
