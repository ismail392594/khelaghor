// লাইভ স্কোর: ইংরেজি লেখা থেকে সহজ বাংলা বানানোর ছোট সাহায্যকারী।
// সম্বন্ধ পদ: বাংলাদেশ → বাংলাদেশের, শ্রীলঙ্কা → শ্রীলঙ্কার, ইংরেজি নাম → Name-এর
export function gen(n) {
  const t = String(n || '');
  if (!/[\u0980-\u09FF]$/.test(t)) return t + '-এর';
  return /[\u09BE-\u09CC\u0985-\u0994]$/.test(t) ? t + 'র' : t + 'ের';
}

export const bnNum = v => String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

const ORD = { 1: '১ম', 2: '২য়', 3: '৩য়', 4: '৪র্থ', 5: '৫ম', 6: '৬ষ্ঠ', 7: '৭ম', 8: '৮ম', 9: '৯ম', 10: '১০ম' };
export const ord = n => ORD[n] || bnNum(n) + 'তম';

const KIND = [
  [/t20i?s?\b/i, 'টি-টোয়েন্টি'], [/odis?\b/i, 'ওয়ানডে'], [/tests?\b/i, 'টেস্ট'], [/match\b/i, 'ম্যাচ'],
  [/semi[- ]?final/i, 'সেমিফাইনাল'], [/quarter[- ]?final/i, 'কোয়ার্টার ফাইনাল'], [/final/i, 'ফাইনাল'], [/qualifier/i, 'কোয়ালিফায়ার'], [/eliminator/i, 'এলিমিনেটর']
];
// "2nd T20I" → "২য় টি-টোয়েন্টি"; না মিললে আগের লেখাই
export function matchLabel(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  const m = t.match(/^(\d+)(st|nd|rd|th)\s+(.+)$/i);
  if (m) { const k = KIND.find(([re]) => re.test(m[3])); return ord(+m[1]) + ' ' + (k ? k[1] : m[3]); }
  const k = KIND.find(([re]) => re.test(t) && t.length < 24);
  return k ? k[1] : t;
}

export const fmtType = t => ({ t20: 'টি-টোয়েন্টি', odi: 'ওয়ানডে', test: 'টেস্ট' })[String(t || '').toLowerCase()] || '';

// ক্রিকেটের অবস্থার লেখা বাংলায়। nameBn: ইংরেজি দলের নাম → বাংলা নাম (না থাকলে ইংরেজিই)
export function cricStatusBn(s, nameBn = x => x) {
  const t = String(s || '').trim();
  let m;
  if (!t) return '';
  if ((m = t.match(/^(.+?) won by (\d+) (run|wkt|wicket)s?/i))) return `${nameBn(m[1])} ${bnNum(m[2])} ${/run/i.test(m[3]) ? 'রানে' : 'উইকেটে'} জিতেছে`;
  if ((m = t.match(/^(.+?) won (the super over|by super over)/i))) return `সুপার ওভারে ${nameBn(m[1])} জিতেছে`;
  if ((m = t.match(/^(.+?) won/i))) return `${nameBn(m[1])} জিতেছে`;
  if ((m = t.match(/^(.+?) needs? (\d+) runs? (?:in|from|off) (\d+) balls?/i))) return `${gen(nameBn(m[1]))} জিততে ${bnNum(m[3])} বলে ${bnNum(m[2])} রান দরকার`;
  if ((m = t.match(/^(.+?) needs? (\d+) runs?/i))) return `${gen(nameBn(m[1]))} জিততে ${bnNum(m[2])} রান দরকার`;
  if ((m = t.match(/^(.+?) (?:opt|opted|elected|chose) to (bat|bowl|field)/i))) return `টস জিতে ${nameBn(m[1])} ${/bat/i.test(m[2]) ? 'ব্যাটিং' : 'বোলিং'} নিয়েছে`;
  if ((m = t.match(/^(.+?) (?:lead|leads) by (\d+) runs?/i))) return `${nameBn(m[1])} ${bnNum(m[2])} রানে এগিয়ে`;
  if ((m = t.match(/^(.+?) (?:trail|trails) by (\d+) runs?/i))) return `${nameBn(m[1])} ${bnNum(m[2])} রানে পিছিয়ে`;
  if (/not started|starts at|yet to begin/i.test(t)) return 'খেলা এখনো শুরু হয়নি';
  if (/innings break/i.test(t)) return 'ইনিংস বিরতি';
  if (/stumps/i.test(t)) return 'আজকের খেলা শেষ';
  if (/lunch/i.test(t)) return 'লাঞ্চ বিরতি';
  if (/tea/i.test(t)) return 'চা বিরতি';
  if (/rain|wet outfield|bad light|delayed/i.test(t)) return 'আবহাওয়ার কারণে খেলা বন্ধ';
  if (/drawn|draw/i.test(t)) return 'ম্যাচ ড্র হয়েছে';
  if (/tied/i.test(t)) return 'ম্যাচ টাই হয়েছে';
  if (/no result/i.test(t)) return 'ফলাফল হয়নি';
  if (/abandon/i.test(t)) return 'খেলা পরিত্যক্ত';
  if (/cancel/i.test(t)) return 'খেলা বাতিল';
  return t;
}

// ক্রিকেটের অবস্থা থেকে ফলাফল: 'a' | 'b' | 'd' | 'void' | null
export function cricResult(status, nameA, nameB) {
  const t = String(status || '');
  const w = t.match(/^(.+?) won/i);
  if (w) {
    const x = w[1].trim().toLowerCase();
    if (x === String(nameA).toLowerCase()) return 'a';
    if (x === String(nameB).toLowerCase()) return 'b';
    if (String(nameA).toLowerCase().startsWith(x)) return 'a';
    if (String(nameB).toLowerCase().startsWith(x)) return 'b';
    return null;
  }
  if (/drawn|draw/i.test(t)) return 'd';
  if (/tied|no result|abandon|cancel/i.test(t)) return 'void';
  return null;
}

// ওভার (১৫.৩ রকম সংখ্যা) ↔ বল
export const oversToBalls = o => { const n = Number(o) || 0; const f = Math.floor(n); return f * 6 + Math.round((n - f) * 10); };
export const ballsToOvers = b => Math.floor(b / 6) + (b % 6 ? '.' + (b % 6) : '');

export function dismissalBn(d) {
  const t = String(d || '').trim();
  if (!t || /^not out$/i.test(t)) return 'অপরাজিত';
  if (/^batting$/i.test(t)) return 'ব্যাট করছেন';
  return t;
}

export const FB_STAT = {
  'Ball Possession': 'বল দখল', 'Total Shots': 'মোট শট', 'Shots on Goal': 'লক্ষ্যে শট', 'Shots off Goal': 'লক্ষ্যের বাইরে শট',
  'Corner Kicks': 'কর্নার', 'Fouls': 'ফাউল', 'Yellow Cards': 'হলুদ কার্ড', 'Red Cards': 'লাল কার্ড', 'Offsides': 'অফসাইড',
  'Goalkeeper Saves': 'গোলকিপারের সেভ', 'Total passes': 'মোট পাস', 'Passes %': 'সঠিক পাস'
};

export const FB_PER = {
  TBD: 'সময় ঠিক হয়নি', NS: 'শুরু হয়নি', '1H': 'প্রথমার্ধ', HT: 'বিরতি', '2H': 'দ্বিতীয়ার্ধ', ET: 'অতিরিক্ত সময়',
  BT: 'অতিরিক্ত সময়ের বিরতি', P: 'টাইব্রেকার', SUSP: 'খেলা স্থগিত', INT: 'খেলা থেমে আছে', LIVE: 'চলছে',
  FT: 'খেলা শেষ', AET: 'অতিরিক্ত সময়ে শেষ', PEN: 'টাইব্রেকারে শেষ', PST: 'খেলা পিছিয়েছে', CANC: 'খেলা বাতিল',
  ABD: 'খেলা পরিত্যক্ত', AWD: 'কারিগরি জয়', WO: 'ওয়াকওভার'
};
