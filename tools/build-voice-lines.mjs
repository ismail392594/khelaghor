// সব মজার ডায়লগ খুঁজে api/_voice-lines.js বানায়। ডায়লগ বদলালে আবার চালান: node tools/build-voice-lines.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const files = ['js/fun.js', 'js/viral.js', 'js/ludo-engine.js', 'js/online.js', 'index.html', 'games/ludo/index.html', 'games/mosha/index.html', 'games/jam/index.html', 'games/loadshed/index.html', 'games/ekkadokka/index.html', 'games/marble/index.html', 'games/latim/index.html', 'games/dangguli/index.html', 'games/kanamachi/index.html', 'games/bazar/index.html', 'games/argbra/index.html', 'games/carrom/index.html', 'games/sholo/index.html', 'games/bagh/index.html', 'games/ghuri/index.html', 'games/hadudu/index.html', 'games/callbridge/index.html', 'games/twentynine/index.html', 'games/chess/index.html', 'games/gollachut/index.html', 'games/dariabandha/index.html', 'games/biryani/index.html', 'games/racer/index.html'];
const BN = /[ঀ-৿]/, lines = new Set();
const lit = /(['"])((?:(?!\1)[^\\\n]|\\.)*?)\1/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(lit)) {
    const s = m[2].trim();
    if (!BN.test(s) || s.length < 2 || s.length > 160 || /[<>{}=]|\$\{/.test(s)) continue;
    lines.add(s);
  }
}
// "{g} খেলবেন?" ধরনের লাইন সব গেমের নাম দিয়ে
const hub = readFileSync('index.html', 'utf8'), fun = readFileSync('js/fun.js', 'utf8');
const games = [...hub.matchAll(/\['([^']+)','(?:launch|trad|viral)'/g)].map(m => m[1]);
const tpl = [...fun.matchAll(/'([^'\n]*\{g\}[^'\n]*)'/g)].map(m => m[1]);
for (const t of tpl) for (const g of games) lines.add(t.replace('{g}', g));
// মশা মারোর রেকর্ডের লাইন
const mosha = readFileSync('games/mosha/index.html', 'utf8');
for (const m of mosha.matchAll(/\[\d+, '([^']+)'\]/g)) lines.add('নতুন রেকর্ড! আপনি ' + m[1]);
// ধাঁধার উত্তর "উত্তর: …" হিসেবে পড়া হয়
for (const m of hub.matchAll(/\['[^'\n]+','([^'\n]+)'\]/g)) lines.add('উত্তর: ' + m[1]);
const out = [...lines].sort();
writeFileSync('api/_voice-lines.js', '// স্বয়ংক্রিয়ভাবে তৈরি: tools/build-voice-lines.mjs\nexport default ' + JSON.stringify(out, null, 0).replace(/","/g, '",\n"') + ';\n');
console.log(out.length + ' lines, ' + out.join('').length + ' chars');
