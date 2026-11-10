// লাইভ স্কোর: দেশের নাম → পতাকার কোড (flagcdn.com) আর বাংলা নাম।
// শুধু দেশের পতাকা ব্যবহার হয়। ক্লাব বা লিগের লোগো কখনো নয়: ক্লাবের জন্য নামের আদ্যক্ষর দিয়ে গোল ছাপ (মনোগ্রাম)।
import { gen, bnNum } from './_bn.js';

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

// দলের নামের শেষে যা থাকতে পারে (মহিলা দল, অনূর্ধ্ব-১৯ ইত্যাদি)
const SUF = [
  [/\s+(women|w)$/i, ' (মহিলা)'], [/\s+(u-?19|under[- ]19)$/i, ' অনূর্ধ্ব-১৯'], [/\s+(u-?21|under[- ]21)$/i, ' অনূর্ধ্ব-২১'],
  [/\s+(u-?23|under[- ]23)$/i, ' অনূর্ধ্ব-২৩'], [/\s+a$/i, ' এ দল'], [/\s+lions$/i, ' লায়ন্স'], [/\s+xi$/i, ' একাদশ'], [/\s+(emerging)$/i, ' ইমার্জিং']
];

const COLS = ['#e5484d', '#3b78f0', '#2fa36b', '#f2b100', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#0ea5e9', '#84cc16'];

function mono(name) {
  const w = String(name || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const ini = (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return { mono: ini, col: COLS[h % COLS.length] };
}

// name: API-র ইংরেজি নাম। national=false হলে (ক্লাব) পতাকা দেওয়া হয় না।
export function team(name, national = true) {
  const raw = String(name || '').trim();
  let base = raw, suf = '';
  for (const [re, b] of SUF) { if (re.test(base)) { base = base.replace(re, ''); suf = b; break; } }
  const hit = national ? C[base.toLowerCase()] : null;
  const m = mono(raw);
  return { name: raw, bn: hit ? hit[1] + suf : null, flag: hit ? hit[0] : null, mono: m.mono, col: m.col };
}

export const isCountry = name => {
  let base = String(name || '').trim();
  for (const [re] of SUF) base = base.replace(re, '');
  return !!C[base.toLowerCase()];
};

// সিরিজের নাম বাংলায়: "England Lions tour of West Indies, 2026" → "ইংল্যান্ড লায়ন্সের ওয়েস্ট ইন্ডিজ সফর, ২০২৬"
const SER = { 'one day international': 'ওয়ানডে আন্তর্জাতিক', 'twenty20 international': 'টি-টোয়েন্টি আন্তর্জাতিক', 't20 international': 'টি-টোয়েন্টি আন্তর্জাতিক', 'test series': 'টেস্ট সিরিজ', 'test match': 'টেস্ট', 'odi series': 'ওয়ানডে সিরিজ', 't20i series': 'টি-টোয়েন্টি সিরিজ' };
export function tourBn(t) {
  const s0 = String(t || '');
  // "One Day International · India tour of New Zealand": প্রতিটা অংশ আলাদা করে
  if (s0.includes(' · ')) return s0.split(' · ').map(tourBn).join(' · ');
  if (SER[s0.trim().toLowerCase()]) return SER[s0.trim().toLowerCase()];
  const s = s0;
  const m = s.match(/^(.+?) tour of (.+?)(?:,?\s+(\d{4}(?:[-/]\d{2,4})?))?$/i);
  if (!m) return s;
  const a = team(m[1]).bn, b = team(m[2]).bn;
  if (!a || !b) return s;
  const yr = m[3] ? ', ' + bnNum(m[3]) : '';
  return `${gen(a)} ${b} সফর${yr}`;
}
