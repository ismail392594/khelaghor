// খেলাঘর ভয়েস: আগে AI কণ্ঠ (সার্ভার থেকে mp3), না পেলে ফোনের নিজের বাংলা কণ্ঠ।
// ব্যবহার: KHVoice.say('লেখা', true, 'M1', true)  // true = এখনই বলো; শেষ true = খেলোয়াড় নিজে বলতে চেয়েছে
// খেলোয়াড় না চাইলে কেউ নিজে থেকে কথা বলে না (লেখা দেখায়, শব্দ না)। হাবের সেটিং থেকে অটো ভয়েস চালু করা যায়।
(function () {
  // ছেলে কণ্ঠ একটু বেশি, মেয়ে কণ্ঠও আছে। কে বলবে সেটা গেম বলে দিতে পারে: say(লেখা, true, 'F1')
  const VOICES = ['M1', 'M2', 'M3', 'F1', 'F2', 'M2', 'M1', 'F1'];
  const OK = { M1: 1, M2: 1, M3: 1, F1: 1, F2: 1 };
  let cur = null, fails = 0, aiDown = false, lastAt = 0;
  try { aiDown = sessionStorage.getItem('kh-ai-voice-down') === '1'; } catch (e) {}

  const synth = window.speechSynthesis; let bnVoice = null;
  function findVoice() { if (!synth) return null; const v = synth.getVoices(); bnVoice = v.find(x => /^bn[-_]BD/i.test(x.lang)) || v.find(x => /^bn/i.test(x.lang)) || null; return bnVoice; }
  if (synth) { findVoice(); synth.onvoiceschanged = findVoice; }
  function device(text, who) {
    if (!synth || (!bnVoice && !findVoice())) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = bnVoice; u.lang = bnVoice.lang; u.rate = 1.1; u.pitch = who && who[0] === 'F' ? 1.3 : who === 'M3' ? .7 : 1 + Math.random() * .4; synth.speak(u);
    return true;
  }
  // একই লেখা সবসময় একই কণ্ঠে, যাতে ক্যাশ কাজে লাগে
  function voiceFor(text) { let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0; return VOICES[h % VOICES.length]; }
  const busy = () => (cur && !cur.paused && !cur.ended) || (synth && synth.speaking);

  const autoOn = () => { try { return localStorage.getItem('kh-autovoice') === '1'; } catch (e) { return false; } };
  function say(text, force, who, byUser) {
    text = String(text || '').trim(); if (!text) return;
    if (!byUser && !autoOn()) return;
    if (!force && (busy() || Date.now() - lastAt < 1200)) return;
    lastAt = Date.now();
    if (cur) { try { cur.pause(); } catch (e) {} cur = null; }
    if (synth) synth.cancel();
    if (aiDown) { device(text, who); return; }
    const a = new Audio('/api/voice?v=' + (OK[who] ? who : voiceFor(text)) + '&t=' + encodeURIComponent(text));
    a.volume = 1; cur = a;
    let done = false;
    const fallback = () => {
      if (done) return; done = true;
      if (++fails >= 3) { aiDown = true; try { sessionStorage.setItem('kh-ai-voice-down', '1'); } catch (e) {} }
      if (cur === a) device(text, who);
    };
    a.onerror = fallback;
    a.onplaying = () => { done = true; fails = 0; };
    a.play().catch(err => { if (err && err.name === 'NotAllowedError') { done = true; return; } fallback(); });
    if (window.KHVoice.onstart) window.KHVoice.onstart(a);
  }
  function stop() { if (cur) { try { cur.pause(); } catch (e) {} } if (synth) synth.cancel(); }
  window.KHVoice = { say, stop, onstart: null, autoOn, setAuto: v => { try { localStorage.setItem('kh-autovoice', v ? '1' : '0'); } catch (e) {} } };
})();
