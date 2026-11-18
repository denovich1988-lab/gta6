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
