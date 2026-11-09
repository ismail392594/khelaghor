# sw.js-এ দুই সেশনের মেলানোর গোলমাল ঠিক করা: সংস্করণ দুটোর বড়টা + ১, CORE তালিকা দুই দিকের মিলিয়ে
import re
p = 'sw.js'; s = open(p, encoding='utf-8').read()
m = re.search(r"<<<<<<< [^\n]*\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n", s, re.S)
if not m: print('গোলমাল নেই'); raise SystemExit
a, b = m.group(1), m.group(2)
v = max(int(x) for x in re.findall(r"khelaghor-v(\d+)", a + b)) + 1
items = []
for part in (a, b):
    c = re.search(r"const CORE = \[(.*?)\];", part)
    for x in re.findall(r"'[^']*'", c.group(1) if c else ''):
        if x not in items: items.append(x)
s = s[:m.start()] + f"const VERSION = 'khelaghor-v{v}';\nconst CORE = [" + ", ".join(items) + "];\n" + s[m.end():]
open(p, 'w', encoding='utf-8').write(s); print('v' + str(v), len(items))
