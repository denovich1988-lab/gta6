// Menu + search
(() => {
  const btn = document.querySelector('[data-menu-btn]');
  const drawer = document.querySelector('[data-drawer]');
  if (!btn || !drawer) return;
  const input = drawer.querySelector('[data-search-input]');
  const results = drawer.querySelector('[data-results]');
  const set = (open) => { drawer.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) input.focus({ preventScroll: true }); };
  btn.addEventListener('click', () => set(drawer.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { set(false); btn.focus(); } });
  let index = null;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.hidden = true; return; }
    if (!index) index = await fetch((document.documentElement.dataset.p || '') + '/search-index.json').then((r) => r.json()).catch(() => []);
    const words = q.split(/\s+/);
    const found = index.filter((g) => words.every((w) => (g.t + ' ' + g.d + ' ' + g.s).toLowerCase().includes(w))).slice(0, 12);
    results.innerHTML = found.length ? found.map((g) => `<li><a href="${g.u}">${esc(g.t)}<span>${esc(g.s)}</span></a></li>`).join('') : `<li><a href="${document.documentElement.dataset.p || ''}/guides/">${esc(results.dataset.empty || 'No matches')}</a></li>`;
    results.hidden = false;
  });
})();
// Tables become cards on phones
document.querySelectorAll('.prose table').forEach((t) => {
  const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
  if (!heads.length) return;
  t.classList.add('stack');
  t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => heads[i] && td.setAttribute('data-label', heads[i])));
});

// Close the language menu when clicking elsewhere
document.addEventListener('click', (e) => { document.querySelectorAll('details.lang[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });
// Cookie choice (Google Consent Mode)
(() => {
  const box = document.querySelector('[data-consent]');
  if (!box) return;
  let saved = null;
  try { saved = localStorage.getItem('consent'); } catch (e) {}
  if (!saved) box.hidden = false;
  const choose = (yes) => {
    try { localStorage.setItem('consent', yes ? 'yes' : 'no'); } catch (e) {}
    if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: yes ? 'granted' : 'denied' });
    box.hidden = true;
  };
  box.querySelector('[data-consent-yes]').addEventListener('click', () => choose(true));
  box.querySelector('[data-consent-no]').addEventListener('click', () => choose(false));
})();

// D-pad codes: show the button sequence as arrows under the text (all site languages)
(() => {
  const W = { up: '↑', arriba: '↑', cima: '↑', 'вверх': '↑', haut: '↑', oben: '↑', 'góra': '↑', su: '↑',
    down: '↓', abajo: '↓', baixo: '↓', 'вниз': '↓', bas: '↓', unten: '↓', 'dół': '↓', 'giù': '↓',
    left: '←', izquierda: '←', esquerda: '←', 'влево': '←', gauche: '←', links: '←', lewo: '←', sinistra: '←',
    right: '→', derecha: '→', direita: '→', 'вправо': '→', droite: '→', rechts: '→', prawo: '→', destra: '→' };
  document.querySelectorAll('.prose td, .prose li').forEach((el) => {
    if (el.children.length && !(el.children.length === 1 && el.firstElementChild.tagName === 'STRONG')) return;
    const words = el.textContent.split(':').pop().trim().replace(/\.$/, '').split(/\s*,\s*/);
    if (words.length < 5) return;
    const arrows = words.map((w) => W[w.toLowerCase()]);
    if (arrows.some((a) => !a)) return;
    const row = document.createElement('span');
    row.className = 'dpad'; row.setAttribute('aria-hidden', 'true');
    row.innerHTML = arrows.map((a) => `<i>${a}</i>`).join('');
    el.appendChild(row);
  });
})();
// Back to top
(() => {
  const b = document.querySelector('[data-to-top]');
  if (!b) return;
  let shown = false;
  const check = () => { const s = scrollY > 1400; if (s !== shown) { shown = s; b.hidden = !s; } };
  addEventListener('scroll', check, { passive: true });
  b.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
})();
// Menu button shows an X while the menu is open (state is on aria-expanded)

// YouTube: swap the thumbnail for the privacy-enhanced player on press.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-yt]');
  if (!a) return;
  e.preventDefault();
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
  f.title = a.getAttribute('aria-label') || 'YouTube video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  f.loading = 'lazy';
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  a.replaceWith(f);
});
