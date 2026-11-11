// লাইভ স্কোর: দেশের নাম → পতাকার কোড (flagcdn.com) আর বাংলা নাম।
// শুধু দেশের পতাকা ব্যবহার হয়। ক্লাব বা লিগের লোগো কখনো নয়: ক্লাবের জন্য নামের আদ্যক্ষর দিয়ে গোল ছাপ (মনোগ্রাম)।
import { gen, bnNum } from './_bn.js';
import { MORE_C, CLUBS, FB_COMP, CR_COMP } from './_names.js';

const C = {
  'bangladesh': ['bd', 'বাংলাদেশ'], 'india': ['in', 'ভারত'], 'pakistan': ['pk', 'পাকিস্তান'],
  'sri lanka': ['lk', 'শ্রীলঙ্কা'], 'afghanistan': ['af', 'আফগানিস্তান'], 'australia': ['au', 'অস্ট্রেলিয়া'],
  'england': ['gb-eng', 'ইংল্যান্ড'], 'new zealand': ['nz', 'নিউজিল্যান্ড'], 'south africa': ['za', 'দক্ষিণ আফ্রিকা'],
  'west indies': [null, 'ওয়েস্ট ইন্ডিজ'], 'zimbabwe': ['zw', 'জিম্বাবুয়ে'], 'ireland': ['ie', 'আয়ারল্যান্ড'],
  'scotland': ['gb-sct', 'স্কটল্যান্ড'], 'wales': ['gb-wls', 'ওয়েলস'], 'northern ireland': ['gb-nir', 'উত্তর আয়ারল্যান্ড'],
  'netherlands': ['nl', 'নেদারল্যান্ডস'], 'nepal': ['np', 'নেপাল'], 'oman': ['om', 'ওমান'],
  'united arab emirates': ['ae', 'আরব আমিরাত'], 'uae': ['ae', 'আরব আমিরাত'],
  'united states of america': ['us', 'যুক্তরাষ্ট্র'], 'united states': ['us', 'যুক্তরাষ্ট্র'], 'usa': ['us', 'যুক্তরাষ্ট্র'],
  'canada': ['ca', 'কানাডা'], 'namibia': ['na', 'নামিবিয়া'], 'papua new guinea': ['pg', 'পাপুয়া নিউগিনি'],
  'hong kong': ['hk', 'হংকং'], 'kenya': ['ke', 'কেনিয়া'], 'uganda': ['ug', 'উগান্ডা'], 'malaysia': ['my', 'মালয়েশিয়া'],
  'singapore': ['sg', 'সিঙ্গাপুর'], 'thailand': ['th', 'থাইল্যান্ড'], 'qatar': ['qa', 'কাতার'], 'kuwait': ['kw', 'কুয়েত'],
  'saudi arabia': ['sa', 'সৌদি আরব'], 'bahrain': ['bh', 'বাহরাইন'], 'jersey': ['je', 'জার্সি'], 'guernsey': ['gg', 'গার্নসি'],
  'italy': ['it', 'ইতালি'], 'germany': ['de', 'জার্মানি'], 'france': ['fr', 'ফ্রান্স'], 'spain': ['es', 'স্পেন'],
  'portugal': ['pt', 'পর্তুগাল'], 'brazil': ['br', 'ব্রাজিল'], 'argentina': ['ar', 'আর্জেন্টিনা'], 'uruguay': ['uy', 'উরুগুয়ে'],
  'colombia': ['co', 'কলম্বিয়া'], 'chile': ['cl', 'চিলি'], 'peru': ['pe', 'পেরু'], 'ecuador': ['ec', 'ইকুয়েডর'],
  'paraguay': ['py', 'প্যারাগুয়ে'], 'bolivia': ['bo', 'বলিভিয়া'], 'venezuela': ['ve', 'ভেনেজুয়েলা'], 'mexico': ['mx', 'মেক্সিকো'],
  'costa rica': ['cr', 'কোস্টারিকা'], 'panama': ['pa', 'পানামা'], 'jamaica': ['jm', 'জ্যামাইকা'], 'honduras': ['hn', 'হন্ডুরাস'],
  'el salvador': ['sv', 'এল সালভাদর'], 'haiti': ['ht', 'হাইতি'], 'trinidad and tobago': ['tt', 'ত্রিনিদাদ ও টোবাগো'],
  'curacao': ['cw', 'কুরাসাও'], 'morocco': ['ma', 'মরক্কো'], 'senegal': ['sn', 'সেনেগাল'], 'nigeria': ['ng', 'নাইজেরিয়া'],
  'ghana': ['gh', 'ঘানা'], 'cameroon': ['cm', 'ক্যামেরুন'], 'egypt': ['eg', 'মিশর'], 'algeria': ['dz', 'আলজেরিয়া'],
  'tunisia': ['tn', 'তিউনিসিয়া'], 'ivory coast': ['ci', 'আইভরি কোস্ট'], "cote d'ivoire": ['ci', 'আইভরি কোস্ট'],
  'mali': ['ml', 'মালি'], 'burkina faso': ['bf', 'বুরকিনা ফাসো'], 'dr congo': ['cd', 'ডিআর কঙ্গো'], 'congo dr': ['cd', 'ডিআর কঙ্গো'],
  'zambia': ['zm', 'জাম্বিয়া'], 'cape verde': ['cv', 'কেপ ভার্দে'], 'cape verde islands': ['cv', 'কেপ ভার্দে'],
  'japan': ['jp', 'জাপান'], 'south korea': ['kr', 'দক্ষিণ কোরিয়া'], 'korea republic': ['kr', 'দক্ষিণ কোরিয়া'],
  'north korea': ['kp', 'উত্তর কোরিয়া'], 'iran': ['ir', 'ইরান'], 'iraq': ['iq', 'ইরাক'], 'jordan': ['jo', 'জর্ডান'],
  'uzbekistan': ['uz', 'উজবেকিস্তান'], 'china': ['cn', 'চীন'], 'china pr': ['cn', 'চীন'], 'bhutan': ['bt', 'ভুটান'],
  'maldives': ['mv', 'মালদ্বীপ'], 'myanmar': ['mm', 'মিয়ানমার'], 'vietnam': ['vn', 'ভিয়েতনাম'], 'indonesia': ['id', 'ইন্দোনেশিয়া'],
  'philippines': ['ph', 'ফিলিপাইন'], 'croatia': ['hr', 'ক্রোয়েশিয়া'], 'belgium': ['be', 'বেলজিয়াম'], 'switzerland': ['ch', 'সুইজারল্যান্ড'],
  'denmark': ['dk', 'ডেনমার্ক'], 'sweden': ['se', 'সুইডেন'], 'norway': ['no', 'নরওয়ে'], 'poland': ['pl', 'পোল্যান্ড'],
  'austria': ['at', 'অস্ট্রিয়া'], 'czech republic': ['cz', 'চেক প্রজাতন্ত্র'], 'czechia': ['cz', 'চেক প্রজাতন্ত্র'],
  'serbia': ['rs', 'সার্বিয়া'], 'ukraine': ['ua', 'ইউক্রেন'], 'turkey': ['tr', 'তুরস্ক'], 'türkiye': ['tr', 'তুরস্ক'],
  'greece': ['gr', 'গ্রিস'], 'hungary': ['hu', 'হাঙ্গেরি'], 'romania': ['ro', 'রোমানিয়া'], 'slovakia': ['sk', 'স্লোভাকিয়া'],
  'slovenia': ['si', 'স্লোভেনিয়া'], 'iceland': ['is', 'আইসল্যান্ড'], 'finland': ['fi', 'ফিনল্যান্ড'], 'russia': ['ru', 'রাশিয়া'],
  'georgia': ['ge', 'জর্জিয়া'], 'albania': ['al', 'আলবেনিয়া'], 'bosnia and herzegovina': ['ba', 'বসনিয়া'],
  'north macedonia': ['mk', 'উত্তর মেসিডোনিয়া'], 'montenegro': ['me', 'মন্টিনিগ্রো'], 'israel': ['il', 'ইসরায়েল'],
  'palestine': ['ps', 'ফিলিস্তিন'], 'syria': ['sy', 'সিরিয়া'], 'lebanon': ['lb', 'লেবানন'], 'yemen': ['ye', 'ইয়েমেন'],
  'kazakhstan': ['kz', 'কাজাখস্তান'], 'kyrgyzstan': ['kg', 'কিরগিজস্তান'], 'tajikistan': ['tj', 'তাজিকিস্তান'],
  'fiji': ['fj', 'ফিজি'], 'new caledonia': ['nc', 'নিউ ক্যালেডোনিয়া']
};

Object.assign(C, MORE_C);

// দলের নামের শেষে যা থাকতে পারে (নারী দল, অনূর্ধ্ব-১৯ ইত্যাদি)
const SUF = [
  [/\s+(women|w)$/i, ' নারী দল'], [/\s+(?:u-?|under[- ])(\d{2})$/i, m => ' অনূর্ধ্ব-' + bnNum(m[1])],
  [/\s+a$/i, ' এ দল'], [/\s+lions$/i, ' লায়ন্স'], [/\s+xi$/i, ' একাদশ'], [/\s+(emerging)$/i, ' ইমার্জিং']
];
// দেশের চাবি: ছোট হাতের, দাগ-চিহ্ন ছাড়া ("Saudi-Arabia" → "saudi arabia")
const ckey = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
// ক্লাবের চাবি: FC/CF/AFC আর চিহ্ন বাদ
const clubKey = n => ckey(n).replace(/[^a-z0-9 ]/g, ' ').replace(/\b(fc|cf|afc)\b/g, ' ').replace(/\s+/g, ' ').trim();
// নামের শেষের অংশ (নারী, অনূর্ধ্ব) আলাদা করা: [মূল নাম, বাংলা শেষাংশ]
function split(raw) {
  let base = raw, suf = '';
  for (let i = 0; i < 2; i++) for (const [re, b] of SUF) {
    const m = base.match(re);
    if (m) { base = base.replace(re, ''); suf = (typeof b === 'function' ? b(m) : b) + suf; break; }
  }
  return [base, suf];
}

const COLS = ['#c8384a', '#2f6fc9', '#2c8f5f', '#c99a1c', '#7a5cc4', '#c2507f', '#1f9a8c', '#d0742a', '#2a8fb8', '#6f9a2a'];

function mono(name) {
  const w = String(name || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const ini = (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return { mono: ini, col: COLS[h % COLS.length] };
}

// ক্লাব/রাজ্য দলের বাংলা নাম (না জানা থাকলে null)
export function clubBn(raw) {
  const full = CLUBS[clubKey(raw)];
  if (full) return full;
  const [base, suf] = split(raw);
  const hit = CLUBS[clubKey(base)];
  return hit ? hit + suf : null;
}

// name: API-র ইংরেজি নাম। national=false হলে (ক্লাব) পতাকা দেওয়া হয় না।
export function team(name, national = true) {
  const raw = String(name || '').trim();
  if (/^(tbc|tba|tbd)$/i.test(raw)) return { name: raw, bn: 'এখনো ঠিক হয়নি', flag: null, mono: '?', col: '#5b6b60' };
  const [base, suf] = split(raw);
  const hit = national ? C[ckey(base)] : null;
  const m = mono(raw);
  return { name: raw, bn: hit ? hit[1] + suf : clubBn(raw), flag: hit ? hit[0] : null, mono: m.mono, col: m.col };
}

export const isCountry = name => !!C[ckey(split(String(name || '').trim())[0])];
const countryBn = n => { const h = C[ckey(n)]; return h ? h[1] : null; };

// ক্রিকেট সিরিজ/টুর্নামেন্টের নাম বাংলায়: "England Lions tour of West Indies, 2026" → "ইংল্যান্ড লায়ন্সের ওয়েস্ট ইন্ডিজ সফর, ২০২৬"
const SER = { 'one day international': 'ওয়ানডে আন্তর্জাতিক', 'twenty20 international': 'টি-টোয়েন্টি আন্তর্জাতিক', 't20 international': 'টি-টোয়েন্টি আন্তর্জাতিক', 'test series': 'টেস্ট সিরিজ', 'test match': 'টেস্ট', 'odi series': 'ওয়ানডে সিরিজ', 't20i series': 'টি-টোয়েন্টি সিরিজ' };
export function tourBn(t) {
  const s0 = String(t || '').trim();
  // "One Day International · India tour of New Zealand": প্রতিটা অংশ আলাদা করে
  if (s0.includes(' · ')) return s0.split(' · ').map(tourBn).join(' · ');
  const low = s0.toLowerCase();
  if (SER[low]) return SER[low];
  let m = s0.match(/^(.+?) tour of (.+?)(?:,?\s+(\d{4}(?:[-/]\d{2,4})?))?$/i);
  if (m) {
    const a = team(m[1]).bn, b = team(m[2]).bn;
    return a && b ? `${gen(a)} ${b} সফর${m[3] ? ', ' + bnNum(m[3]) : ''}` : s0;
  }
  // "Afghanistan vs Zimbabwe in UAE"
  if ((m = s0.match(/^(.+?) vs?\.? (.+?)(?: in (.+?))?(?:,?\s+(\d{4}(?:[-/]\d{2,4})?))?$/i))) {
    const a = team(m[1]).bn, b = team(m[2]).bn, w = m[3] && countryBn(m[3]);
    if (a && b) return `${a} বনাম ${b}${w ? ` (মাঠ: ${w})` : ''}${m[4] ? ', ' + bnNum(m[4]) : ''}`;
  }
  // টুর্নামেন্ট: শেষের সাল আলাদা করে নাম মেলানো ("The Ford Trophy 2026-27" → "ফোর্ড ট্রফি ২০২৬-২৭")
  m = s0.match(/^(?:the\s+)?(.+?)(?:,?\s+(\d{4}(?:[-/]\d{2,4})?))?$/i);
  const hit = m && CR_COMP[m[1].toLowerCase().trim()];
  return hit ? hit + (m[2] ? ' ' + bnNum(m[2]) : '') : s0;
}

const FB = {};
// ফুটবল প্রতিযোগিতার নাম বাংলায়। না জানা নাম ইংরেজিতেই থাকে, শুধু বন্ধনীর দেশটা বাংলা হয়।
export function compBn(t) {
  if (!FB.ok) { for (const [k, v] of Object.entries(FB_COMP)) FB[ckey(k)] = v; FB.ok = 1; }
  const s = String(t || '').trim(), low = ckey(s);
  if (typeof FB[low] === 'string') return FB[low];
  let m;
  const conf = { uefa: 'উয়েফা', afc: 'এএফসি', caf: 'আফ্রিকা', concacaf: 'কনকাকাফ', conmebol: 'দক্ষিণ আমেরিকা', saff: 'সাফ' };
  if ((m = s.match(/^(UEFA|AFC|CAF|CONCACAF|CONMEBOL|SAFF) U(\d{2}) (Championship|Asian Cup|Cup of Nations)( Women)?( - Qualification)?$/i))) {
    const what = /asian/i.test(m[3]) ? 'এশিয়ান কাপ' : /nations/i.test(m[3]) ? 'কাপ অব নেশনস' : 'চ্যাম্পিয়নশিপ';
    return `${conf[m[1].toLowerCase()]} অনূর্ধ্ব-${bnNum(m[2])}${m[4] ? ' নারী' : ''} ${what}${m[5] ? ' বাছাই' : ''}`;
  }
  if ((m = s.match(/^World Cup - Qualification (.+)$/i))) {
    const z = { africa: 'আফ্রিকা', asia: 'এশিয়া', europe: 'ইউরোপ', oceania: 'ওশেনিয়া', 'south america': 'দক্ষিণ আমেরিকা', concacaf: 'কনকাকাফ', 'intercontinental play-offs': 'আন্তঃমহাদেশীয় প্লে-অফ' }[m[1].toLowerCase()];
    return 'বিশ্বকাপ বাছাই' + (z ? ` (${z})` : '');
  }
  if ((m = s.match(/^(.+?) - Qualification$/i)) && typeof FB[ckey(m[1])] === 'string') return FB[ckey(m[1])] + ' বাছাই';
  if ((m = s.match(/^(.+) \(([^)]+)\)$/))) { const c = countryBn(m[2]); if (c) return `${m[1]} (${c})`; }
  return s;
}

// এক ম্যাচের সব নাম বাংলায় (জমানো পুরনো তথ্যেও কাজ করে): দল, প্রতিযোগিতা, ধাপ, মাঠ, ফলের লেখা। ইংরেজি নাম খোঁজার জন্য tourEn-এ থাকে।
export function localize(m, roundBn) {
  if (!m || !m.a || !m.b) return m;
  const fix = t => {
    if (t.bn && !/মহিলা/.test(t.bn)) return t;
    const x = team(t.name, m.sport === 'cricket' || !!m.intl || isCountry(t.name));
    return x.bn ? { ...t, bn: x.bn, ...(x.flag && !t.flag && (m.sport === 'cricket' || m.intl) ? { flag: x.flag } : {}) } : t;
  };
  const a = fix(m.a), b = fix(m.b);
  const tour = m.sport === 'cricket' ? tourBn(m.tour) : compBn(m.tour);
  let status = m.status || '';
  for (const [o, n] of [[m.a, a], [m.b, b]]) if (n.bn && n.bn !== o.bn && status.includes(o.name)) status = status.split(o.name).join(n.bn);
  const out = { ...m, a, b, tour, status };
  if (tour !== m.tour) out.tourEn = m.tourEn || m.tour;
  // যুব আর নারী দলের প্রীতি ম্যাচ "বড় খেলা"র সারিতে নয়
  if (m.sport === 'football' && (m.rk || 0) >= 3 && /\bU\d\d\b| W$| Women$/i.test(m.a.name + ' | ' + m.b.name + ' ')) out.rk = 2;
  if (m.sport === 'football' && roundBn && /[A-Za-z]{3}/.test(m.label || '')) out.label = roundBn(m.label);
  if (m.venue) out.venue = String(m.venue).replace(/\s*,\s*/g, ', ').replace(/\s{2,}/g, ' ').trim();
  if (m.toss && /[A-Za-z]{3}/.test(m.toss)) for (const [o, n] of [[m.a, a], [m.b, b]]) if (n.bn && m.toss.includes(o.name)) out.toss = m.toss.split(o.name).join(n.bn);
  return out;
}

// বিস্তারিত তথ্যের ভেতরের দলের নামও বাংলায় (স্কোরকার্ডের শিরোনাম, ওভারের গ্রাফ, একাদশ)
export function localizeDet(det, before, after) {
  if (!det) return det;
  const pairs = [[before.a, after.a], [before.b, after.b]].filter(([o, n]) => n.bn && o.name && n.bn !== o.name);
  if (!pairs.length) return det;
  const tr = t => { let x = String(t || ''); for (const [o, n] of pairs) if (x.includes(o.name)) x = x.split(o.name).join(n.bn); return x; };
  const out = { ...det };
  for (const k of ['card', 'ov', 'lu']) if (Array.isArray(det[k])) out[k] = det[k].map(r => (r && r.t ? { ...r, t: tr(r.t) } : r));
  if (Array.isArray(det.comm)) out.comm = det.comm.map(c => (c.k === 'i' || c.k === 'G' || c.k === 'R' || c.k === 'Y' || c.k === 'S' || c.k === 'V' || c.k === 'x' || c.k === 'P' ? { ...c, t: tr(c.t) } : c));
  return out;
}
