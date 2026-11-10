// চালানো: (রিপোর রুটে `python3 -m http.server 8811` চালু রেখে) node tools/people/atlas.cjs <আউটপুট ফোল্ডার>
// বানায়: people.png (৩ জন × ৩ দিক, প্রতি ঘর ২৫৬×৫১২) আর people_seat.png (৩ জন × ২ দিক, পেছন থেকে বাসের সিটে বসা)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
  await p.goto('http://localhost:8811/tools/people/atlas.html'); await p.waitForFunction('window.READY', null, { timeout: 120000 });
  const out = process.argv[2], PEOPLE = [0, 1, 3], WOMEN2 = [6, 2, 8];
  for (const [i, idx] of PEOPLE.entries()) for (const [j, yaw] of [0, .45, -.45].entries()) { const d = await p.evaluate(([a, y]) => window.cell(a, y, 0, 256, 512), [idx, yaw]); fs.writeFileSync(`${out}/p_${i * 3 + j}.png`, Buffer.from(d.split(',')[1], 'base64')); }
  for (const [i, idx] of [0, 1, 5].entries()) for (const [j, yaw] of [Math.PI, Math.PI - .9].entries()) { const d = await p.evaluate(([a, y]) => window.cell(a, y, 1, 256, 320), [idx, yaw]); fs.writeFileSync(`${out}/s_${i * 2 + j}.png`, Buffer.from(d.split(',')[1], 'base64')); }
  await b.close(); })();
