// অতিথি খেলোয়াড়: লগইন ছাড়াই খেলা যায়; খেলা শেষে মনে করিয়ে দেয় যে লগইন করলে স্কোর লিডারবোর্ডে উঠবে
(function () {
  function note() {
    const end = document.getElementById('endO'); if (!end) return;
    const card = end.querySelector('.card'); if (!card) return;
    let n = card.querySelector('.guestNote');
    if (!window.KH_GUEST) { if (n) n.remove(); return; }
    if (n) return;
    n = document.createElement('a'); n.className = 'guestNote'; n.href = '/';
    n.textContent = '🔐 লগইন করলে আপনার স্কোর লিডারবোর্ডে উঠবে, পয়েন্টও জমবে। হাবে গিয়ে লগইন করুন →';
    n.style.cssText = 'display:block;padding:10px 12px;border-radius:14px;background:rgba(255,210,63,.16);border:1px solid rgba(255,210,63,.55);color:inherit;font-weight:700;font-size:.85rem;text-decoration:none;line-height:1.4';
    const acts = card.querySelector('.acts'); card.insertBefore(n, acts || null);
  }
  function watch() {
    const end = document.getElementById('endO'); if (!end) return;
    new MutationObserver(() => { if (!end.hidden) note(); }).observe(end, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
