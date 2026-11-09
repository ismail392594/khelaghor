// যেকোনো নতুন গেমের ছবি তোলা আর বট পরীক্ষা (রিপোর রুটে python3 -m http.server 8811 চালিয়ে):
//   OUT=/tmp KEY=ekka READY="window.KHG" SETUP="KHG.start(1)" BOT="KHG.bot(3000)" node tools/tests/game-shot.cjs
// ফল: $OUT/<KEY>_shot.png (৪১২×৯১৫), $OUT/<KEY>_og.png (১২০০×৬৩০, লেখা ছাড়া), বটের ফল আর ভুল কনসোলে
const { chromium } = require('playwright');
const E = process.env, KEY = E.KEY;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const [w, h, out] of [[412, 915, 'shot'], [1200, 630, 'og']]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://localhost:8811/games/${KEY}/`); await p.waitForFunction(E.READY, null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.evaluate(E.SETUP); await p.waitForTimeout(+(E.WAIT || 2500));
    if (out === 'og') await p.addStyleTag({ content: '.hud,.ctl,.chost,.khViral,.say,.pop,.turn,.meter,.pw,.spins,.beat,.prog,.pos,.race,.breath,.route,.fare,.bub,.mood,.qinfo,.tags,.seats,.dls,.tbar,.line,.seatq,.order,.cur,.cinfo,.acts2,.deal,.meters,.warn,.sb,.big,.fact,.phoneq,.lives,.fare,.tags,.micv,.steps,.tg,.order,.pin,#sms{display:none!important}' });
    await p.waitForTimeout(400); await p.screenshot({ path: `${E.OUT}/${KEY}_${out}.png` });
    if (out === 'shot' && E.BOT) console.log('bot', JSON.stringify(await p.evaluate(E.BOT)));
    await p.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
