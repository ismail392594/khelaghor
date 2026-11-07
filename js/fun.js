// খেলাঘর মজার স্তর: ব্যাকগ্রাউন্ড অ্যানিমেশন, গান, সাউন্ড ইফেক্ট, স্ক্রল-ডায়লগ, গেম আমন্ত্রণ, গেস্ট-গেট
(function () {
  const K = window.KH; if (!K) return;
  const $ = id => document.getElementById(id);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =============== ডায়লগ =============== */
  const SCROLL = [
    'এত স্ক্রল করেন ক্যান? একটা গেম খেলেন!',
    'ভাই আস্তে স্ক্রল করেন, আঙুলে ব্যথা পাইবেন!',
    'কি একটা অবস্থা! এতগুলা গেম, একটাও খেলেন নাই?',
    'এইখানে থামেন, লুডুতে একটা দান দিয়া যান',
    'স্ক্রল করতে করতে সকাল হইয়া যাইবো কিন্তু!',
    'আপনার বন্ধু খেলতাছে, আর আপনি খালি দেখতাছেন?',
    'নিচে আরো মজা আছে, থাইমেন না!',
    'আম্মু ডাকতেছে? এক দান খেইলা তারপর যান!',
    'ভাইরাল হইতে চাইলে লিডারবোর্ডে উঠেন!',
    'টাইম পাস না ভাই, টাইম জিতেন!',
    'এই যে ভাই, হ্যাঁ আপনাকেই বলতেছি, খেলেন!',
    'হাতে চা আছে? তাইলে খেলার পারফেক্ট সময়',
    'পড়া বাদ দিয়া এখানে কি? আচ্ছা, এক দান খেলেন',
    'লোডশেডিংয়ের আগে একটা ম্যাচ শেষ করেন!',
    'স্ক্রল না, স্কোর করেন!',
    'রিলস দেখা শেষ? এবার খেলাঘরে আসেন!',
    'বস দেখতেছে না তো? তাইলে একটা দান!',
    'মন খারাপ? মশা মারেন, মন ভালো হইবো!',
    'আপনার স্ক্রল দেখে আঙুলও হাঁপাইয়া গেছে!',
    'দেখি দেখি, কে আজকে লিডারবোর্ডের রাজা?'
  ];
  const SECTION = {
    'আজকের ভাইরাল ডায়লগ': ['ডায়লগ পড়েন, হাসেন, বন্ধুরে শেয়ার দেন!', 'এই ডায়লগ না পড়লে জীবন বৃথা!'],
    'সব গেম': ['৪৩টা গেম! একটা না একটা তো পছন্দ হইবোই', 'বাছেন বাছেন, যেইটা খুশি!'],
    'সাপ্তাহিক সেরা': ['লিস্টে আপনার নাম নাই? লজ্জা লজ্জা!', 'টপে উঠলে পাড়ায় নাম ছড়াইবো!'],
    'পয়েন্টের দোকান': ['পয়েন্ট কম? চিন্তা নাই, দোকান খোলা!', 'প্রিমিয়াম নিলে বিজ্ঞাপন বলবে টাটা!']
  };
  const INVITE = {
    'লুডু': ['ছক্কা রেডি, গুটি রেডি, আপনি রেডি তো?', 'আজকে কারো গুটি ঘরে ঢুকতে দিমু না!', 'চলেন এক দান, হারলে চা আপনার!'],
    'মশা মারো': ['রাতে মশা কামড়াইছে? এখন প্রতিশোধের সময়!', 'থাপ্পড় রেডি রাখেন, মশা আসতেছে!'],
    'ঢাকা জ্যাম রানার': ['অফিসে লেট? জ্যাম ঠেইলা দৌড়ান!', '২ কিলো রাস্তা, ২ ঘণ্টা... দেখি আপনি কত পারেন!'],
    'বাজার দর চ্যালেঞ্জ': ['৫০০ টাকায় বাজার? সাহস থাকলে আসেন!', 'পেঁয়াজের দাম শুনে কাঁদবেন না কিন্তু!'],
    'আর্জেন্টিনা বনাম ব্রাজিল': ['মেসি না নেইমার? আজকে ফয়সালা হবে!', 'পাড়ার ছাদে পতাকা যুদ্ধ শুরু!'],
    'ক্যারম': ['রানী ফেলবেন, কভার দিবেন তো?', 'আঙুলে জোর আছে? দেখাই দেন!'],
    'কলব্রিজ': ['চায়ের দোকানের আড্ডা এখন ফোনে!', 'স্পেডের টেক্কা লুকাইয়া রাখছেন নাকি?'],
    'টুয়েন্টি নাইন': ['জুটি বাঁধেন, ২৯ এর লড়াই!', 'পার্টনার ভুল দিলে দোষ তার, জিতলে ক্রেডিট আপনার!'],
    'হাডুডু': ['দম আছে তো? কাবাডি কাবাডি!', 'দম ফুরাইলেও ইজ্জত ফুরাইবো না!'],
    'ঘুড়ি কাটাকাটি': ['ভোকাট্টা বলার জন্য রেডি?', 'সুতায় মাঞ্জা দিছেন তো?']
  };
  const INVITE_ANY = ['{g} খেলবেন? চলেন একটা হয়ে যাক!', 'এই {g} এ আমার রেকর্ড কেউ ভাঙতে পারে নাই, আপনি পারবেন?', '{g}? আজকে কিন্তু ছাড় নাই!', 'এক দান {g}, তারপর বাকি কাজ!'];
  const SOON = ['এই গেম এখনো চুলায়, একটু পরে আসেন!', 'ডেভেলপার চা খাইতে গেছে, ফিরেই বানাইবো!', 'আসতেছে আসতেছে, ধৈর্য ধরেন ভাই!', 'রান্না চলতেছে, ঘ্রাণ পাইতেছেন?'];
  const GATE = ['দাঁড়ান ভাই! আগে লগইন, তারপর খেলা। নিয়ম নিয়মই!', 'গেস্ট হইয়া শুধু দেখা যায়, খেলতে হইলে একাউন্ট লাগে মামা!', 'লগইন না করলে পয়েন্ট যাবে কই? হাওয়ায়?', 'বিনা টিকিটে বাসে ওঠা যায়, এখানে না! লগইন করেন।'];

  /* =============== সাউন্ড (WebAudio, নিজস্ব তৈরি) =============== */
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let musicOn = store.get('kh-music', true), sfxOn = store.get('kh-sfx', true);
  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    return ctx;
  }
  function tone(freq, t, dur, type, vol, dest, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, dest, hp) {
    const len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = hp || 6000; s.buffer = b;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t);
  }
  const SFX = {
    pop() { const t = ctx.currentTime; tone(520, t, 0.09, 'sine', 0.5, sfxGain, 1250); tone(1047, t + 0.08, 0.1, 'triangle', 0.18, sfxGain); tone(1319, t + 0.15, 0.14, 'triangle', 0.16, sfxGain); },
    click() { const t = ctx.currentTime; tone(880, t, 0.04, 'square', 0.12, sfxGain); },
    coin() { const t = ctx.currentTime; tone(988, t, 0.08, 'square', 0.18, sfxGain); tone(1319, t + 0.08, 0.25, 'square', 0.18, sfxGain); },
    tada() { const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.22, 'triangle', 0.3, sfxGain)); },
    boing() { const t = ctx.currentTime; tone(180, t, 0.35, 'sine', 0.5, sfxGain, 90); tone(360, t, 0.2, 'triangle', 0.15, sfxGain, 600); },
    whoosh() { const t = ctx.currentTime; noise(t, 0.25, 0.2, sfxGain, 1500); }
  };
  function sfx(name) { if (!sfxOn || !audio() || ctx.state !== 'running') return; try { SFX[name](); } catch (e) {} }

  /* ===== নিজস্ব তিনটা গান (সব কোডে বানানো, কপিরাইট-মুক্ত) ===== */
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI নোট → ফ্রিকোয়েন্সি
  const TRACKS = [
    { name: 'ঢোল ধামাকা', bpm: 124, lead: 'triangle', leadVol: 0.16, swing: 0,
      mel: [79,-1,76,74,76,-1,72,74,76,-1,74,72,69,-1,72,-1, 74,-1,76,79,81,-1,79,76,74,76,74,72,67,-1,-1,-1],
      bass: [48,48,55,55,57,57,55,55], drum: 'dhol' },
    { name: 'চিপটিউন পার্টি', bpm: 140, lead: 'square', leadVol: 0.07, swing: 0,
      mel: [72,76,79,84,79,76,72,-1,74,77,81,86,81,77,74,-1, 76,79,83,88,83,79,76,-1,79,-1,77,-1,76,-1,74,-1],
      bass: [48,48,50,50,52,52,43,43], drum: 'chip' },
    { name: 'চা-আড্ডা লোফাই', bpm: 84, lead: 'sine', leadVol: 0.2, swing: 0.18,
      mel: [76,-1,-1,74,72,-1,69,-1,72,-1,-1,-1,-1,-1,-1,-1, 74,-1,-1,72,69,-1,67,-1,69,-1,-1,-1,-1,-1,-1,-1],
      bass: [45,45,41,41,48,48,43,43], drum: 'lofi', pad: [[57,60,64],[53,57,60],[60,64,67],[55,59,62]] }
  ];
  let trackIx = Math.min(store.get('kh-track', 0), TRACKS.length - 1);
  let step = 0, nextT = 0, timer = null;
  function schedule() {
    const T = TRACKS[trackIx], STEP = 60 / T.bpm / 2;
    while (nextT < ctx.currentTime + 0.15) {
      const t = nextT + (step % 2 ? T.swing * STEP : 0);
      const m = T.mel[step % T.mel.length];
      if (m >= 0) tone(N(m), t, STEP * 1.7, T.lead, T.leadVol, musicGain);
      if (step % 4 === 0) tone(N(T.bass[(step / 4) % T.bass.length]), t, STEP * 3.2, T.drum === 'chip' ? 'triangle' : 'sine', 0.32, musicGain);
      if (T.pad && step % 16 === 0) T.pad[(step / 16) % T.pad.length].forEach(n => tone(N(n), t, STEP * 15, 'sine', 0.05, musicGain));
      if (T.drum === 'dhol') {
        if (step % 4 === 0) tone(110, t, 0.2, 'sine', 0.5, musicGain, 55);
        if (step % 4 === 2 || step % 8 === 7) tone(240, t, 0.09, 'sine', 0.28, musicGain, 150);
        if (step % 2 === 1) noise(t, 0.035, 0.05, musicGain, 7000);
      } else if (T.drum === 'chip') {
        if (step % 4 === 0) tone(150, t, 0.12, 'square', 0.12, musicGain, 50);
        if (step % 4 === 2) noise(t, 0.08, 0.12, musicGain, 2500);
        noise(t, 0.02, 0.03, musicGain, 9000);
      } else {
        if (step % 8 === 0) tone(90, t, 0.25, 'sine', 0.45, musicGain, 45);
        if (step % 8 === 4) noise(t, 0.12, 0.08, musicGain, 1800);
        if (step % 2 === 1) noise(t, 0.03, 0.025, musicGain, 8000);
      }
      nextT += STEP; step++;
    }
  }
  function startMusic() {
    if (!audio() || timer) return;
    nextT = ctx.currentTime + 0.05; step = 0; timer = setInterval(schedule, 50);
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.45, ctx.currentTime, 0.6);
  }
  function stopMusic() {
    if (!ctx || !timer) return;
    musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    const t = timer; timer = null; setTimeout(() => clearInterval(t), 600);
  }
  function duck(on) { if (ctx && musicGain && timer) musicGain.gain.setTargetAtTime(on ? 0.12 : 0.45, ctx.currentTime, 0.15); }

  /* ===== AI ভয়েস: ফোনের বাংলা কণ্ঠে ডায়লগ পড়া ===== */
  const synth = window.speechSynthesis;
  let voiceOn = store.get('kh-voice', true), bnVoice = null, warnedVoice = false;
  function findVoice() {
    if (!synth) return null;
    const vs = synth.getVoices();
    bnVoice = vs.find(v => /^bn[-_]BD/i.test(v.lang)) || vs.find(v => /^bn/i.test(v.lang)) || null;
    return bnVoice;
  }
  if (synth) { findVoice(); synth.onvoiceschanged = findVoice; }
  function speak(text) {
    if (!voiceOn || !synth || !unlocked) return;
    if (!bnVoice && !findVoice()) {
      if (!warnedVoice) { warnedVoice = true; K.toast('ফোনে বাংলা ভয়েস নেই। Settings → Text-to-speech → Google → বাংলা ভাষা ডাউনলোড করুন'); }
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[!?]+/g, m => m[0]));
    u.voice = bnVoice; u.lang = bnVoice.lang;
    u.rate = 1.05 + Math.random() * 0.15; u.pitch = 0.8 + Math.random() * 0.7; u.volume = 1;
    u.onstart = () => duck(true); u.onend = u.onerror = () => duck(false);
    synth.speak(u);
  }
  K.speak = speak;

  // ব্রাউজার নিয়ম: প্রথম ছোঁয়ার পরেই শব্দ চালু করা যায়
  let unlocked = false;
  function unlock() {
    if (unlocked) return; if (!audio()) return;
    ctx.resume().then(() => { unlocked = true; if (musicOn) startMusic(); drawSound(); });
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { ctx.suspend(); synth && synth.cancel(); } else if (unlocked) ctx.resume(); });

  /* ===== সাউন্ড কন্ট্রোল: গান · পরের গান · ভয়েস ===== */
  const bar = document.createElement('div'); bar.className = 'soundBar';
  bar.innerHTML = '<button type="button" class="sMusic"></button><button type="button" class="sNext" aria-label="পরের গান"><svg viewBox="0 0 24 24"><path d="M5 5l9 7-9 7zM16 5h3v14h-3z" fill="currentColor"/></svg></button><button type="button" class="sVoice"></button>';
  document.body.appendChild(bar);
  const sb = bar.querySelector('.sMusic'), sn = bar.querySelector('.sNext'), sv = bar.querySelector('.sVoice');
  function drawSound() {
    const playing = musicOn && unlocked;
    sb.innerHTML = (musicOn
      ? '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>')
      + '<span>' + (playing ? TRACKS[trackIx].name : musicOn ? 'গান শুনুন' : 'গান বন্ধ') + '</span>';
    sb.setAttribute('aria-label', musicOn ? 'গান বন্ধ করুন' : 'গান চালু করুন');
    bar.classList.toggle('on', playing);
    sn.hidden = !playing;
    sv.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4" fill="currentColor"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6z" fill="currentColor"/>' + (voiceOn ? '<path d="M18 7a5 5 0 0 1 0 7M20.5 4.5a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M17 8l5 6M22 8l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>') + '</svg>';
    sv.setAttribute('aria-label', voiceOn ? 'ডায়লগের ভয়েস বন্ধ করুন' : 'ডায়লগের ভয়েস চালু করুন');
    sv.classList.toggle('off', !voiceOn);
  }
  sb.onclick = e => {
    e.stopPropagation();
    if (!unlocked) { musicOn = true; store.set('kh-music', true); unlock(); return; }
    musicOn = !musicOn; store.set('kh-music', musicOn);
    musicOn ? startMusic() : stopMusic(); drawSound(); sfx('click');
  };
  sn.onclick = e => {
    e.stopPropagation();
    trackIx = (trackIx + 1) % TRACKS.length; store.set('kh-track', trackIx);
    stopMusic(); setTimeout(() => { startMusic(); drawSound(); }, 650);
    sfx('whoosh'); K.bubble && K.bubble('এখন বাজছে: ' + TRACKS[trackIx].name + '! নাচেন!', { sound: 'tada', silent: true });
  };
  sv.onclick = e => {
    e.stopPropagation(); unlock();
    voiceOn = !voiceOn; store.set('kh-voice', voiceOn); drawSound();
    if (voiceOn) setTimeout(() => speak('ঠিক আছে, এখন থেকে সব ডায়লগ আমি পড়ে শোনাবো!'), 150); else synth && synth.cancel();
  };
  drawSound();

  /* সব বোতামে ক্লিক সাউন্ড */
  document.addEventListener('click', e => {
    const b = e.target.closest('button,.tile,a');
    if (b && !bar.contains(b)) sfx(b.classList.contains('tile') ? 'pop' : 'click');
  });

  /* =============== ডায়লগ বাবল =============== */
  const FACES = ['😂', '😎', '🤣', '😜', '🙄', '😏', '🤩', '😅'];
  const layer = document.createElement('div'); layer.className = 'bubbles'; layer.setAttribute('aria-live', 'polite');
  document.body.appendChild(layer);
  let side = 0;
  function bubble(text, opts) {
    opts = opts || {};
    const b = document.createElement('div');
    b.className = 'bubble ' + (side++ % 2 ? 'r' : 'l');
    b.innerHTML = '<span class="face" aria-hidden="true">' + pick(FACES) + '</span><span class="txt"></span>';
    b.querySelector('.txt').textContent = text;
    while (layer.children.length > 1) layer.firstChild.remove();
    layer.appendChild(b);
    sfx(opts.sound || 'pop');
    if (!opts.silent) speak(text);
    const ms = opts.ms || (voiceOn && bnVoice ? Math.max(3200, text.length * 95) : 3200);
    setTimeout(() => b.classList.add('out'), ms);
    setTimeout(() => b.remove(), ms + 500);
  }
  K.bubble = bubble;

  /* স্ক্রল করলে ডায়লগ */
  let lastY = scrollY, lastAt = 0, used = [];
  addEventListener('scroll', () => {
    const now = Date.now();
    if (Math.abs(scrollY - lastY) < 280 || now - lastAt < 3500) return;
    if (document.querySelector('.sheet:not([hidden]),.modal:not([hidden])')) return;
    lastY = scrollY; lastAt = now;
    let pool = SCROLL.filter(x => !used.includes(x)); if (!pool.length) { used = []; pool = SCROLL; }
    const t = pick(pool); used.push(t); bubble(t);
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const h = e.target.textContent.trim(); if (seen.has(h) || !SECTION[h]) return;
      seen.add(h); if (Date.now() - lastAt < 1500) return; lastAt = Date.now(); bubble(pick(SECTION[h]));
    }), { threshold: 1 });
    document.querySelectorAll('.sec h2').forEach(h => io.observe(h));
  }

  /* =============== গেম আমন্ত্রণ + গেস্ট গেট =============== */
  function inviteLine(name) {
    const own = INVITE[name] || [];
    const any = INVITE_ANY.map(s => s.replace('{g}', name));
    return pick(own.length && Math.random() < 0.7 ? own : any);
  }
  const MAINT = ['মিস্ত্রি ভাই কাজ করতেছে, একটু পরে আসেন!', 'এই গেম এখন সার্ভিসিংয়ে, চা খাইয়া আসেন!', 'স্ক্রু টাইট দেওয়া হইতেছে, ধৈর্য ধরেন!'];
  K.tapGame = (name, url, st) => {
    if (st === 'maint') { bubble(pick(MAINT), { sound: 'boing' }); return; }
    if (!url) { bubble(pick(SOON), { sound: 'boing' }); return; }
    if (K.banned) { bubble('আপনার একাউন্ট আপাতত বন্ধ। যোগাযোগ পাতায় অ্যাডমিনকে লিখুন।', { sound: 'boing' }); return; }
    if (!K.authed && K.needsUsername) {
      $('userT').textContent = 'খেলার আগে একটা ইউজারনেম বেছে নিন!';
      sfx('boing'); K.openS('userSheet'); return;
    }
    if (!K.authed) {
      $('loginT').textContent = pick(GATE);
      sfx('boing'); K.openS('loginSheet'); speak($('loginT').textContent); return;
    }
    const iv = $('modeInvite');
    if (iv) { iv.querySelector('.txt').textContent = inviteLine(name); iv.querySelector('.face').textContent = pick(FACES); }
    openModes(name, url); sfx('tada'); if (iv) setTimeout(() => speak(iv.querySelector('.txt').textContent), 300);
  };
  // হাবের "খেলুন" বোতামও একই পথে
  const hp = $('heroPlay'); if (hp) hp.onclick = () => { const st = (K.gameStatus || {})['লুডু'] || 'live'; K.tapGame('লুডু', st === 'live' ? '/games/ludo/' : null, st); };
  // কম্পিউটারের সাথে খেলতে গেলেও লগইন লাগবে
  const cpu = $('mCpu');
  if (cpu) cpu.addEventListener('click', e => { if (!K.authed) { e.preventDefault(); K.closeS('modeSheet'); $('loginT').textContent = pick(GATE); K.openS('loginSheet'); } }, true);

  /* দৈনিক বোনাস ও পুরস্কারে কয়েনের শব্দ */
  const mOk = $('mOk'); if (mOk) new MutationObserver(() => { if (!$('modal').hidden) sfx('coin'); }).observe($('modal'), { attributes: true, attributeFilter: ['hidden'] });

  /* প্রথমবার: স্বাগত বাবল */
  setTimeout(() => bubble(pick(['স্বাগতম খেলাঘরে! গান শুনতে নিচের বোতাম চাপেন', 'আসসালামু আলাইকুম! আজকে কে জিতবে দেখি', 'আইছেন যখন, এক দান খেইলা যান!'])), 1500);

  /* =============== ব্যাকগ্রাউন্ড অ্যানিমেশন =============== */
  if (!reduce) {
    const cv = document.createElement('canvas'); cv.className = 'bgfx'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const g = cv.getContext('2d');
    let W, H, DPR = Math.min(2, devicePixelRatio || 1), parts = [];
    const COLORS = ['#ffd23f', '#22d3ee', '#ff4f8b', '#4ade80', '#a78bfa', '#ffffff'];
    function size() { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); }
    function spawn(y) { return { x: Math.random() * W, y: y == null ? Math.random() * H : y, r: 6 + Math.random() * 14, s: 0.15 + Math.random() * 0.45, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.02, k: Math.floor(Math.random() * 4), c: pick(COLORS), o: 0.1 + Math.random() * 0.18 }; }
    size(); addEventListener('resize', size);
    const N = Math.round(Math.min(34, W * H / 16000));
    for (let i = 0; i < N; i++) parts.push(spawn());
    function shape(p) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = p.o; g.fillStyle = p.c; g.strokeStyle = p.c; g.lineWidth = 2;
      const r = p.r;
      if (p.k === 0) { g.beginPath(); g.arc(0, 0, r, 0, 6.28); g.fill(); }
      else if (p.k === 1) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
      else if (p.k === 2) { const s = r * 1.4; g.beginPath(); g.roundRect ? g.roundRect(-s / 2, -s / 2, s, s, s * 0.22) : g.rect(-s / 2, -s / 2, s, s); g.fill(); g.globalAlpha = p.o * 1.6; g.fillStyle = '#1a1460'; [[-.25, -.25], [.25, .25], [0, 0]].forEach(([dx, dy]) => { g.beginPath(); g.arc(dx * s, dy * s, s * 0.09, 0, 6.28); g.fill(); }); }
      else { g.beginPath(); g.arc(0, 0, r, 0, 6.28); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.45, 0, 6.28); g.stroke(); }
      g.restore();
    }
    let last = 0, sy = scrollY;
    function frame(t) {
      requestAnimationFrame(frame);
      if (document.hidden || t - last < 33) return; last = t;
      const dy = (scrollY - sy) * 0.15; sy = scrollY;
      g.clearRect(0, 0, W, H);
      parts.forEach((p, i) => {
        p.y -= p.s + dy * (p.r / 20); p.a += p.va; p.x += Math.sin(t / 2000 + i) * 0.15;
        if (p.y < -30) parts[i] = spawn(H + 30); else if (p.y > H + 40) parts[i] = spawn(-30);
        shape(p);
      });
    }
    requestAnimationFrame(frame);
  }
})();
