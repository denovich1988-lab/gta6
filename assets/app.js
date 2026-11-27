// Menu + search
(() => {
  const btn = document.querySelector('[data-menu-btn]');
  const drawer = document.querySelector('[data-drawer]');
  if (!btn || !drawer) return;
  const input = drawer.querySelector('[data-search-input]');
  const set = (open) => { drawer.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) input.focus({ preventScroll: true }); };
  btn.addEventListener('click', () => set(drawer.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { set(false); btn.focus(); } });
  let index = null;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // Every search box (menu drawer and home page) uses the same index of the current language.
  document.querySelectorAll('[data-search-input]').forEach((box) => {
    const results = box.parentElement.querySelector('[data-results]');
    box.addEventListener('input', async () => {
      const q = box.value.trim().toLowerCase();
      if (q.length < 2) { results.hidden = true; return; }
      if (!index) index = await fetch((document.documentElement.dataset.p || '') + '/search-index.json').then((r) => r.json()).catch(() => []);
      const words = q.split(/\s+/);
      const found = index.filter((g) => words.every((w) => (g.t + ' ' + g.d + ' ' + g.s).toLowerCase().includes(w))).slice(0, 12);
      results.innerHTML = found.length ? found.map((g) => `<li><a href="${g.u}">${esc(g.t)}<span>${esc(g.s)}</span></a></li>`).join('') : `<li><a href="${document.documentElement.dataset.p || ''}/guides/">${esc(results.dataset.empty || 'No matches')}</a></li>`;
      results.hidden = false;
    });
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = results.querySelector('a'); if (a && !results.hidden) location.href = a.href; } });
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
// Wiki A–Z: filter by text and category
(() => {
  const root = document.querySelector('[data-wiki]');
  if (!root) return;
  const q = root.querySelector('[data-wiki-q]');
  const chips = [...root.querySelectorAll('[data-wiki-cat]')];
  const none = root.querySelector('[data-wiki-none]');
  let cat = '';
  const run = () => {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    root.querySelectorAll('[data-wiki-group]').forEach((g) => {
      let n = 0;
      g.querySelectorAll('li').forEach((li) => {
        const ok = (!cat || li.dataset.cat === cat) && words.every((w) => li.textContent.toLowerCase().includes(w));
        li.hidden = !ok; if (ok) n++;
      });
      g.hidden = !n; shown += n;
    });
    none.hidden = shown > 0;
  };
  q.addEventListener('input', run);
  chips.forEach((b) => b.addEventListener('click', () => { cat = b.dataset.wikiCat; chips.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); run(); }));
})();

// Progress tracker: missions ticked off on the home page and on walkthroughs,
// and walkthrough objectives, are saved in this browser only.
(() => {
  const KEY = 'gta6touch-done';
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };
  const boxes = () => document.querySelectorAll('input[data-done]');
  const paint = () => {
    boxes().forEach((b) => { b.checked = !!done[b.dataset.done]; });
    document.querySelectorAll('[data-tracker]').forEach((t) => {
      const all = t.querySelectorAll('input[data-done]');
      const n = [...all].filter((b) => b.checked).length;
      const cnt = t.querySelector('[data-tracker-count]'); if (cnt) cnt.textContent = `${n} / ${all.length} done`;
      const bar = t.querySelector('[data-tracker-bar]'); if (bar) bar.style.width = (all.length ? n / all.length * 100 : 0) + '%';
    });
  };
  boxes().forEach((b) => b.addEventListener('change', () => { if (b.checked) done[b.dataset.done] = 1; else delete done[b.dataset.done]; save(); paint(); }));
  paint();
  // Objectives on walkthroughs become a checklist.
  const h = document.getElementById('objectives');
  let ol = null;
  for (let el = h && h.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) if (el.tagName === 'OL') { ol = el; break; }
  if (ol) {
    const page = location.pathname;
    ol.classList.add('objs');
    [...ol.children].forEach((li, i) => {
      const k = `obj:${page}:${i}`;
      li.innerHTML = `<label><input type="checkbox"${done[k] ? ' checked' : ''}><span>${li.innerHTML}</span></label>`;
      li.querySelector('input').addEventListener('change', (e) => { if (e.target.checked) done[k] = 1; else delete done[k]; save(); });
    });
  }
})();

// Home page tabs and the search button.
document.querySelectorAll('[data-tabs]').forEach((box) => {
  const tabs = box.querySelectorAll('[data-tab]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    box.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  }));
});
document.querySelectorAll('[data-search-go]').forEach((b) => b.addEventListener('click', () => {
  const a = b.parentElement.querySelector('[data-results] a');
  if (a) location.href = a.href; else b.parentElement.querySelector('input').focus();
}));
