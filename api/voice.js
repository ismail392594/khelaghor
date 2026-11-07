// খেলাঘর AI ভয়েস: মজার ডায়লগ Google-এর বাংলা AI কণ্ঠে বানিয়ে পাঠায়।
// প্রতিটা লাইন একবার তৈরি হয়, তারপর Vercel-এর ক্যাশ থেকে সবাই পায়, তাই খরচ প্রায় শূন্য।
// শুধু আমাদের নিজের ডায়লগ (_voice-lines.js) পড়বে, অন্য কোনো লেখা না, যাতে কেউ অপব্যবহার করতে না পারে।
// দরকার: Google Cloud-এ "Cloud Text-to-Speech API" চালু (প্রজেক্ট khelaghor-160)।
import { cert } from 'firebase-admin/app';
import LINES from './_voice-lines.js';

const ALLOWED = new Set(LINES);
const VOICES = { A: 'bn-IN-Wavenet-A', B: 'bn-IN-Wavenet-B', C: 'bn-IN-Wavenet-C', D: 'bn-IN-Wavenet-D' };
let cred = null;

async function token() {
  if (!cred) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('no-key');
    cred = cert(JSON.parse(raw));
  }
  return (await cred.getAccessToken()).access_token;
}

async function synth(text, voice) {
  const t = await token();
  const body = (name) => JSON.stringify({
    input: { text },
    voice: { languageCode: 'bn-IN', name },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.08, pitch: 1.5, effectsProfileId: ['handset-class-device'] }
  });
  const call = name => fetch('https://texttospeech.googleapis.com/v1/text:synthesize', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body(name) });
  let r = await call(voice);
  if (r.status === 400) r = await call(voice.replace('Wavenet', 'Standard')); // WaveNet না থাকলে সাধারণ কণ্ঠ
  if (!r.ok) throw new Error('tts ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return Buffer.from((await r.json()).audioContent, 'base64');
}

export default async function handler(req, res) {
  const text = String((req.query && req.query.t) || '').trim();
  const v = VOICES[String((req.query && req.query.v) || 'B')] || VOICES.B;
  if (!text || text.length > 160 || !ALLOWED.has(text)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'এই লেখার ভয়েস নেই' });
  }
  try {
    const mp3 = await synth(text, v);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res.status(200).send(mp3);
  } catch (e) {
    console.error(e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'ভয়েস এখন পাওয়া যাচ্ছে না' });
  }
}
