// খেলাঘর অনলাইন: Gmail লগইন, ইউজারনেম, পয়েন্ট, লিডারবোর্ড, বন্ধুকে ইনভাইট আর খেলার রুম
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, writeBatch, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { parseVideo, videoCard, VIDEO_CSS } from "./videos.js";
import { firebaseConfig, START_POINTS, DAILY_BONUS, ADSENSE_CLIENT, ADSENSE_SLOT, PREMIUM_PRICE, ADMIN_EMAILS } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const K = window.KH; // হাব পেজের সাহায্যকারী ফাংশন (toast, openS, closeS, setProfile ...)

let user = null, me = null, unsubs = [], roomUnsub = null, roomId = null, roomData = null;
const pendingRoom = (location.hash.match(/^#room-([A-Z0-9]{6})$/) || [])[1] || null;
// ক্যারম পেজ থেকে "অনলাইনে বন্ধুদের সাথে": #newroom-carrom-2 বা -4
const pendingNew = (location.hash.match(/^#newroom-carrom-([24])$/) || [])[1] || null;

/* ---------- লগইন ---------- */
const ERR = {
  'auth/popup-closed-by-user': 'লগইন উইন্ডো বন্ধ হয়ে গেছে, আবার চেষ্টা করুন',
  'auth/unauthorized-domain': 'এই ডোমেইন Firebase-এ যোগ করা হয়নি (Authentication → Settings → Authorized domains)',
  'auth/network-request-failed': 'ইন্টারনেট সংযোগ দেখুন, তারপর আবার চেষ্টা করুন',
  'auth/operation-not-allowed': 'Firebase-এ Google লগইন চালু করা হয়নি'
};
$('gLogin').onclick = async () => {
  $('lgErr').textContent = '';
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      try { await signInWithRedirect(auth, provider); } catch (e2) { $('lgErr').textContent = ERR[e2.code] || 'লগইন হয়নি: ' + e2.code; }
    } else $('lgErr').textContent = ERR[e.code] || 'লগইন হয়নি: ' + (e.code || e.message);
  }
};
getRedirectResult(auth).catch(e => { $('lgErr').textContent = ERR[e.code] || ''; });
$('phLogin').onclick = () => K.toast('ফোন নম্বর দিয়ে লগইন শিগগিরই চালু হবে, এখন Gmail দিয়ে ঢুকুন');
$('fbLogin').onclick = () => K.toast('Facebook লগইন শিগগিরই চালু হবে, এখন Gmail দিয়ে ঢুকুন');
$('guest').onclick = () => { try { sessionStorage.setItem('kh-guest', '1'); } catch (e) {} K.closeS('loginSheet'); K.toast('গেস্ট মোড: বন্ধুর সাথে খেলতে আর পয়েন্ট সেভ রাখতে লগইন করুন'); };
const isGuest = () => { try { return sessionStorage.getItem('kh-guest') === '1'; } catch (e) { return false; } };

/* প্রোফাইল শিট */
$('ava').onclick = () => {
  if (!user) { K.openS('loginSheet'); return; }
  if (!me) { K.openS('userSheet'); return; }
  $('pfName').textContent = me.name; $('pfUser').textContent = '@' + me.username;
  $('pfPts').textContent = bn(me.points); $('pfGames').textContent = bn(me.games || 0); $('pfWins').textContent = bn(me.wins || 0);
  getDoc(doc(db, 'private', user.uid)).then(d => { $('pfPhone').value = (d.exists() && d.data().phone) || ''; }).catch(() => {});
  $('pfErr').textContent = '';
  K.openS('profSheet');
};
$('pfPhForm').onsubmit = async e => {
  e.preventDefault();
  const p = toEn($('pfPhone').value.trim());
  if (p && !/^01[3-9]\d{8}$/.test(p)) { $('pfErr').textContent = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন'; return; }
  await savePrivate(p || null); $('pfErr').textContent = ''; K.toast('নম্বর সেভ হয়েছে');
};
$('pfOut').onclick = async () => { await signOut(auth); K.closeS('profSheet'); K.toast('লগআউট হয়েছে'); };

/* ---------- ইউজারনেম ---------- */
$('unLater').onclick = () => {
  try { sessionStorage.setItem('kh-un-later', '1'); } catch (e) {}
  K.closeS('userSheet');
  K.bubble && K.bubble('ঠিক আছে, ঘুরে দেখেন! খেলতে চাইলে ইউজারনেম লাগবে কিন্তু');
};
$('userForm').onsubmit = async e => {
  e.preventDefault();
  const un = $('unInput').value.trim().toLowerCase(), dn = $('dnInput').value.trim(), err = $('unErr');
  if (!/^[a-z0-9_]{3,15}$/.test(un)) { err.textContent = 'ইংরেজি ছোট অক্ষর, সংখ্যা আর _ দিয়ে ৩-১৫ অক্ষরের নাম দিন'; return; }
  if (!dn) { err.textContent = 'দেখানোর নাম লিখুন'; return; }
  if ($('phInput').value.trim() && !phoneVal()) { err.textContent = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন, অথবা খালি রাখুন'; return; }
  err.textContent = ''; $('unBtn').disabled = true;
  try {
    const taken = await getDoc(doc(db, 'usernames', un));
    if (taken.exists()) { err.textContent = '@' + un + ' আগেই কেউ নিয়ে নিয়েছে, অন্য নাম দিন'; $('unBtn').disabled = false; return; }
    const b = writeBatch(db);
    b.set(doc(db, 'usernames', un), { uid: user.uid });
    b.set(doc(db, 'users', user.uid), { username: un, name: dn, points: START_POINTS, games: 0, wins: 0, createdAt: serverTimestamp(), lastDaily: null });
    await b.commit();
    savePrivate(phoneVal());
    K.toast('স্বাগতম @' + un + '! উপহার হিসেবে ' + bn(START_POINTS) + ' পয়েন্ট পেলেন');
  } catch (e2) {
    err.textContent = e2.code === 'permission-denied' ? 'এই নামটা নেওয়া যাচ্ছে না, অন্য নাম দিন' : 'সেভ হয়নি: ' + (e2.code || e2.message);
  }
  $('unBtn').disabled = false;
};

/* Gmail ও ফোন আলাদা গোপন জায়গায়: শুধু খেলোয়াড় নিজে আর অ্যাডমিন দেখবে */
const toEn = s => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
function phoneVal() { const p = toEn($('phInput').value.trim()); return /^01[3-9]\d{8}$/.test(p) ? p : null; }
async function savePrivate(phone) {
  if (!user || !user.email) return;
  const data = { email: user.email, updatedAt: serverTimestamp() };
  if (phone !== undefined) data.phone = phone;
  try { await setDoc(doc(db, 'private', user.uid), data, { merge: true }); } catch (e) {}
}

/* ---------- লগইন অবস্থা ---------- */
onAuthStateChanged(auth, u => {
  unsubs.forEach(f => f()); unsubs = []; user = u; me = null; K.authed = false; K.banned = false; drawMyMsgs([]); checkMaint();
  if (!u) {
    K.setProfile({ name: 'খেলোয়াড়' }); document.querySelector('.lvl').textContent = 'অতিথি'; document.querySelector('.xp i').style.width = '0%';
    return;
  }
  K.closeS('loginSheet');
  unsubs.push(onSnapshot(doc(db, 'users', u.uid), snap => {
    if (!snap.exists()) {
      K.needsUsername = true;
      $('dnInput').value = (u.displayName || '').slice(0, 20);
      let later = false; try { later = sessionStorage.getItem('kh-un-later') === '1'; } catch (e) {}
      if (!later) K.openS('userSheet');
      return;
    }
    K.needsUsername = false;
    const first = !me; me = snap.data(); K.authed = !me.banned; K.banned = !!me.banned; K.closeS('userSheet'); $('loginT').textContent = 'খেলাঘরে স্বাগতম!';
    K.setProfile({ name: me.name });
    $('bal').textContent = bn(me.points);
    const lv = Math.floor(Math.sqrt(me.points / 500)) + 1, lo = 500 * (lv - 1) ** 2, hi = 500 * lv ** 2;
    document.querySelector('.lvl').textContent = 'লেভেল ' + bn(lv);
    document.querySelector('.xp i').style.width = Math.round(100 * (me.points - lo) / (hi - lo)) + '%';
    drawDaily(); drawPremium(); drawMission();
    if (first) { savePrivate(); listenInvites(); listenMyMsgs(); drawMission(); if (pendingRoom) joinRoom(pendingRoom); if (pendingNew) { history.replaceState(null, '', location.pathname); createRoom('ক্যারম', +pendingNew); } if (me.banned) K.toast('আপনার একাউন্ট আপাতত বন্ধ করা আছে। যোগাযোগ পাতায় অ্যাডমিনকে লিখুন।'); }
  }, e => K.toast('প্রোফাইল লোড হয়নি: ' + e.code)));
  listenLeaderboard();
});

/* ---------- দৈনিক বোনাস (সার্ভারে) ---------- */
const canDaily = () => !me.lastDaily || (Date.now() - me.lastDaily.toMillis()) > 20 * 3600e3;
function drawDaily() {
  if (!me) return;
  const ok = canDaily();
  $('dailyBtn').disabled = !ok; $('dailyBtn').textContent = ok ? 'নিন' : 'নেওয়া হয়েছে';
  $('dailyTxt').textContent = ok ? 'প্রতিদিন ফ্রি ' + bn(DAILY_BONUS) + ' পয়েন্ট' : 'কাল আবার আসবেন!';
}
$('dailyBtn').onclick = async () => {
  if (!user) { K.openS('loginSheet'); return; }
  if (!me || !canDaily()) return;
  $('dailyBtn').disabled = true;
  try {
    await updateDoc(doc(db, 'users', user.uid), { points: me.points + DAILY_BONUS, lastDaily: serverTimestamp() });
    K.showModal(DAILY_BONUS, 'আজকেও আসছেন? এই নেন চা-নাস্তার পয়েন্ট!');
  } catch (e) { K.toast('বোনাস নেওয়া যায়নি, একটু পরে চেষ্টা করুন'); drawDaily(); }
};

/* ---------- প্রিমিয়াম ও বিজ্ঞাপন ---------- */
const isPremium = () => !!(me && me.premiumUntil && me.premiumUntil.toMillis() > Date.now());
$('premBtn').textContent = '৳' + bn(PREMIUM_PRICE) + '/মাস';
function drawPremium() {
  const p = isPremium();
  $('ava').classList.toggle('premium', p);
  if (p) {
    const d = me.premiumUntil.toDate();
    $('premTxt').textContent = 'আপনি প্রিমিয়াম! মেয়াদ ' + bn(d.getDate()) + '/' + bn(d.getMonth() + 1) + '/' + bn(d.getFullYear()) + ' পর্যন্ত, কোনো বিজ্ঞাপন নেই';
    $('premBtn').textContent = 'চালু আছে ✓'; $('premBtn').disabled = true;
  }
  setupAds();
}
$('premBtn').onclick = () => {
  if (!user) { K.openS('loginSheet'); return; }
  if (!me) return;
  K.toast('প্রিমিয়াম নিতে ' + (site.payNumber ? 'বিকাশ/নগদে ' + site.payNumber + ' নম্বরে ' : 'অ্যাডমিনকে ') + '৳' + bn(PREMIUM_PRICE) + ' পাঠিয়ে যোগাযোগ পাতায় ইউজারনেম @' + me.username + ' জানান।');
};
document.querySelectorAll('.adfree').forEach(b => b.onclick = () => { document.getElementById('n-shop').click(); });
let adsLoaded = false;
function setupAds() {
  const slots = document.querySelectorAll('.adslot');
  if (!ADSENSE_CLIENT || isPremium()) { slots.forEach(s => s.hidden = true); return; }
  slots.forEach(s => s.hidden = false);
  if (adsLoaded) return; adsLoaded = true;
  const sc = document.createElement('script');
  sc.async = true; sc.crossOrigin = 'anonymous';
  sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
  document.head.appendChild(sc);
  slots.forEach(s => {
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle'; ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
    if (ADSENSE_SLOT) ins.setAttribute('data-ad-slot', ADSENSE_SLOT);
    ins.setAttribute('data-ad-format', 'auto'); ins.setAttribute('data-full-width-responsive', 'true');
    s.querySelector('.adbox').appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
}
setupAds();

/* দোকান: পেমেন্ট গেটওয়ে চালুর আগ পর্যন্ত অ্যাডমিন পয়েন্ট দেবে */
$('packs').onclick = e => {
  if (!e.target.closest('button')) return;
  K.toast(me ? 'পয়েন্ট কিনতে ' + (site.payNumber ? 'বিকাশ/নগদে ' + site.payNumber + ' নম্বরে টাকা পাঠিয়ে ' : '') + 'যোগাযোগ পাতায় ইউজারনেম @' + me.username + ' জানান' : 'আগে লগইন করুন');
};

/* ---------- লিডারবোর্ড ---------- */
const COLORS = ['#e5484d', '#3b78f0', '#2fa36b', '#f2b100', '#7c3aed', '#db2777', '#0f9488', '#f27a1a'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let lbTab = 'points', lbUnsub = null;
const LB_SUB = { points: 'মোট পয়েন্ট', autorickshaw: 'অটোরিকশা উল্টো পথে-এর সেরা স্কোর', porikkha: 'পরীক্ষার আগের রাত-এর সেরা স্কোর', chokka: 'শেষ বলে ছক্কা-এর সেরা স্কোর', jolabaddho: 'জলাবদ্ধতা রাইড-এর সেরা স্কোর', haat: 'কোরবানির হাট-এর সেরা স্কোর', fuchka: 'ফুচকা মাস্টার-এর সেরা স্কোর', metro: 'মেট্রোরেল রাশ-এর সেরা স্কোর', eidticket: 'ঈদের বাস টিকিট-এর সেরা স্কোর', rickshaw: 'রিকশা ভাড়া দরদাম-এর সেরা স্কোর', helper: 'লোকাল বাস হেলপার-এর সেরা স্কোর', bouchi: 'বউচি-এর সেরা স্কোর', nouka: 'নৌকা বাইচ-এর সেরা স্কোর', rumal: 'রুমাল চুরি-এর সেরা স্কোর', ekkadokka: 'এক্কা-দোক্কা-এর সেরা স্কোর', marble: 'মার্বেল-এর সেরা স্কোর', latim: 'লাটিম-এর সেরা স্কোর', dangguli: 'ডাংগুলি-এর সেরা স্কোর', kanamachi: 'কানামাছি-এর সেরা স্কোর', loadshed: 'লোডশেডিং সারভাইভালের সেরা স্কোর', mosha: 'মশা মারোর সেরা স্কোর', jam: 'জ্যাম রানারের সেরা স্কোর', bazar: 'বাজার দর চ্যালেঞ্জের সেরা স্কোর' , racer: 'হাইওয়ে রাজার সেরা স্কোর', bussim: 'বাস সিমুলেটরের সেরা আয়'};
function listenLeaderboard() {
  if (lbUnsub) lbUnsub();
  $('lbSub').textContent = LB_SUB[lbTab];
  const q = lbTab === 'points' ? query(collection(db, 'users'), orderBy('points', 'desc'), limit(10))
    : query(collection(db, 'scores', lbTab, 'players'), orderBy('score', 'desc'), limit(10));
  lbUnsub = onSnapshot(q, snap => {
    if (snap.empty) { $('lb').innerHTML = '<p class="sample">এখনো কেউ খেলেনি। আপনিই প্রথম হোন!</p>'; return; }
    $('lb').innerHTML = snap.docs.map((d, i) => {
      const r = d.data(), mine = user && d.id === user.uid, val = lbTab === 'points' ? r.points : r.score;
      return `<div class="row"${mine ? ' style="background:#f3efff;border-radius:12px"' : ''}><span class="rk">${bn(i + 1)}</span><span class="ra" style="background:${COLORS[i % COLORS.length]}">${esc((r.name || '?')[0])}</span><div><b>${esc(r.name)}${mine ? ' (আপনি)' : ''}</b><small>@${esc(r.username)}</small></div><span class="pts">${lbTab === 'points' ? '<span class="coin"></span>' : ''}${bn(val)}</span></div>`;
    }).join('');
  }, () => {});
  unsubs.push(() => { if (lbUnsub) { lbUnsub(); lbUnsub = null; } });
}
document.querySelectorAll('#lbTabs [data-lb]').forEach(b => b.onclick = () => {
  lbTab = b.dataset.lb; document.querySelectorAll('#lbTabs [data-lb]').forEach(x => x.setAttribute('aria-pressed', x === b));
  if (user) listenLeaderboard(); else $('lb').innerHTML = '<p class="sample">লগইন করলে সেরা খেলোয়াড়দের তালিকা দেখবেন</p>';
});

/* ---------- ইনভাইট পাওয়া ---------- */
let shownInvite = null;
function listenInvites() {
  unsubs.push(onSnapshot(query(collection(db, 'invites'), where('to', '==', user.uid), where('status', '==', 'pending')), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(x => x.createdAt && Date.now() - x.createdAt.toMillis() < 30 * 60e3)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    shownInvite = list[0] || null;
    $('invPop').hidden = !shownInvite;
    if (shownInvite) { $('invFrom').textContent = shownInvite.fromName + ' (@' + shownInvite.fromUser + ')'; $('invGame').textContent = shownInvite.game; }
  }));
}
$('invYes').onclick = async () => {
  if (!shownInvite) return; const inv = shownInvite;
  $('invPop').hidden = true;
  await updateDoc(doc(db, 'invites', inv.id), { status: 'accepted' }).catch(() => {});
  joinRoom(inv.room);
};
$('invNo').onclick = async () => {
  if (!shownInvite) return; const inv = shownInvite; $('invPop').hidden = true;
  await updateDoc(doc(db, 'invites', inv.id), { status: 'declined' }).catch(() => {});
};

/* ---------- রুম ---------- */
const SEAT = ['#e5484d', '#2fa36b', '#f2b100', '#3b78f0'];
function code() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
async function createRoom(game, max) {
  if (!user) { K.openS('loginSheet'); return; }
  if (!me) { K.openS('userSheet'); return; }
  const id = code();
  try {
    await setDoc(doc(db, 'rooms', id), { game, max, host: user.uid, status: 'waiting', createdAt: serverTimestamp(),
      uids: [user.uid], players: [{ uid: user.uid, name: me.name, username: me.username }] });
    openRoom(id);
  } catch (e) { K.toast('রুম বানানো যায়নি: ' + e.code); }
}
async function joinRoom(id) {
  if (!user || !me) return;
  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, 'rooms', id), s = await tx.get(ref);
      if (!s.exists()) throw new Error('nf');
      const r = s.data();
      if (r.uids.includes(user.uid)) return;
      if (r.status !== 'waiting') throw new Error('started');
      if (r.uids.length >= r.max) throw new Error('full');
      tx.update(ref, { uids: [...r.uids, user.uid], players: [...r.players, { uid: user.uid, name: me.name, username: me.username }] });
    });
    openRoom(id);
  } catch (e) {
    K.toast({ nf: 'রুমটা আর নেই', full: 'রুম ভরে গেছে', started: 'খেলা আগেই শুরু হয়ে গেছে' }[e.message] || 'রুমে ঢোকা যায়নি');
  }
  if (location.hash.startsWith('#room-')) history.replaceState(null, '', location.pathname);
}
function openRoom(id) {
  if (roomUnsub) roomUnsub();
  roomId = id; $('roomCode').textContent = id; $('invUser').value = ''; $('invErr').textContent = '';
  roomUnsub = onSnapshot(doc(db, 'rooms', id), s => {
    if (!s.exists()) { K.closeS('roomSheet'); K.toast('রুম বন্ধ করে দেওয়া হয়েছে'); roomUnsub && roomUnsub(); roomUnsub = null; return; }
    const r = roomData = s.data(), host = r.host === user.uid;
    $('roomT').textContent = r.game + ' · প্রাইভেট রুম';
    $('invTxt').value = `চলো ${r.game} খেলি! খেলাঘরে আমার রুমে আসো।\nরুম কোড: ${id}\n${location.origin}/#room-${id}`;
    $('seats').style.gridTemplateColumns = `repeat(${r.max},1fr)`;
    $('seats').innerHTML = Array.from({ length: r.max }, (_, i) => {
      const p = r.players[i];
      return p ? `<div class="seat on" style="--c:${SEAT[i]}"><span>${esc(p.name[0])}</span>${esc(p.name)}<small>@${esc(p.username)}</small></div>` : `<div class="seat"><span>+</span>খালি</div>`;
    }).join('');
    const n = r.players.length;
    $('roomStart').hidden = !host;
    const bad3 = r.game === 'ক্যারম' && n === 3;
    $('roomStart').disabled = n < 2 || bad3;
    $('roomStart').textContent = n < 2 ? 'বন্ধুর জন্য অপেক্ষা…' : bad3 ? 'ক্যারমে ২ বা ৪ জন লাগে, আরেকজন আসুক…' : 'খেলা শুরু (' + bn(n) + ' জন)';
    $('roomWait').hidden = host; $('roomWait').textContent = r.status === 'started' ? 'খেলা শুরু হয়েছে!' : 'হোস্ট খেলা শুরু করার অপেক্ষায়…';
    if (r.matchId && r.game === 'লুডু') { K.toast('খেলা শুরু! বোর্ডে নিয়ে যাচ্ছি…'); setTimeout(() => { location.href = '/games/ludo/?m=' + r.matchId; }, 600); }
    else if (r.game === 'ক্যারম' && r.cm && r.cm.status === 'playing') { K.toast('খেলা শুরু! ক্যারম বোর্ডে নিয়ে যাচ্ছি…'); setTimeout(() => { location.href = '/games/carrom/?r=' + id; }, 600); }
    else if (r.status === 'started' && r.game !== 'লুডু' && r.game !== 'ক্যারম') K.toast(r.game + ' এর অনলাইন খেলা শিগগিরই আসছে');
  });
  K.openS('roomSheet');
}
$('roomStart').onclick = async () => {
  if (!roomId || !roomData) return;
  if (roomData.game !== 'লুডু' && roomData.game !== 'ক্যারম') { K.toast(roomData.game + ' এর অনলাইন খেলা শিগগিরই আসছে, এখন লুডু খেলুন'); return; }
  const b = $('roomStart'); b.disabled = true; b.textContent = 'শুরু হচ্ছে…';
  if (roomData.game === 'ক্যারম') {
    try {
      const t = await user.getIdToken();
      const r = await fetch('/api/carrom', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'start', roomId }) });
      const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || 'শুরু করা যায়নি');
      location.href = '/games/carrom/?r=' + roomId;
    } catch (e) { K.toast(e.message); b.disabled = false; b.textContent = 'খেলা শুরু'; }
    return;
  }
  try {
    const t = await user.getIdToken();
    const r = await fetch('/api/ludo', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'room', roomId, entry: 100 }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || 'শুরু করা যায়নি');
    location.href = '/games/ludo/?m=' + j.matchId;
  } catch (e) { K.toast(e.message); b.disabled = false; b.textContent = 'খেলা শুরু'; }
};
$('roomClose').onclick = () => { if (roomUnsub) roomUnsub(); roomUnsub = null; K.closeS('roomSheet'); };

/* ইউজারনেম দিয়ে ইনভাইট পাঠানো */
$('invForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('invUser').value.trim().replace(/^@/, '').toLowerCase(), err = $('invErr');
  err.textContent = '';
  if (!/^[a-z0-9_]{3,15}$/.test(name)) { err.textContent = 'সঠিক ইউজারনেম লিখুন, যেমন rashed_99'; return; }
  if (name === me.username) { err.textContent = 'নিজেকে ইনভাইট করা যায় না 😄'; return; }
  try {
    const s = await getDoc(doc(db, 'usernames', name));
    if (!s.exists()) { err.textContent = '@' + name + ' নামে কাউকে পাওয়া যায়নি'; return; }
    if (roomData && roomData.uids.includes(s.data().uid)) { err.textContent = '@' + name + ' আগেই রুমে আছে'; return; }
    await addDoc(collection(db, 'invites'), { from: user.uid, fromName: me.name, fromUser: me.username, to: s.data().uid, toUser: name,
      game: roomData ? roomData.game : 'লুডু', room: roomId, status: 'pending', createdAt: serverTimestamp() });
    $('invUser').value = ''; K.toast('@' + name + '-কে ইনভাইট পাঠানো হয়েছে!');
  } catch (e2) { err.textContent = 'পাঠানো যায়নি: ' + (e2.code || e2.message); }
};
$('joinForm').onsubmit = e => {
  e.preventDefault();
  const c = $('joinCode').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(c)) { $('joinErr').textContent = '৬ অক্ষরের রুম কোড লিখুন'; return; }
  if (!user) { K.openS('loginSheet'); return; }
  $('joinErr').textContent = ''; K.closeS('modeSheet'); joinRoom(c);
};

/* হাব পেজের "বন্ধুকে ইনভাইট" বোতামে আসল রুম */
K.onFriend = (game, max) => createRoom(game, max);


/* ---------- অ্যাডমিন থেকে লাইভ: গেমের অবস্থা ---------- */
onSnapshot(doc(db, 'config', 'games'), d => {
  K.gameStatus = (d.exists() && d.data().status) || {};
  if (typeof window.drawGrid === 'function') window.drawGrid();
}, () => {});

/* ---------- সাইট সেটিং: ঘোষণা, যোগাযোগ, মেরামত মোড ---------- */
let site = {};
const isAdminUser = () => !!(user && ADMIN_EMAILS.includes(user.email));
function checkMaint() { $('maintAll').hidden = !(site.maintenance && !isAdminUser()); }
onSnapshot(doc(db, 'config', 'site'), d => {
  site = (d.exists() && d.data()) || {};
  // ঘোষণা
  let closed = ''; try { closed = localStorage.getItem('kh-notice-x') || ''; } catch (e) {}
  const n = (site.notice || '').trim();
  $('notice').hidden = !n || closed === n;
  $('noticeTxt').textContent = n;
  checkMaint();
  drawContacts();
}, () => {});
$('noticeX').onclick = () => { $('notice').hidden = true; try { localStorage.setItem('kh-notice-x', (site.notice || '').trim()); } catch (e) {} };

function drawContacts() {
  const C = [];
  if (site.whatsapp) C.push(['#25d366', 'W', 'WhatsApp', site.whatsapp, 'https://wa.me/88' + site.whatsapp.replace(/\D/g, '').replace(/^88/, '')]);
  if (site.facebook) C.push(['#1877f2', 'f', 'Facebook পেজ', site.facebook.replace(/^https:\/\/(www\.)?/, ''), site.facebook]);
  if (site.email) C.push(['#ea4335', '@', 'ইমেইল', site.email, '']);
  if (site.payNumber) C.push(['#e2136e', '৳', 'বিকাশ / নগদ', site.payNumber, '']);
  $('ctcCards').innerHTML = C.map(([c, i, t, v, href]) =>
    (href ? `<a class="cc" href="${esc(href)}" target="_blank" rel="noopener">` : '<div class="cc">') +
    `<i style="background:${c}">${i}</i><b>${t}</b><span>${esc(v)}</span>${href ? '<small>চাপ দিয়ে খুলুন</small>' : '<small>চেপে ধরে কপি করুন</small>'}` + (href ? '</a>' : '</div>')).join('');
  $('ctcCards').hidden = !C.length;
}

/* ---------- যোগাযোগ: বার্তা পাঠানো ও উত্তর দেখা ---------- */
$('cForm').onsubmit = async e => {
  e.preventDefault();
  const err = $('cErr'), text = $('cText').value.trim();
  if (!user) { K.openS('loginSheet'); return; }
  if (!me) { K.openS('userSheet'); return; }
  if (text.length < 5) { err.textContent = 'একটু বিস্তারিত লিখুন'; return; }
  err.textContent = ''; $('cSend').disabled = true;
  try {
    await addDoc(collection(db, 'messages'), { uid: user.uid, username: me.username, name: me.name, topic: $('cTopic').value, text, createdAt: serverTimestamp(), status: 'open', reply: null, repliedAt: null });
    $('cText').value = ''; K.showModal ? K.toast('বার্তা পৌঁছে গেছে! উত্তর এখানেই দেখবেন') : 0;
    K.bubble && K.bubble('বার্তা পাঠাইছেন, অ্যাডমিন ভাই চা শেষ কইরাই উত্তর দিবো!');
  } catch (e2) { err.textContent = 'পাঠানো যায়নি: ' + (e2.code || e2.message); }
  $('cSend').disabled = false;
};
const TOPIC = { problem: 'সমস্যা', points: 'পয়েন্ট/প্রিমিয়াম', idea: 'নতুন আইডিয়া', other: 'অন্যান্য' };
const when = ts => { if (!ts) return 'এইমাত্র'; const d = ts.toDate(); return bn(d.getDate()) + '/' + bn(d.getMonth() + 1) + ' ' + bn(String(d.getHours()).padStart(2, '0')) + ':' + bn(String(d.getMinutes()).padStart(2, '0')); };
function drawMyMsgs(list) {
  $('myCount').textContent = list.length ? bn(list.length) + 'টি' : '';
  $('myMsgs').innerHTML = list.length ? list.map(m => `<div class="mm"><div class="h"><span>${TOPIC[m.topic] || 'অন্যান্য'}</span><span>${when(m.createdAt)}</span></div><p>${esc(m.text)}</p>${m.reply ? `<div class="rp"><b>অ্যাডমিনের উত্তর:</b> ${esc(m.reply)}</div>` : m.status === 'closed' ? '<span class="wait">বন্ধ করা হয়েছে</span>' : '<span class="wait">উত্তরের অপেক্ষায়…</span>'}</div>`).join('')
    : '<p class="empty">' + (user ? 'এখনো কোনো বার্তা পাঠাননি।' : 'লগইন করে বার্তা পাঠালে এখানে উত্তর দেখবেন।') + '</p>';
  const answered = list.filter(m => m.reply).length;
  let seen = 0; try { seen = +localStorage.getItem('kh-replies-seen') || 0; } catch (e) {}
  $('replyDot').hidden = answered <= seen;
  if (!$('v-contact').hidden) try { localStorage.setItem('kh-replies-seen', answered); $('replyDot').hidden = true; } catch (e) {}
  if (answered > seen && seen >= 0 && list.length && $('v-contact').hidden) K.bubble && K.bubble('অ্যাডমিন আপনার বার্তার উত্তর দিছে! যোগাযোগ পাতায় দেখেন');
}
function listenMyMsgs() {
  unsubs.push(onSnapshot(query(collection(db, 'messages'), where('uid', '==', user.uid)), s => {
    drawMyMsgs(s.docs.map(d => d.data()).sort((a, b) => ((b.createdAt && b.createdAt.toMillis()) || Date.now()) - ((a.createdAt && a.createdAt.toMillis()) || Date.now())));
  }, () => {}));
}
$('n-contact').addEventListener('click', () => { const n = document.querySelectorAll('#myMsgs .rp').length; try { localStorage.setItem('kh-replies-seen', n); } catch (e) {} $('replyDot').hidden = true; });


/* ---------- বোনাস মিশন: টেলিগ্রাম ও ফেসবুক শেয়ার ---------- */
let bonusCfg = {};
const opened = { tg: false, fb: false };
try { Object.assign(opened, JSON.parse(sessionStorage.getItem('kh-mission') || '{}')); } catch (e) {}
const saveOpened = () => { try { sessionStorage.setItem('kh-mission', JSON.stringify(opened)); } catch (e) {} };
/* ফানি ভিডিও: অ্যাডমিনের দেওয়া লিংক, স্ক্রল করে দেখা গেলে নিজে চলে (শব্দ ছাড়া) */
let vidObs = null;
{ const st = document.createElement('style'); st.textContent = VIDEO_CSS; document.head.appendChild(st); }
function drawVideos(cfg) {
  const box = document.getElementById('vids'), sec = document.getElementById('vidSec'); if (!box) return;
  const list = (cfg.list || []).filter(v => v && v.on !== false && parseVideo(v.url));
  sec.hidden = box.hidden = !list.length; box.innerHTML = ''; if (vidObs) vidObs.disconnect();
  if (!list.length) return;
  const hold = on => window.KH && window.KH.holdMusic && window.KH.holdMusic(on);
  const cards = list.map(v => videoCard(v, { onPlay: el => { cards.forEach(c => c !== el && c.stop()); hold(true); } })).filter(Boolean);
  const active = () => !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  cards.forEach(c => box.appendChild(c));
  if (cfg.auto === false || !('IntersectionObserver' in window)) return;
  const save = navigator.connection && navigator.connection.saveData;
  if (save) return; // ডাটা সেভার চালু থাকলে নিজে চলবে না
  vidObs = new IntersectionObserver(es => es.forEach(e => {
    const c = e.target;
    if (e.isIntersecting && e.intersectionRatio > .6) { cards.forEach(o => o !== c && o.stop()); const snd = active(); c.play(!snd); if (snd) hold(true); }
    else if (!e.isIntersecting) { c.stop(); if (!cards.some(o => o.querySelector('iframe'))) hold(false); }
  }), { threshold: [0, .6] });
  cards.forEach(c => vidObs.observe(c));
  // প্রথম ছোঁয়ার পর চলতে থাকা ভিডিও শব্দসহ আবার চালু
  const unmute = () => { const c = cards.find(x => { const f = x.querySelector('iframe'); return f && /mute=1/.test(f.src); }); if (c) { c.stop(); c.play(false); hold(true); } };
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, unmute, { once: true }));
}
onSnapshot(doc(db, 'config', 'music'), d => { const c = (d.exists() && d.data()) || {}; window.__khSongs = c; window.KH && window.KH.setSongs && window.KH.setSongs(c); }, () => {});
onSnapshot(doc(db, 'config', 'videos'), d => drawVideos((d.exists() && d.data()) || {}), () => {});
onSnapshot(doc(db, 'config', 'bonus'), d => { bonusCfg = (d.exists() && d.data()) || {}; drawMission(); }, () => {});
function drawMission() {
  const b = bonusCfg, tgOn = !!(b.tgOn && b.tgLink), fbOn = !!b.fbOn;
  const tgDone = !!(me && me.tgDone), fbDone = !!(me && me.fbDone);
  const showTg = tgOn && !tgDone, showFb = fbOn && !fbDone;
  $('mission').hidden = !(showTg || showFb);
  $('tTg').hidden = !showTg; $('tFb').hidden = !showFb;
  const total = (showTg ? b.tgAmount || 0 : 0) + (showFb ? b.fbAmount || 0 : 0);
  $('mTotal').textContent = 'মোট +' + bn(total) + ' পয়েন্ট';
  $('tTgAmt').textContent = '+' + bn(b.tgAmount || 0) + ' পয়েন্ট';
  $('tFbAmt').textContent = '+' + bn(b.fbAmount || 0) + ' পয়েন্ট';
  if (b.tgLink) $('tTgGo').href = b.tgLink;
  const site = location.origin + '/';
  $('tFbGo').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(site) + '&quote=' + encodeURIComponent(b.fbText || 'খেলাঘরে চলো একসাথে খেলি!');
  $('tTgClaim').hidden = !opened.tg; $('tFbClaim').hidden = !opened.fb;
}
function goTask(key, e) {
  if (!user || !me) { e.preventDefault(); $('loginT').textContent = 'আগে লগইন করেন, তারপর বোনাস নেন!'; K.openS('loginSheet'); return; }
  setTimeout(() => { opened[key] = true; saveOpened(); drawMission(); K.bubble && K.bubble('কাজ শেষ হইলে ফিরে এসে "নিন" চাপেন!'); }, 1500);
}
$('tTgGo').addEventListener('click', e => goTask('tg', e));
$('tFbGo').addEventListener('click', e => goTask('fb', e));
async function claim(key) {
  if (!user || !me) return;
  const amt = key === 'tg' ? bonusCfg.tgAmount : bonusCfg.fbAmount, field = key + 'Done';
  const btn = $(key === 'tg' ? 'tTgClaim' : 'tFbClaim'); btn.disabled = true;
  try {
    await updateDoc(doc(db, 'users', user.uid), { points: me.points + amt, [field]: true });
    K.showModal(amt, key === 'tg' ? 'টেলিগ্রামে আসার জন্য ধন্যবাদ! এই নেন বোনাস!' : 'শেয়ার করার জন্য ধন্যবাদ! বন্ধুরাও আসুক!');
  } catch (e) { K.toast('বোনাস নেওয়া যায়নি, একটু পরে চেষ্টা করুন'); }
  btn.disabled = false;
}
$('tTgClaim').onclick = () => claim('tg');
$('tFbClaim').onclick = () => claim('fb');
