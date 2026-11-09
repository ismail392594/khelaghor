# কমেন্টের পরে ভুল করে কোড থেকে গেছে কিনা খোঁজে (যেমন "x = 1; // মন্তব্য y = 2;" — y = 2 চলবে না)
# চালান: python3 tools/check-inline-comments.py  (কিছু পেলে exit 1)
import re, glob, sys
bad = 0
for f in glob.glob('games/**/*.html', recursive=True) + glob.glob('js/*.js') + glob.glob('api/*.js') + ['index.html']:
    if 'vendor' in f: continue
    for n, l in enumerate(open(f, encoding='utf8').read().split('\n'), 1):
        if l.strip().startswith('//') or '://' in l: continue
        m = re.search(r'(?<![:\'"/\\])//\s', l)
        if m and re.search(r';\s*[A-Za-z_$][\w$.]*\s*[\(=\.\[]', l[m.end():]):
            print(f'{f}:{n}: কমেন্টের পরে কোড: …{l[m.end():][:100]}'); bad += 1
sys.exit(1 if bad else 0)
