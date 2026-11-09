# খেলার স্বয়ংক্রিয় পরীক্ষা (Playwright, হেডলেস Chromium)

রিপোর রুট থেকে একটা সার্ভার চালান, তারপর স্ক্রিপ্ট:

```
python3 -m http.server 8811 &
OUT=/tmp node tools/tests/racer-bot.cjs                     # রোবট চালক: MODE=sim|race RIDE=bus_hino|sport|cng|moto SECS=1300 LV=0-2
OUT=/tmp node tools/tests/racer-stop-scene.cjs              # স্টপেজে ওঠানামার দৃশ্য + ছবি
GFX=high OUT=/tmp node tools/tests/racer-perf.cjs           # ড্র-কল আর ত্রিভুজ গোনা (দুই ফ্রেম মিলিয়ে)
OUT=/tmp node tools/tests/jam-rides.cjs                     # জ্যাম রানারে রিকশা/বাস চালিয়ে দেখা
```

- হেডলেস ব্রাউজার "খুব কম" গ্রাফিক্স ধরে নেয়; পুরো গাড়ির তালিকা দেখতে localStorage `kh-racer-cfg` = `{"gfx":"high"}` দিন (স্ক্রিপ্টগুলোতে আছে)।
- খেলার পরীক্ষার হুক: `window.KHRacer` (start, tick(n), keys, addCar, addTyped, dbg.bend, dbg.place, S) আর `window.KHJam` (frame(dt), S)।
- Firestore-এর "offline" ভুল উপেক্ষা করা যায় (পরীক্ষার সার্ভার থেকে Firebase পাওয়া যায় না)।
