// খেলাঘর অনলাইন: Gmail লগইন, ইউজারনেম, পয়েন্ট, লিডারবোর্ড, বন্ধুকে ইনভাইট আর খেলার রুম
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, writeBatch, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, START_POINTS, DAILY_BONUS, ADSENSE_CLIENT, ADSENSE_SLOT, PREMIUM_PRICE } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const K = window.KH; // হাব পেজের সাহায্যকারী ফাংশন (toast, openS, closeS, setProfile ...)

let user = null, me = null, unsubs = [], roomUnsub = null, roomId = null, roomData = null;
const pendingRoom = (location.hash.match(/^#room-([A-Z0-9]{6})$/) || [])[1] || null;

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
  K.openS('profSheet');
};
$('pfOut').onclick = async () => { await signOut(auth); K.closeS('profSheet'); K.toast('লগআউট হয়েছে'); };

/* ---------- ইউজারনেম ---------- */
$('userForm').onsubmit = async e => {
  e.preventDefault();
  const un = $('unInput').value.trim().toLowerCase(), dn = $('dnInput').value.trim(), err = $('unErr');
  if (!/^[a-z0-9_]{3,15}$/.test(un)) { err.textContent = 'ইংরেজি ছোট অক্ষর, সংখ্যা আর _ দিয়ে ৩-১৫ অক্ষরের নাম দিন'; return; }
  if (!dn) { err.textContent = 'দেখানোর নাম লিখুন'; return; }
  err.textContent = ''; $('unBtn').disabled = true;
  try {
    const taken = await getDoc(doc(db, 'usernames', un));
    if (taken.exists()) { err.textContent = '@' + un + ' আগেই কেউ নিয়ে নিয়েছে, অন্য নাম দিন'; $('unBtn').disabled = false; return; }
    const b = writeBatch(db);
    b.set(doc(db, 'usernames', un), { uid: user.uid });
    b.set(doc(db, 'users', user.uid), { username: un, name: dn, points: START_POINTS, games: 0, wins: 0, createdAt: serverTimestamp(), lastDaily: null });
    await b.commit();
    K.toast('স্বাগতম @' + un + '! উপহার হিসেবে ' + bn(START_POINTS) + ' পয়েন্ট পেলেন');
  } catch (e2) {
    err.textContent = e2.code === 'permission-denied' ? 'এই নামটা নেওয়া যাচ্ছে না, অন্য নাম দিন' : 'সেভ হয়নি: ' + (e2.code || e2.message);
  }
  $('unBtn').disabled = false;
};

/* ---------- লগইন অবস্থা ---------- */
onAuthStateChanged(auth, u => {
  unsubs.forEach(f => f()); unsubs = []; user = u; me = null; K.authed = false;
  if (!u) {
    K.setProfile({ name: 'খেলোয়াড়' });
    if (!isGuest()) K.openS('loginSheet');
    return;
  }
  K.closeS('loginSheet');
  unsubs.push(onSnapshot(doc(db, 'users', u.uid), snap => {
    if (!snap.exists()) { $('dnInput').value = (u.displayName || '').slice(0, 20); K.openS('userSheet'); return; }
    const first = !me; me = snap.data(); K.authed = true; K.closeS('userSheet'); $('loginT').textContent = 'খেলাঘরে স্বাগতম!';
    K.setProfile({ name: me.name });
    $('bal').textContent = bn(me.points);
    drawDaily(); drawPremium();
    if (first) { listenInvites(); if (pendingRoom) joinRoom(pendingRoom); }
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
  K.toast('প্রিমিয়াম নিতে অ্যাডমিনকে ৳' + bn(PREMIUM_PRICE) + ' পাঠিয়ে ইউজারনেম @' + me.username + ' জানান। অনলাইন পেমেন্ট শিগগিরই।');
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
  K.toast(me ? 'পয়েন্ট নিতে অ্যাডমিনকে আপনার ইউজারনেম @' + me.username + ' জানান' : 'আগে লগইন করুন');
};

/* ---------- লিডারবোর্ড ---------- */
const COLORS = ['#e5484d', '#3b78f0', '#2fa36b', '#f2b100', '#7c3aed', '#db2777', '#0f9488', '#f27a1a'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function listenLeaderboard() {
  unsubs.push(onSnapshot(query(collection(db, 'users'), orderBy('points', 'desc'), limit(10)), snap => {
    if (snap.empty) return;
    $('lb').innerHTML = snap.docs.map((d, i) => {
      const r = d.data(), mine = user && d.id === user.uid;
      return `<div class="row"${mine ? ' style="background:#f3efff;border-radius:12px"' : ''}><span class="rk">${bn(i + 1)}</span><span class="ra" style="background:${COLORS[i % COLORS.length]}">${esc(r.name[0])}</span><div><b>${esc(r.name)}${mine ? ' (আপনি)' : ''}</b><small>@${esc(r.username)}</small></div><span class="pts"><span class="coin"></span>${bn(r.points)}</span></div>`;
    }).join('');
  }));
}

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
    $('roomStart').disabled = n < 2;
    $('roomStart').textContent = n < 2 ? 'বন্ধুর জন্য অপেক্ষা…' : 'খেলা শুরু (' + bn(n) + ' জন)';
    $('roomWait').hidden = host; $('roomWait').textContent = r.status === 'started' ? 'খেলা শুরু হয়েছে!' : 'হোস্ট খেলা শুরু করার অপেক্ষায়…';
    if (r.status === 'started') K.toast('অনলাইন খেলার বোর্ড পরের আপডেটে আসছে। রুম, ইনভাইট আর পয়েন্ট এখন চালু।');
  });
  K.openS('roomSheet');
}
$('roomStart').onclick = async () => {
  if (!roomId) return;
  await updateDoc(doc(db, 'rooms', roomId), { status: 'started' }).catch(e => K.toast('শুরু করা যায়নি: ' + e.code));
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
