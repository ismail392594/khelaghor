# নতুন গেমকে সাইটের সব জায়গায় যোগ করা (একবারই চালাতে হয়; দুবার চালালে কিছু বদলায় না)
#   python3 tools/add-game.py <key> "<বাংলা নাম>" "<ইমোজি>" "<লিডারবোর্ডের ছোট নাম>" "<কতজন, যেমন ১>"
# যা করে: index.html (GAMES-এ লিংক, SHOT, লিডারবোর্ড চিপ), admin (লিংক, স্কোর তালিকা, BUILT), sw.js CORE,
# sitemap.xml, js/fun.js SOLO, js/online.js LB_SUB, tools/build-voice-lines.mjs।
# নিজে করতে হবে: js/howto.js-এর নোট, help/index.html-এর অংশ, icons/shots/<key>.webp আর icons/og/<key>.jpg, NEXT.md।
import re, sys
key, name, emoji, short, players = sys.argv[1:6]
url = f'/games/{key}/'
def edit(p, fn):
    s = open(p, encoding='utf-8').read(); t = fn(s)
    if t != s: open(p, 'w', encoding='utf-8').write(t); print('✓', p)
    else: print('·', p, '(আগেই আছে বা বদলায়নি)')
def idx(s):
    if url in s: return s
    s = re.sub(r"\['" + re.escape(name) + r"','(\w+)'\]", lambda m: f"['{name}','{m.group(1)}','{url}']", s, count=1)
    s = s.replace("const SHOT={", f"const SHOT={{'{name}':'{key}',", 1)
    s = s.replace('<button class="chip" data-lb="loadshed" aria-pressed="false">লোডশেডিং</button>', f'<button class="chip" data-lb="loadshed" aria-pressed="false">লোডশেডিং</button>\n      <button class="chip" data-lb="{key}" aria-pressed="false">{short}</button>', 1)
    if players: s = s.replace("const PL={", f"const PL={{'{name}':'{players}',", 1)
    return s
edit('index.html', idx)
def adm(s):
    if url in s: return s
    s = s.replace('<a href="/games/loadshed/" target="_blank" rel="noopener">🕯️ লোডশেডিং সারভাইভাল</a>', f'<a href="/games/loadshed/" target="_blank" rel="noopener">🕯️ লোডশেডিং সারভাইভাল</a>\n      <a href="{url}" target="_blank" rel="noopener">{emoji} {name}</a>', 1)
    s = s.replace('<option value="loadshed">লোডশেডিং সারভাইভাল</option>', f'<option value="loadshed">লোডশেডিং সারভাইভাল</option><option value="{key}">{name}</option>', 1)
    s = s.replace("const BUILT={", f"const BUILT={{'{name}':'{url}',", 1)
    return s
edit('admin/index.html', adm)
edit('sw.js', lambda s: s if f"'{url}'" in s else s.replace("'/games/loadshed/',", f"'/games/loadshed/', '{url}',", 1))
edit('sitemap.xml', lambda s: s if url in s else s.replace('  <url><loc>https://khelaghorbd.online/games/loadshed/</loc>', f'  <url><loc>https://khelaghorbd.online{url}</loc><lastmod>2026-11-10</lastmod><priority>0.8</priority></url>\n  <url><loc>https://khelaghorbd.online/games/loadshed/</loc>', 1))
edit('js/fun.js', lambda s: s if f"'{name}': 1" in s else s.replace("  const SOLO = { ", f"  const SOLO = {{ '{name}': 1, ", 1))
edit('js/online.js', lambda s: s if f"{key}:" in s.split('const LB_SUB')[1][:3000] else s.replace("const LB_SUB = { points: 'মোট পয়েন্ট',", f"const LB_SUB = {{ points: 'মোট পয়েন্ট', {key}: '{name}-এর সেরা স্কোর',", 1))
edit('tools/build-voice-lines.mjs', lambda s: s if f'games/{key}/' in s else s.replace("'games/loadshed/index.html',", f"'games/loadshed/index.html', 'games/{key}/index.html',", 1))
