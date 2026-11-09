// ফোন বুঝে গ্রাফিক্স: GPU, মেমরি, কোর দেখে শুরুর মান ঠিক করে, তারপর খেলার সময় ফ্রেম রেট দেখে রেজোলিউশন নিজে থেকে কমায়-বাড়ায়।
export const TIERS = [
  { id: 0, name: 'খুব কম', pr: .7, shadow: 0, trees: 36, traffic: 12, far: 380, aa: false },
  { id: 1, name: 'কম', pr: 1, shadow: 0, trees: 70, traffic: 18, far: 520, aa: false },
  { id: 2, name: 'মাঝারি', pr: 1.5, shadow: 1024, trees: 110, traffic: 24, far: 680, aa: true },
  { id: 3, name: 'উঁচু', pr: 2, shadow: 2048, trees: 150, traffic: 30, far: 720, aa: true }
];

export function gpuName() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); return r;
  } catch (e) { return ''; }
}

// ০-৩: যত বেশি তত ভালো ফোন
export function detectTier() {
  const ua = navigator.userAgent, mobile = /Android|iPhone|iPad|Mobile/i.test(ua), mem = navigator.deviceMemory || (mobile ? 3 : 8), cores = navigator.hardwareConcurrency || 4;
  const g = gpuName(); if (!g) return 0;
  if (/SwiftShader|llvmpipe|Software/i.test(g)) return 0;
  if (!mobile) return /Intel.*(HD Graphics [2-5]\d{2,3}|HD Graphics$)|GMA|Mali|PowerVR/i.test(g) ? 2 : 3;
  if (/Mali-(4|T[67])|Adreno \(TM\) (3|4)\d\d|Adreno.?[34]\d\d|SGX|PowerVR Rogue G|Vivante|GC\d{3,4}/i.test(g) || mem <= 1.5) return 0;
  if (/Apple/i.test(g) || /iPhone|iPad/.test(ua)) return (screen.width * devicePixelRatio >= 1100 && cores >= 6) ? 3 : 2;
  if (/Adreno \(TM\) (7[3-9]\d|8\d\d)|Immortalis|Mali-G7[1-9]|Mali-G[6-9]\d\d|Xclipse/i.test(g) && mem >= 6) return 3;
  if (/Adreno \(TM\) (5[0-3]\d|6[01]\d)|Mali-G(31|51|52|57)|PowerVR/i.test(g) || mem <= 2 || cores <= 4) return 1;
  return 2;
}

// খেলার সময়: প্রতি ০.৭৫ সেকেন্ডে গড় ফ্রেম দেখে scale (০.৫-১) বদলায়; একদম নিচে গিয়েও ধীর হলে onDrop() (আরো কম মান)
export function autoScaler({ onScale, onDrop, onRaise }) {
  let acc = 0, n = 0, scale = 1, slowFor = 0, fastFor = 0, enabled = true;
  return {
    get scale() { return scale; },
    set enabled(v) { enabled = v; if (!v) { scale = 1; onScale(scale); } },
    reset() { acc = 0; n = 0; slowFor = 0; fastFor = 0; },
    tick(dt) {
      if (!enabled || dt <= 0 || dt > .25) return; acc += dt; n++; if (acc < .75) return;
      const avg = acc / n; acc = 0; n = 0;
      if (avg > 1 / 42) { fastFor = 0; if (scale > .55) { scale = Math.max(.55, scale - (avg > 1 / 28 ? .15 : .08)); onScale(scale); } else if ((slowFor += .75) > 2.2) { slowFor = 0; onDrop && onDrop(); } }
      else if (avg < 1 / 56) { slowFor = 0; if ((fastFor += .75) > 3 && scale < 1) { fastFor = 0; scale = Math.min(1, scale + .06); onScale(scale); } else if (fastFor > 9 && scale >= 1) { fastFor = 0; onRaise && onRaise(); } }
      else { slowFor = 0; fastFor = 0; }
    }
  };
}
