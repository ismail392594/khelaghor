// চ্যালেঞ্জ লিংক: "রাকিব ৯৮০ পেয়েছে, হারাতে পারবেন?" — খেলা শেষে বন্ধুকে চ্যালেঞ্জ পাঠানো আর ফলাফল মেলানো
(function () {
  const BN = '০১২৩৪৫৬৭৮৯', bn = n => String(n).replace(/\d/g, d => BN[d]);
  const toNum = t => parseInt(String(t || '').replace(/[০-৯]/g, d => BN.indexOf(d)).replace(/[^\d]/g, ''), 10) || 0;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const q = new URLSearchParams(location.search);
  let ch = null;
  if (q.get('c') && q.get('s')) { ch = { name: q.get('c').slice(0, 24), score: Math.min(1e6, toNum(q.get('s'))) }; try { sessionStorage.setItem('kh-ch-' + location.pathname, JSON.stringify(ch)); } catch (e) {} }
  else { try { ch = JSON.parse(sessionStorage.getItem('kh-ch-' + location.pathname) || 'null'); } catch (e) {} }
  const scoreEl = () => document.getElementById('eS') || document.getElementById('eSc');
  const card = id => { const o = document.getElementById(id); return o && o.querySelector('.card'); };
  const box = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.cssText = 'padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(239,68,68,.22),rgba(250,204,21,.18));border:1px solid rgba(250,204,21,.6);font-weight:700;font-size:.9rem;line-height:1.45;text-align:center'; return d; };
  function startBanner() {
    if (!ch) return; const c = card('startO'); if (!c || c.querySelector('.chBan')) return;
    c.insertBefore(box('chBan', `⚔️ <b>${esc(ch.name)}</b> পেয়েছে <b>${bn(ch.score)}</b> পয়েন্ট!<br>হারাতে পারবেন?`), c.children[1] || null);
  }
  function endBox() {
    const c = card('endO'); if (!c) return; const acts = c.querySelector('.acts'); const sc = toNum(scoreEl() && scoreEl().textContent);
    let r = c.querySelector('.chRes'); if (r) r.remove();
    if (ch) {
      const win = sc > ch.score, tie = sc === ch.score;
      r = box('chRes', win ? `🏆 আপনি <b>${esc(ch.name)}</b>-কে হারিয়ে দিলেন! (${bn(sc)} বনাম ${bn(ch.score)})<br>এবার আপনি চ্যালেঞ্জ পাঠান!` : tie ? `🤝 <b>${esc(ch.name)}</b>-এর সাথে সমান সমান!` : `😅 <b>${esc(ch.name)}</b>-কে ধরতে আর <b>${bn(ch.score - sc)}</b> পয়েন্ট লাগতো। আবার চেষ্টা করুন!`);
      c.insertBefore(r, acts || null);
    }
    if (!c.querySelector('.chSend')) {
      const w = document.createElement('div'); w.className = 'chSend'; w.style.cssText = 'display:flex;gap:8px;align-items:center';
      w.innerHTML = '<input maxlength="20" placeholder="আপনার নাম" aria-label="আপনার নাম" style="flex:1;min-width:0;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.25);color:inherit;font:600 .95rem inherit"><button class="gbtn" style="white-space:nowrap;background:linear-gradient(180deg,#f87171,#dc2626);color:#fff;box-shadow:0 4px 0 #7f1d1d">⚔️ চ্যালেঞ্জ পাঠান</button>';
      const inp = w.querySelector('input'); inp.value = st.get('kh-cname') || '';
      w.querySelector('button').onclick = async () => {
        const name = (inp.value || '').trim() || 'এক বন্ধু'; st.set('kh-cname', name);
        const s = toNum(scoreEl() && scoreEl().textContent), url = location.origin + location.pathname + '?c=' + encodeURIComponent(name) + '&s=' + s;
        const game = (document.title || '').split('·')[0].trim(), text = `আমি ${game}-এ ${bn(s)} পয়েন্ট পেয়েছি! পারলে হারাও 😎`;
        if (navigator.share) { try { await navigator.share({ title: 'খেলাঘর চ্যালেঞ্জ', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(text + ' ' + url); w.querySelector('button').textContent = 'লিংক কপি হয়েছে ✓'; } catch (e) { inp.value = url; inp.select(); }
      };
      c.insertBefore(w, acts || null);
    }
  }
  function setup() {
    startBanner();
    const end = document.getElementById('endO'); if (end) new MutationObserver(() => { if (!end.hidden) setTimeout(endBox, 60); }).observe(end, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
