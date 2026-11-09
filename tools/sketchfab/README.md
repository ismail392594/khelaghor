# Sketchfab থেকে মডেল খোঁজা আর নামানো (শুধু CC0/CC-BY)

- `sfsearch.py "q1" "q2"` → cands.json (শুধু CC Attribution / CC0, downloadable)
- `thumbs.py out.png uid...` → ছবির পাতা দেখে মান যাচাই
- `sfdl.py` → fleet.json-এর uid নামায় (raw/*.glb) আর meta.json-এ লেখক/লিংক রাখে
- নামাতে Sketchfab API key লাগে: এটা সেশনের "khelaghor" cloud environment-এ network secret হিসেবে রাখা (host api.sketchfab.com, Authorization: Token …)। কোডে বা চ্যাটে key নেই/থাকবে না।
- ছোট করা: `tools/vehicle-asset.mjs` (গাড়ি), `tools/racer-prop-asset.mjs` (প্রপ)। মানুষ/গাছ: `person-impostor.*`, `tree-impostor.html` দিয়ে ব্রাউজারে ছবি করে webp।
- CC-BY হলে assets/vehicles/CREDITS.txt বা games/*/assets/CREDITS.txt-এ লেখক + লিংক, আর খেলার পাতায় ক্রেডিট।
