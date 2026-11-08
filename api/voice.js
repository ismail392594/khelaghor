// খেলাঘর AI ভয়েস: মজার ডায়লগ Google-এর বাংলা AI কণ্ঠে বানিয়ে পাঠায়।
// প্রতিটা লাইন একবার তৈরি হয়, তারপর Vercel-এর ক্যাশ থেকে সবাই পায়, তাই খরচ প্রায় শূন্য।
// শুধু আমাদের নিজের ডায়লগ (_voice-lines.js) পড়বে, অন্য কোনো লেখা না, যাতে কেউ অপব্যবহার করতে না পারে।
// দরকার: Google Cloud-এ "Cloud Text-to-Speech API" চালু (প্রজেক্ট khelaghor-160)।
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { splitStory } from '../js/story-split.js';
import { createHash } from 'node:crypto';
import LINES from './_voice-lines.js';

const ALLOWED = new Set(LINES);
// চরিত্র: ছেলে (M) আর মেয়ে (F) কণ্ঠ, গলার উঁচু-নিচু (pitch) আর গতি বদলে মজার করা
const VOICES = {
  M1: { name: 'bn-IN-Wavenet-B', pitch: -2, rate: 1.02 },   // মামা: ভারী গলা
  M2: { name: 'bn-IN-Wavenet-D', pitch: 3.5, rate: 1.16 },  // ছোট ভাই: চটপটে
  M3: { name: 'bn-IN-Wavenet-B', pitch: -7, rate: .9 },     // চাচা/বস: মোটা গলা, ধীরে
  F1: { name: 'bn-IN-Wavenet-A', pitch: 2.5, rate: 1.12 },  // আপা: চটপটে
  F2: { name: 'bn-IN-Wavenet-C', pitch: -1, rate: 1.0 },    // খালা/আম্মা
  // মজার নিজস্ব চরিত্র (কোনো আসল মানুষের নকল না)
  V1: { name: 'bn-IN-Wavenet-B', pitch: -12, rate: .8 },    // ভিলেন মামা: মোটা গলা, টেনে টেনে
  C1: { name: 'bn-IN-Wavenet-B', pitch: -5, rate: .78 },    // বুড়া চাচা
  K1: { name: 'bn-IN-Wavenet-D', pitch: 12, rate: 1.22 },   // পিচ্চি
  N1: { name: 'bn-IN-Wavenet-A', pitch: 6, rate: .92 }      // নাটকের নায়িকা
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

// গল্পের আসর: ডাটাবেজে সেভ করা লেখা (অ্যাডমিন/AI-এর) অংশ অংশ করে পড়া। বাইরের কোনো লেখা পড়বে না।
async function storyPart(id, p) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(id) || !(p >= 0 && p < 60)) return null;
  if (!getApps().length) { const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) throw new Error('no-key'); initializeApp({ credential: cert(JSON.parse(raw)) }); }
  const d = await getFirestore().collection('stories').doc(id).get();
  if (!d.exists || d.data().on === false) return null;
  return splitStory(d.data().title, d.data().body)[p] || null;
}

// ভয়েসের ভাণ্ডার: একবার বানানো mp3 Firestore-এ (tts/{হ্যাশ}) জমা থাকে। একই লেখা + একই কণ্ঠ আবার চাইলে
// Google TTS-কে আর ডাকা হয় না, ভাণ্ডার থেকেই দেওয়া হয়। নতুন লেখা এলে তখনই শুধু AI কণ্ঠ বানায়।
function fdb() {
  if (!getApps().length) { const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) return null; initializeApp({ credential: cert(JSON.parse(raw)) }); }
  return getFirestore();
}
async function cachedSynth(text, voice, kind) {
  const id = createHash('sha256').update([voice.name, voice.rate, voice.pitch, text].join('|')).digest('hex').slice(0, 40);
  let db = null; try { db = fdb(); } catch (e) {}
  if (db) {
    try { const d = await db.collection('tts').doc(id).get(); if (d.exists && d.data().mp3) { return Buffer.from(d.data().mp3); } } catch (e) { console.error('tts read', e.message); }
  }
  const mp3 = await synth(text, voice);
  // সেভ শেষ হওয়া পর্যন্ত অপেক্ষা (উত্তর পাঠানোর পরে সার্ভার থেমে যেতে পারে)
  if (db && mp3.length < 1000000) { try { await db.collection('tts').doc(id).set({ mp3, kind, chars: text.length, bytes: mp3.length, hits: 0, at: FieldValue.serverTimestamp() }); } catch (e) { console.error('tts save', e.message); } }
  return mp3;
}

export default async function handler(req, res) {
  let text = String((req.query && req.query.t) || '').trim();
  const v = VOICES[String((req.query && req.query.v) || 'M1')] || VOICES.M1;
  if (req.query && req.query.s) {
    try {
      const part = await storyPart(String(req.query.s), Math.floor(+req.query.p || 0));
      if (!part) { res.setHeader('Cache-Control', 'no-store'); return res.status(404).json({ error: 'এই অংশ নেই' }); }
      const mp3 = await cachedSynth(part, { ...v, rate: v.rate * .95 }, 'story');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.status(200).send(mp3);
    } catch (e) { console.error(e.message); res.setHeader('Cache-Control', 'no-store'); return res.status(503).json({ error: 'ভয়েস এখন পাওয়া যাচ্ছে না' }); }
  }
  if (!text || text.length > 160 || !ALLOWED.has(text)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'এই লেখার ভয়েস নেই' });
  }
  try {
    const mp3 = await cachedSynth(text, v, 'line');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res.status(200).send(mp3);
  } catch (e) {
    console.error(e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'ভয়েস এখন পাওয়া যাচ্ছে না' });
  }
}
