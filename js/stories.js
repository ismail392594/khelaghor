// হাবের "গল্পের আসর": ডাটাবেজে সেভ করা গল্প, কবিতা, ইতিহাস। পড়া যায়, চাইলে AI কণ্ঠে শোনা যায়।
import { splitStory } from '/js/story-split.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const TYPES = { golpo: ['ছোটগল্প', '📖', 'F2'], kobita: ['কবিতা', '🪶', 'N1'], itihas: ['ইতিহাস', '🏛️', 'M1'], lok: ['লোককাহিনী', '🧙', 'C1'], moja: ['মজার গল্প', '😂', 'M2'], biggan: ['জানার আনন্দ', '🔭', 'F1'], uponnas: ['উপন্যাস', '📚', 'F2'] };
const GRAD = { golpo: ['#ff9a5a', '#e0335a'], kobita: ['#a78bfa', '#7c3aed'], itihas: ['#d4a373', '#8a5a2b'], lok: ['#34d399', '#0f9488'], moja: ['#facc15', '#f27a1a'], biggan: ['#38bdf8', '#2563eb'], uponnas: ['#f472b6', '#9d174d'] };
let items = [], filter = 'all', cur = null, audio = null, part = 0, parts = [], playing = false;

async function load() {
  try {
    const r = await fetch('/api/story?list=1'); if (!r.ok) return;
    items = (await r.json()).items || [];
  } catch (e) { return; }
  if (!items.length) return;
  $('stSec').hidden = $('stRow').hidden = $('stChips').hidden = false;
  const have = new Set(items.map(x => x.type));
  $('stChips').innerHTML = `<button class="chip" data-st="all" aria-pressed="true">সব</button>` + Object.keys(TYPES).filter(k => have.has(k)).map(k => `<button class="chip" data-st="${k}" aria-pressed="false">${TYPES[k][1]} ${TYPES[k][0]}</button>`).join('');
  $('stChips').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; filter = b.dataset.st; $('stChips').querySelectorAll('[data-st]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
  draw();
  const h = (location.hash.match(/^#story-([A-Za-z0-9]{10,40})$/) || [])[1]; if (h) open(h);
}
function draw() {
  const list = items.filter(x => filter === 'all' || x.type === filter);
  $('stRow').innerHTML = list.map(x => { const T = TYPES[x.type] || TYPES.golpo, [a, b] = GRAD[x.type] || GRAD.golpo;
    return `<button class="stc" data-id="${x.id}" style="--a:${a};--b:${b}"><span class="ic">${T[1]}</span><em>${x.type === 'uponnas' && x.seriesTitle ? esc(x.seriesTitle) + ' · পর্ব ' + bn(x.chapter) : T[0]}</em><b>${esc(x.title)}</b><small>${esc(x.summary)}</small><span class="mn">${bn(Math.max(1, Math.round(x.len / 900)))} মিনিট পড়া · 🔊</span></button>`; }).join('');
  $('stRow').onclick = e => { const b = e.target.closest('[data-id]'); if (b) open(b.dataset.id); };
}
async function open(id) {
  stop(); const x = items.find(i => i.id === id); if (!x) return;
  const T = TYPES[x.type] || TYPES.golpo;
  $('rdT').textContent = x.title; $('rdTag').textContent = T[1] + ' ' + (x.type === 'uponnas' && x.seriesTitle ? x.seriesTitle + ' · পর্ব ' + bn(x.chapter) : T[0]);
  $('rdBody').innerHTML = '<p class="muted">লোড হচ্ছে…</p>'; $('rdNext').hidden = true; $('readSheet').hidden = false;
  try {
    const r = await fetch('/api/story?id=' + id); const j = await r.json(); if (!r.ok) throw new Error(j.error);
    cur = j; parts = splitStory(j.title, j.body); part = 0;
    $('rdBody').innerHTML = j.body.split(/\n\s*\n/).map(p => `<p${x.type === 'kobita' ? ' class="poem"' : ''}>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    $('rdBody').scrollTop = 0; $('rdPlay').textContent = '🔊 শুনুন'; $('rdPlay').disabled = false;
    const nx = x.series ? items.find(i => i.series === x.series && i.chapter === x.chapter + 1) : null;
    $('rdNext').hidden = !nx; if (nx) $('rdNext').onclick = () => open(nx.id);
    try { history.replaceState(null, '', '#story-' + id); } catch (e) {}
  } catch (e) { $('rdBody').innerHTML = '<p class="muted">লেখাটা আনা যায়নি, একটু পরে চেষ্টা করুন।</p>'; }
}
function playPart() {
  if (!cur || part >= parts.length) { stop(); return; }
  const v = (TYPES[cur.type] || TYPES.golpo)[2];
  audio = new Audio(`/api/voice?s=${cur.id}&p=${part}&v=${v}&u=${cur.at || 0}`);
  audio.onended = () => { part++; if (playing) playPart(); };
  audio.onerror = () => { stop(); $('rdPlay').textContent = '🔇 ভয়েস এখন নেই'; };
  audio.play().catch(() => { stop(); $('rdPlay').textContent = '🔇 ভয়েস এখন নেই'; });
  // পরের অংশ আগেই আনিয়ে রাখা, যাতে মাঝে থামতে না হয়
  if (part + 1 < parts.length) fetch(`/api/voice?s=${cur.id}&p=${part + 1}&v=${v}&u=${cur.at || 0}`).catch(() => {});
  $('rdPlay').textContent = `⏸ থামান (${bn(part + 1)}/${bn(parts.length)})`;
}
function stop() { playing = false; if (audio) { audio.pause(); audio = null; } $('rdPlay').textContent = '🔊 শুনুন'; try { window.KH && window.KH.holdMusic && window.KH.holdMusic(false); } catch (e) {} }
$('rdPlay').onclick = () => { if (playing) { stop(); return; } playing = true; try { window.KH && window.KH.holdMusic && window.KH.holdMusic(true); } catch (e) {} playPart(); };
$('rdClose').onclick = () => { stop(); $('readSheet').hidden = true; try { history.replaceState(null, '', location.pathname); } catch (e) {} };
$('rdShare').onclick = () => { if (!cur) return; const t = `"${cur.title}" — খেলাঘরের গল্পের আসরে পড়ুন বা শুনুন: ${location.origin}/#story-${cur.id}`; try { navigator.clipboard.writeText(t).then(() => { $('rdShare').textContent = 'কপি হয়েছে ✓'; setTimeout(() => $('rdShare').textContent = 'লিংক কপি', 2000); }); } catch (e) {} };
new MutationObserver(() => { if ($('readSheet').hidden) stop(); }).observe($('readSheet'), { attributes: true, attributeFilter: ['hidden'] });
load();
