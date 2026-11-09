// firestore.rules পরীক্ষা: আসল খেলোয়াড়ের কাজ চলে কিনা, আর চুরির চেষ্টা আটকায় কিনা।
// চালানো (রিপোর বাইরে একটা ফোল্ডারে, Java লাগে):
//   npm i firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
//   cp <রিপো>/firestore.rules rules.txt
//   echo '{"firestore":{"rules":"rules.txt"},"emulators":{"firestore":{"host":"127.0.0.1","port":8085},"ui":{"enabled":false}}}' > firebase.json
//   npx firebase emulators:exec --only firestore --project kh-test "node firestore-rules-test.mjs rules.txt"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, writeBatch, serverTimestamp, runTransaction, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
const env = await initializeTestEnvironment({ projectId: 'kh-test', firestore: { rules: fs.readFileSync(process.argv[2], 'utf8'), host: '127.0.0.1', port: 8085 } });
let pass = 0, fail = 0;
const t = async (name, p, ok) => { try { await (ok ? assertSucceeds(p) : assertFails(p)); pass++; console.log('✓', name); } catch (e) { fail++; console.log('✗', name, '-', e.message.slice(0, 160)); } };
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, 'users', 'bob'), { username: 'bob', name: 'Bob', points: 500, games: 0, wins: 0, lastDaily: null });
  await setDoc(doc(db, 'usernames', 'bob'), { uid: 'bob' });
  await setDoc(doc(db, 'users', 'eve'), { username: 'eve', name: 'Eve', points: 500, games: 0, wins: 0, lastDaily: null, banned: true });
  await setDoc(doc(db, 'rooms', 'ABC123'), { game: 'লুডু', max: 4, host: 'bob', status: 'waiting', uids: ['bob'], players: [{ uid: 'bob', name: 'Bob', username: 'bob' }] });
  await setDoc(doc(db, 'config', 'bonus'), { tgOn: false });
});
const alice = env.authenticatedContext('alice', { email: 'a@x.com', email_verified: true }).firestore();
const bob = env.authenticatedContext('bob', { email: 'b@x.com', email_verified: true }).firestore();
const eve = env.authenticatedContext('eve', { email: 'e@x.com', email_verified: true }).firestore();
// সাইনআপ (online.js-এর মতো batch)
{ const b = writeBatch(alice); b.set(doc(alice, 'usernames', 'alice'), { uid: 'alice' }); b.set(doc(alice, 'users', 'alice'), { username: 'alice', name: 'Alice', points: 500, games: 0, wins: 0, createdAt: serverTimestamp(), lastDaily: null }); await t('সাইনআপ চলে', b.commit(), true); }
await t('সাইনআপের পরে আরেকটা ইউজারনেম আটকানো যায় না', setDoc(doc(alice, 'usernames', 'alice2'), { uid: 'alice' }), false);
await t('নিজে পয়েন্ট বাড়ানো যায় না', updateDoc(doc(alice, 'users', 'alice'), { points: 999999 }), false);
await t('দৈনিক বোনাস চলে', updateDoc(doc(alice, 'users', 'alice'), { points: 600, lastDaily: serverTimestamp() }), true);
await t('আবার বোনাস নয়', updateDoc(doc(alice, 'users', 'alice'), { points: 700, lastDaily: serverTimestamp() }), false);
await t('নিজের ban তোলা যায় না', updateDoc(doc(eve, 'users', 'eve'), { banned: false }), false);
await t('লুডু ম্যাচে লেখা যায় না', setDoc(doc(alice, 'matches', 'm1'), { uids: ['alice'], status: 'finished' }), false);
await t('config বদলানো যায় না', setDoc(doc(alice, 'config', 'bonus'), { tgOn: true, tgAmount: 99999 }), false);
// স্কোর
await t('আসল স্কোর জমা চলে', setDoc(doc(alice, 'scores', 'racer', 'players', 'alice'), { score: 500, name: 'Alice', username: 'alice', at: serverTimestamp() }), true);
await t('৩০ সেকেন্ডের মধ্যে আবার নয়', setDoc(doc(alice, 'scores', 'racer', 'players', 'alice'), { score: 900, name: 'Alice', username: 'alice', at: serverTimestamp() }), false);
await t('অন্যের নামে স্কোর নয়', setDoc(doc(alice, 'scores', 'mosha', 'players', 'alice'), { score: 500, name: 'Bob', username: 'bob', at: serverTimestamp() }), false);
await t('অন্যের আইডিতে স্কোর নয়', setDoc(doc(alice, 'scores', 'mosha', 'players', 'bob'), { score: 500, name: 'Bob', username: 'bob', at: serverTimestamp() }), false);
await t('পুরোনো সময় দিয়ে নয়', setDoc(doc(bob, 'scores', 'mosha', 'players', 'bob'), { score: 500, name: 'Bob', username: 'bob', at: new Date(0) }), false);
await t('১ লাখের বেশি নয়', setDoc(doc(bob, 'scores', 'jam', 'players', 'bob'), { score: 100001, name: 'Bob', username: 'bob', at: serverTimestamp() }), false);
await t('বন্ধ একাউন্টের স্কোর নয়', setDoc(doc(eve, 'scores', 'jam', 'players', 'eve'), { score: 50, name: 'Eve', username: 'eve', at: serverTimestamp() }), false);
// রুম
await t('রুম বানানো চলে', setDoc(doc(alice, 'rooms', 'XYZ789'), { game: 'লুডু', max: 4, host: 'alice', status: 'waiting', createdAt: serverTimestamp(), uids: ['alice'], players: [{ uid: 'alice', name: 'Alice', username: 'alice' }] }), true);
await t('রুমে ঢোকা চলে (online.js-এর মতো)', runTransaction(alice, async tx => { const r = (await tx.get(doc(alice, 'rooms', 'ABC123'))).data(); tx.update(doc(alice, 'rooms', 'ABC123'), { uids: [...r.uids, 'alice'], players: [...r.players, { uid: 'alice', name: 'Alice', username: 'alice' }] }); }), true);
await t('ঢোকার সময় অন্যের নাম বদলানো যায় না', updateDoc(doc(eve, 'rooms', 'ABC123'), { uids: ['bob', 'alice', 'eve'], players: [{ uid: 'bob', name: 'HACK', username: 'bob' }, { uid: 'alice', name: 'Alice', username: 'alice' }, { uid: 'eve', name: 'E', username: 'eve' }] }), false);
await t('হোস্ট নিজে খেলার ফল (cm/matchId) লিখতে পারে না', updateDoc(doc(bob, 'rooms', 'ABC123'), { matchId: 'fake' }), false);
await t('হোস্ট রুম মুছতে পারে', deleteDoc(doc(alice, 'rooms', 'XYZ789')), true);
// ইনভাইট
await t('ইনভাইট পাঠানো চলে', setDoc(doc(alice, 'invites', 'i1'), { from: 'alice', fromName: 'Alice', fromUser: 'alice', to: 'bob', toUser: 'bob', game: 'লুডু', room: 'ABC123', status: 'pending', createdAt: serverTimestamp() }), true);
await t('অন্যের নামে ইনভাইট নয়', setDoc(doc(alice, 'invites', 'i2'), { from: 'alice', fromName: 'Bob', fromUser: 'bob', to: 'eve', toUser: 'eve', game: 'লুডু', room: 'ABC123', status: 'pending', createdAt: serverTimestamp() }), false);
await t('ইনভাইট গ্রহণ চলে', updateDoc(doc(bob, 'invites', 'i1'), { status: 'accepted' }), true);
await t('আজব স্ট্যাটাস নয়', updateDoc(doc(bob, 'invites', 'i1'), { status: 'hacked' }), false);
await t('অন্যের প্রাইভেট তথ্য পড়া যায় না', getDoc(doc(alice, 'private', 'bob')), false);
await t('অ্যাডমিনের গোপন হ্যাশ পড়া যায় না', getDoc(doc(alice, 'admin', 'secret')), false);
console.log(`\nপাস ${pass}, ফেল ${fail}`); await env.cleanup(); process.exit(fail ? 1 : 0);
