// খেলাঘর ফানি ভিডিও: অ্যাডমিন ইউটিউব/টিকটক/ফেসবুক লিংক দেয়, সাইট আর গেমে সেগুলো চলে।
// লিংক থেকে ভিডিও চেনা, ছোট ছবি (থাম্বনেইল) আর প্লেয়ার বানানো এখানে।

export function parseVideo(url) {
  url = String(url || '').trim();
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i))) {
    const id = m[1], short = /shorts\//i.test(url);
    return { type: 'yt', id, short, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embed: (muted) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${id}` };
  }
  if ((m = url.match(/tiktok\.com\/(?:@[\w.-]+\/video|embed(?:\/v2)?|v)\/(\d{8,})/i))) {
    const id = m[1];
    return { type: 'tt', id, short: true, thumb: '', embed: () => `https://www.tiktok.com/embed/v2/${id}?autoplay=1` };
  }
  if (/(facebook\.com|fb\.watch)\//i.test(url)) {
    const reel = /\/reel\//i.test(url);
    return { type: 'fb', id: url, short: reel, thumb: '', embed: (muted) => `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=1&mute=${muted ? 1 : 0}` };
  }
  return null;
}

// ভিডিও কার্ড: প্রথমে ছবি, চাপলে বা দেখা গেলে (autoplay) প্লেয়ার
export function videoCard(v, opts) {
  opts = opts || {};
  const p = parseVideo(v.url); if (!p) return null;
  const el = document.createElement('figure');
  el.className = 'kvid' + (p.short ? ' tall' : '');
  const label = { yt: 'YouTube', tt: 'TikTok', fb: 'Facebook' }[p.type];
  el.innerHTML = `<div class="kv-box">${p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy">` : `<div class="kv-ph">${label}</div>`}<button class="kv-play" aria-label="ভিডিও চালান"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button></div>` +
    (v.title ? `<figcaption></figcaption>` : '');
  if (v.title) el.querySelector('figcaption').textContent = v.title;
  let on = false;
  el.play = (muted) => {
    if (on) return; on = true;
    const f = document.createElement('iframe');
    f.src = p.embed(muted !== false);
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true; f.loading = 'lazy'; f.title = v.title || label + ' ভিডিও';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    const box = el.querySelector('.kv-box'); box.innerHTML = ''; box.appendChild(f);
  };
  el.stop = () => { if (!on) return; on = false; const box = el.querySelector('.kv-box'); box.innerHTML = p.thumb ? `<img src="${p.thumb}" alt="">` : `<div class="kv-ph">${label}</div>`; const b = document.createElement('button'); b.className = 'kv-play'; b.setAttribute('aria-label', 'ভিডিও চালান'); b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'; box.appendChild(b); };
  el.addEventListener('click', e => { if (e.target.closest('.kv-play')) { opts.onPlay && opts.onPlay(el); el.play(false); } });
  return el;
}

// কোনো জায়গায় একটা ভিডিও (গেমের বিরতি/শেষ পর্দায়)
export function mountOne(host, list, opts) {
  const ok = (list || []).filter(v => v && v.on !== false && parseVideo(v.url));
  host.innerHTML = ''; if (!ok.length) { host.hidden = true; return null; }
  const v = ok[Math.floor(Math.random() * ok.length)], c = videoCard(v, opts);
  host.appendChild(c); host.hidden = false;
  if (opts && opts.autoplay) setTimeout(() => c.play(true), 300);
  return c;
}

export const VIDEO_CSS = `.kvid{margin:0;display:flex;flex-direction:column;gap:6px;min-width:0}
.kvid .kv-box{position:relative;width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#000;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.kvid.tall .kv-box{aspect-ratio:9/16;max-height:70vh}
.kvid img,.kvid iframe{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}
.kvid .kv-ph{position:absolute;inset:0;display:grid;place-items:center;font:800 1.1rem system-ui;color:#fff;background:linear-gradient(135deg,#25f4ee,#fe2c55)}
.kvid .kv-play{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px;border-radius:50%;border:0;background:rgba(255,0,0,.88);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)}
.kvid .kv-play svg{width:30px;height:30px}
.kvid figcaption{font-weight:700;font-size:.9rem;line-height:1.3}`;

// গেমের বিরতি/শেষ পর্দায় ভিডিও: <div class="gvid"></div> রাখলেই হয়।
// পর্দা খুললে একটা ভিডিও (শব্দ ছাড়া) চলে, বন্ধ হলে থেমে যায়।
export function attachGameVideos(subscribe) {
  let cfg = { list: [], games: true };
  const st = document.createElement('style');
  st.textContent = VIDEO_CSS + `.gvid{width:100%}.gvid .kvid.tall .kv-box{max-height:46vh;width:auto;margin:0 auto;aspect-ratio:9/16}.gvid::before{content:"বিরতিতে একটু হাসুন 😄";display:block;font-size:.78rem;font-weight:700;opacity:.75;margin-bottom:4px;text-align:left}`;
  document.head.appendChild(st);
  subscribe(c => { cfg = Object.assign({ list: [], games: true }, c || {}); });
  const hosts = [...document.querySelectorAll('.gvid')];
  hosts.forEach(h => {
    const over = h.parentElement.closest('.over, [hidden]') || h.parentElement;
    h.hidden = true;
    const sync = () => {
      const open = !over.hidden;
      if (open && !h.dataset.on && cfg.games !== false && cfg.list.length) { h.dataset.on = '1'; mountOne(h, cfg.list, { autoplay: !(navigator.connection && navigator.connection.saveData) }); }
      else if (!open && h.dataset.on) { delete h.dataset.on; h.innerHTML = ''; h.hidden = true; }
    };
    new MutationObserver(sync).observe(over, { attributes: true, attributeFilter: ['hidden'] });
  });
}
