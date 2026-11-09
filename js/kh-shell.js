// নতুন গেমগুলোর সাধারণ কাঠামো: লগইন, মেরামত মোড, সেরা স্কোর, লিডারবোর্ড, স্কোর জমা, শব্দ চালু/বন্ধ।
// প্রতিটা গেম শুধু নিজের খেলাটা লেখে; পাতার এই আইডিগুলো থাকলেই চলে:
//   #gate #gateT #gateP (বন্ধ থাকলে), #bestTxt, #lb1 #lb2 (লিডারবোর্ড), #eBest, #snd (শব্দ বোতাম)
// ব্যবহার: const sh = gameShell({ game: 'kanamachi', name: 'কানামাছি', lbTitle: 'সেরা কানামাছি' });
//          sh.saveScore(৪২০); sh.best(); sh.sndOn; sh.onSound(fn)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAILS } from "/js/firebase-config.js";
import { attachGameVideos } from "/js/videos.js";

export const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const $ = id => document.getElementById(id);

export function gameShell({ game, name, lbTitle = 'সেরা খেলোয়াড়', offTitle = 'আজ বন্ধ!', offMsg = 'একটু মেরামত চলছে, পরে আসেন।' }) {
  const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app), bestKey = 'kh-' + game + '-best';
  attachGameVideos(cb => onSnapshot(doc(db, 'config', 'videos'), d => cb(d.exists() ? d.data() : {}), () => {}));
  let user = null, prof = null, gameSt = 'live', siteMaint = false, top = [], sndOn = store.get('kh-sfx', true); const sndFns = [];
  function gate() {
    const admin = user && ADMIN_EMAILS.includes(user.email), off = !admin && (gameSt === 'maint' || gameSt === 'hidden' || siteMaint);
    if ($('gateT')) { if (off) { $('gateT').textContent = offTitle; $('gateP').textContent = offMsg; } else if (user && prof && prof.banned) { $('gateT').textContent = 'একাউন্ট বন্ধ'; $('gateP').textContent = 'হাবের যোগাযোগ পাতায় অ্যাডমিনকে লিখুন।'; } }
    window.KH_GUEST = !(user && prof); if ($('gate')) $('gate').hidden = !((prof && prof.banned) || off);
  }
  function best() { const b = store.get(bestKey, 0); if ($('bestTxt')) $('bestTxt').textContent = b ? 'আপনার সেরা স্কোর: ' + bn(b) : ''; return b; }
  function drawLB() { const h = top.length ? `<h3>${esc(lbTitle)}</h3>` + top.map((r, i) => `<div class="${user && r.id === user.uid ? 'me' : ''}"><em>${bn(i + 1)}</em><span>${esc(r.name)}</span><b>${bn(r.score)}</b></div>`).join('') : ''; ['lb1', 'lb2'].forEach(id => { if ($(id)) $(id).innerHTML = h; }); }
  onAuthStateChanged(auth, u => {
    user = u; if (!u) { prof = null; gate(); return; }
    onSnapshot(doc(db, 'users', u.uid), s => { prof = s.exists() ? s.data() : null; gate(); }, () => { prof = null; gate(); });
    getDoc(doc(db, 'scores', game, 'players', u.uid)).then(d => { if (d.exists() && d.data().score > store.get(bestKey, 0)) store.set(bestKey, d.data().score); best(); }).catch(() => {});
  });
  onSnapshot(doc(db, 'config', 'games'), d => { gameSt = ((d.exists() && d.data().status) || {})[name] || 'live'; if (gameSt === 'soon') gameSt = 'live'; gate(); }, () => {});
  onSnapshot(doc(db, 'config', 'site'), d => { siteMaint = !!(d.exists() && d.data().maintenance); gate(); }, () => {});
  onSnapshot(query(collection(db, 'scores', game, 'players'), orderBy('score', 'desc'), limit(10)), s => { top = (s.docs || []).map(d => ({ id: d.id, ...d.data() })); drawLB(); }, () => {});
  // শেষ স্কোর: নিজের সেরা মনে রাখা, লগইন থাকলে লিডারবোর্ডে (নিয়ম: আগের চেয়ে বেশি হলে, ৩০ সেকেন্ডে একবার)
  async function saveScore(sc) {
    sc = Math.max(0, Math.min(100000, Math.round(sc))); const b = store.get(bestKey, 0); if (sc > b) store.set(bestKey, sc);
    if ($('eBest')) $('eBest').textContent = 'আপনার সেরা: ' + bn(Math.max(b, sc)); best();
    if (!user || !prof || sc <= 0) return;
    try { const ref = doc(db, 'scores', game, 'players', user.uid), d = await getDoc(ref); if (d.exists() && d.data().score >= sc) return; await setDoc(ref, { score: sc, name: prof.name, username: prof.username, at: serverTimestamp() }); } catch (e) {}
  }
  const sb = $('snd'); if (sb) { sb.classList.toggle('off', !sndOn); sb.onclick = () => { sndOn = !sndOn; store.set('kh-sfx', sndOn); sb.classList.toggle('off', !sndOn); sndFns.forEach(f => f(sndOn)); }; }
  best();
  return { saveScore, best, get sndOn() { return sndOn; }, onSound: f => sndFns.push(f), get user() { return user; }, get prof() { return prof; } };
}

// ছোট শব্দ-যন্ত্র: সুর, নয়েজ, আর বারবার বাজা নয়েজ লুপ (ঝিঁঝিঁ, ভিড়)
export function sound(sh) {
  let ac = null, master = null, NB = null;
  const ok = () => { if (!sh.sndOn) return null; if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; };
  sh.onSound(on => { if (master) master.gain.value = on ? .9 : 0; });
  const nbuf = () => { if (!NB) { const n = ac.sampleRate * 2; NB = ac.createBuffer(1, n, ac.sampleRate); const x = NB.getChannelData(0); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1; } return NB; };
  return {
    get ac() { return ok(); }, get out() { ok(); return master; },
    tone(fr, d, type = 'sine', v = .2, to, at = 0, dest) { const a = ok(); if (!a) return; const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(fr, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + .03); },
    noise(d, v = .3, fr = 1200, type = 'lowpass', at = 0, dest) { const a = ok(); if (!a) return; const t = a.currentTime + at, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = nbuf(); f.type = type; f.frequency.value = fr; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random()); s.stop(t + d + .05); },
    loop(type = 'bandpass', fr = 800, q = 1) { const a = ok(); if (!a) return null; const s = a.createBufferSource(); s.buffer = nbuf(); s.loop = true; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = fr; f.Q.value = q; const g = a.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { f, g }; },
    // জায়গা অনুযায়ী শব্দ (বাম-ডান, কাছে-দূরে): ৩ডি PannerNode
    panner(x, y, z) { const a = ok(); if (!a) return null; const p = a.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.2; p.rolloffFactor = 1.1; p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; p.connect(master); return p; },
    listener(px, py, pz, fx, fz) { const a = ok(); if (!a) return; const L = a.listener; if (L.positionX) { L.positionX.value = px; L.positionY.value = py; L.positionZ.value = pz; L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; } else { L.setPosition(px, py, pz); L.setOrientation(fx, 0, fz, 0, 1, 0); } }
  };
}
