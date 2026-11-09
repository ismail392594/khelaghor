/* খেলাঘরের সব গেমের তালিকা (হাব আর গেমের শেষ পর্দার "আরো খেলুন" দুই জায়গাতেই লাগে)।
   n = নাম, u = ঠিকানা, k = ছবির নাম (icons/shots/k.webp), m = মুড, d = যোগ হওয়ার তারিখ (নতুন ব্যাজের জন্য)।
   মুড: quick (৫ মিনিটের মজা), brain (মাথা খাটাও), friends (বন্ধুদের সাথে), trad (ঐতিহ্য), life (দেশের বাস্তব জীবন), action (অ্যাকশন), calm (আরামে) */
window.KH_CAT = [
  ['লুডু', '/games/ludo/', 'ludo', 'friends calm', ''], ['মশা মারো', '/games/mosha/', 'mosha', 'quick action', ''], ['ঢাকা জ্যাম রানার', '/games/jam/', 'jam', 'action life', ''],
  ['বাজার দর চ্যালেঞ্জ', '/games/bazar/', 'bazar', 'brain life quick', ''], ['আর্জেন্টিনা বনাম ব্রাজিল', '/games/argbra/', 'argbra', 'quick friends', ''], ['হাইওয়ে রাজা', '/games/racer/', 'racer', 'action life', ''],
  ['ক্যারম', '/games/carrom/', 'carrom', 'trad friends', ''], ['ষোলোগুটি', '/games/sholo/', 'sholo', 'trad brain', ''], ['বাঘবন্দি', '/games/bagh/', 'bagh', 'trad brain', ''],
  ['ঘুড়ি কাটাকাটি', '/games/ghuri/', 'ghuri', 'trad action', ''], ['হাডুডু', '/games/hadudu/', 'hadudu', 'trad action', ''], ['কলব্রিজ', '/games/callbridge/', 'callbridge', 'trad brain friends', ''],
  ['টুয়েন্টি নাইন', '/games/twentynine/', 'twentynine', 'trad brain friends', ''], ['দাবা', '/games/chess/', 'chess', 'brain friends calm', ''], ['গোল্লাছুট', '/games/gollachut/', 'gollachut', 'trad action', ''],
  ['দাড়িয়াবান্ধা', '/games/dariabandha/', 'dariabandha', 'trad action', ''], ['কানামাছি', '/games/kanamachi/', 'kanamachi', 'trad quick', '2026-11-08'], ['ডাংগুলি', '/games/dangguli/', 'dangguli', 'trad quick', '2026-11-08'],
  ['লাটিম', '/games/latim/', 'latim', 'trad quick', '2026-11-08'], ['মার্বেল', '/games/marble/', 'marble', 'trad calm', '2026-11-08'], ['এক্কা-দোক্কা', '/games/ekkadokka/', 'ekkadokka', 'trad quick', '2026-11-09'],
  ['রুমাল চুরি', '/games/rumal/', 'rumal', 'trad quick', '2026-11-09'], ['নৌকা বাইচ', '/games/nouka/', 'nouka', 'trad action', '2026-11-09'], ['বউচি', '/games/bouchi/', 'bouchi', 'trad action', '2026-11-09'],
  ['লোকাল বাস হেলপার', '/games/helper/', 'helper', 'life brain', '2026-11-09'], ['লোডশেডিং সারভাইভাল', '/games/loadshed/', 'loadshed', 'life calm', ''], ['রিকশা ভাড়া দরদাম', '/games/rickshaw/', 'rickshaw', 'life brain quick', '2026-11-09'],
  ['ঈদের বাস টিকিট', '/games/eidticket/', 'eidticket', 'life quick', '2026-11-10'], ['মেট্রোরেল রাশ', '/games/metro/', 'metro', 'life quick', '2026-11-10'], ['ফুচকা মাস্টার', '/games/fuchka/', 'fuchka', 'life quick', '2026-11-10'],
  ['বিয়েবাড়ির বিরিয়ানি', '/games/biryani/', 'biryani', 'life quick', ''], ['কোরবানির হাট', '/games/haat/', 'haat', 'life brain', '2026-11-10'], ['জলাবদ্ধতা রাইড', '/games/jolabaddho/', 'jolabaddho', 'life action', '2026-11-10'],
  ['শেষ বলে ছক্কা', '/games/chokka/', 'chokka', 'action quick', '2026-11-10'], ['পরীক্ষার আগের রাত', '/games/porikkha/', 'porikkha', 'brain life', '2026-11-10'], ['অটোরিকশা উল্টো পথে', '/games/autorickshaw/', 'autorickshaw', 'action life', '2026-11-10'],
  ['চিৎকার করো না', '/games/chitkar/', 'chitkar', 'quick life', '2026-11-10'], ['গ্যাস সিলিন্ডার মিশন', '/games/gas/', 'gas', 'life brain', '2026-11-10'], ['ফেসবুক কমেন্ট যোদ্ধা', '/games/comment/', 'comment', 'brain quick', '2026-11-10'],
  ['ডেলিভারি রাইডার', '/games/delivery/', 'delivery', 'action life', '2026-11-10'], ['বাড়িওয়ালা বনাম ভাড়াটিয়া', '/games/bariwala/', 'bariwala', 'brain life calm', '2026-11-10'], ['শীতের পিঠা মেলা', '/games/pitha/', 'pitha', 'quick life', '2026-11-10'],
  ['ইন্টারভিউ সারভাইভাল', '/games/interview/', 'interview', 'brain life', '2026-11-10'], ['পটকা পাহারা', '/games/potka/', 'potka', 'quick life', '2026-11-10']
].map(([n, u, k, m, d]) => ({ n, u, k, m: m.split(' '), d }));
window.KH_MOODS = [['quick', '⚡', '৫ মিনিটের মজা', 'ঝটপট এক দান'], ['brain', '🧠', 'মাথা খাটাও', 'বুদ্ধির খেলা'], ['friends', '👫', 'বন্ধুদের সাথে', 'একসাথে খেলুন'], ['trad', '🪁', 'ঐতিহ্যের খেলা', 'ছোটবেলার মাঠ'], ['life', '🇧🇩', 'দেশের বাস্তব জীবন', 'রাস্তা, বাজার, বাসা'], ['action', '🔥', 'অ্যাকশন', 'দৌড়, গতি, উত্তেজনা'], ['calm', '🍃', 'আরামে খেলো', 'চাপ ছাড়া']];
