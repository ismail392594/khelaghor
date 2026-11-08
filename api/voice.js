// খেলাঘর AI ভয়েস: মজার ডায়লগ Google-এর বাংলা AI কণ্ঠে বানিয়ে পাঠায়।
// প্রতিটা লাইন একবার তৈরি হয়, তারপর Vercel-এর ক্যাশ থেকে সবাই পায়, তাই খরচ প্রায় শূন্য।
// শুধু আমাদের নিজের ডায়লগ (_voice-lines.js) পড়বে, অন্য কোনো লেখা না, যাতে কেউ অপব্যবহার করতে না পারে।
// দরকার: Google Cloud-এ "Cloud Text-to-Speech API" চালু (প্রজেক্ট khelaghor-160)।
import { cert } from 'firebase-admin/app';
import LINES from './_voice-lines.js';

const ALLOWED = new Set(LINES);
// চরিত্র: ছেলে (M) আর মেয়ে (F) কণ্ঠ, গলার উঁচু-নিচু (pitch) আর গতি বদলে মজার করা
const VOICES = {
  M1: { name: 'bn-IN-Wavenet-B', pitch: -2, rate: 1.02 },   // মামা: ভারী গলা
  M2: { name: 'bn-IN-Wavenet-D', pitch: 3.5, rate: 1.16 },  // ছোট ভাই: চটপটে
  M3: { name: 'bn-IN-Wavenet-B', pitch: -7, rate: .9 },     // চাচা/বস: মোটা গলা, ধীরে
  F1: { name: 'bn-IN-Wavenet-A', pitch: 2.5, rate: 1.12 },  // আপা: চটপটে
  F2: { name: 'bn-IN-Wavenet-C', pitch: -1, rate: 1.0 }     // খালা/আম্মা
};
VOICES.A = VOICES.F1; VOICES.B = VOICES.M1; VOICES.C = VOICES.F2; VOICES.D = VOICES.M2; // পুরনো লিংক
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
    audioConfig: { audioEncoding: 'MP3', speakingRate: voice.rate, pitch: voice.pitch, effectsProfileId: ['handset-class-device'] }
  });
  const call = name => fetch('https://texttospeech.googleapis.com/v1/text:synthesize', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body(name) });
  let r = await call(voice.name);
  if (r.status === 400) r = await call(voice.name.replace('Wavenet', 'Standard')); // WaveNet না থাকলে সাধারণ কণ্ঠ
  if (!r.ok) throw new Error('tts ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return Buffer.from((await r.json()).audioContent, 'base64');
}

export default async function handler(req, res) {
  const text = String((req.query && req.query.t) || '').trim();
  const v = VOICES[String((req.query && req.query.v) || 'M1')] || VOICES.M1;
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
