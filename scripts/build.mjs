// Static site builder for the GTA 6 guide.
// English: content/guides, content/blog, content/pages → dist/
// Translations: content/i18n/<lang>/{guides,blog,pages}/<same file name>.md → dist/<lang>/
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const UI = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'ui.json'), 'utf8'));
const SITE_URL = (process.env.SITE_URL || site.url).replace(/\/$/, '');
const BUILD_ID = Date.now().toString(36);
const PER_PAGE = 40;
const LANGS = site.languages; // [{ code, name, locale, date }], English first

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); // Asia/Tashkent
const write = (rel, html) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const fill = (t) => String(t).replaceAll('{{SITE}}', site.name).replaceAll('{{URL}}', SITE_URL).replaceAll('{{EMAIL}}', site.email);
const marked = new Marked();

const IMG = fs.existsSync(path.join(ROOT, 'images.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'images.json'), 'utf8')) : { images: {}, sections: {} };
const hasImg = (n) => n && fs.existsSync(path.join(ROOT, 'assets', 'img', `${n}.webp`));
const secImg = (k) => IMG.sections[k];
const ORG_ID = `${SITE_URL}/#organization`;
const WEB_ID = `${SITE_URL}/#website`;
const OG = `${SITE_URL}/assets/og.png`;
const LEGAL = ['about', 'contact', 'privacy', 'terms', 'disclaimer'];
const EEA = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
const GAME = { '@type': 'VideoGame', name: 'Grand Theft Auto VI', alternateName: 'GTA 6', gamePlatform: ['PlayStation 5', 'Xbox Series X|S'], publisher: { '@type': 'Organization', name: 'Rockstar Games' } };

function load(dir, required) {
  const d = path.join(ROOT, 'content', dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.md')).map((file) => {
    const { data, content } = matter(fs.readFileSync(path.join(d, file), 'utf8'));
    for (const k of required) if (!data[k]) throw new Error(`${dir}/${file}: missing "${k}"`);
    const body = fill(content);
    const words = body.split(/\s+/).length;
    return {
      ...data,
      slug: data.slug || file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
      title: data.title, description: fill(data.description),
      date: data.date ? iso(data.date) : '', updated: iso(data.updated || data.date || today()),
      summary: data.summary || [], faq: (data.faq || []).map((f) => ({ q: fill(f.q), a: fill(f.a) })), sources: data.sources || [],
      words, minutes: Math.max(1, Math.round(words / 220)), html: marked.parse(body).replace(/<a href="(https?:\/\/[^"]+)"/g, (m, u) => (u.startsWith(SITE_URL) ? m : `<a href="${u}" rel="nofollow noopener" target="_blank"`)),
    };
  });
}

// A translation keeps the English file's facts (section, dates, status, sources, image) and replaces the text.
function translate(enDocs, lang, dir) {
  const tr = new Map(load(`i18n/${lang}/${dir}`, ['title', 'description']).map((d) => [d.slug, d]));
  return enDocs.filter((d) => tr.has(d.slug)).map((d) => {
    const x = tr.get(d.slug);
    return { ...d, title: x.title, seoTitle: x.seoTitle || x.title, description: x.description, summary: x.summary.length ? x.summary : d.summary, faq: x.faq.length ? x.faq : d.faq, html: x.html, words: x.words, minutes: x.minutes };
  });
}

// ---------- content ----------
const T0 = today();
const enGuides = [...load('guides', ['title', 'description', 'section', 'date']), ...load('blog', ['title', 'description', 'date']).map((p) => ({ ...p, section: 'blog', isBlog: true }))]
  .filter((g) => !g.draft && g.date <= T0).sort((a, b) => b.updated.localeCompare(a.updated) || a.slug.localeCompare(b.slug));
const enPages = load('pages', ['title', 'description', 'updated']);
const seen = new Set();
for (const g of enGuides) {
  if (!site.sections[g.section]) throw new Error(`${g.slug}: unknown section "${g.section}"`);
  if (seen.has(g.slug)) throw new Error(`duplicate slug ${g.slug}`);
  seen.add(g.slug);
}

const CTX = [];
for (const lang of LANGS) {
  const en = lang.code === 'en';
  const guides = en ? enGuides : [...translate(enGuides.filter((g) => !g.isBlog), lang.code, 'guides'), ...translate(enGuides.filter((g) => g.isBlog), lang.code, 'blog')].sort((a, b) => b.updated.localeCompare(a.updated) || a.slug.localeCompare(b.slug));
  if (!en && !guides.length) continue; // a language goes live with its first translated guide
  const ui = { ...UI.en, ...(UI[lang.code] || {}) };
  const t = (k, vars = {}) => fill(String(ui[k] ?? k).replace(/\{(\w+)\}/g, (m, v) => vars[v] ?? m));
  const sections = Object.fromEntries(Object.keys(site.sections).filter((k) => guides.some((g) => g.section === k)).map((k) => [k, en ? site.sections[k] : { ...site.sections[k], ...(ui.sections?.[k] || {}) }]));
  CTX.push({
    lang, L: lang.code, en, P: en ? '' : `/${lang.code}`, t, ui, guides, sections,
    pages: en ? enPages : translate(enPages, lang.code, 'pages'),
    fmtDate: (d) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang.date, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
    count: (k, n) => (en ? `${n} ${k === 'blog' ? 'post' : 'guide'}${n === 1 ? '' : 's'}` : t(k === 'blog' ? 'countPosts' : 'countGuides', { n })),
    secName: (k) => sections[k]?.name || site.sections[k]?.name || k,
  });
}

// Page registry: every page is registered first, so hreflang links and the language switcher know which versions exist.
const REG = []; // { c, rel, lastmod, render }
const HAS = Object.fromEntries(CTX.map((c) => [c.L, new Set()]));
const add = (c, rel, lastmod, render) => { REG.push({ c, rel, lastmod, render }); HAS[c.L].add(rel); };
const alternates = (rel) => CTX.filter((c) => HAS[c.L].has(rel));
const pageUrl = (c, slug) => (HAS[c.L].has(`/${slug}/`) ? `${c.P}/${slug}/` : `/${slug}/`);

const img = (n, cls, eager = false) => hasImg(n) ? `<img class="${cls}" src="/assets/img/${n}-800.webp" srcset="/assets/img/${n}-800.webp 800w, /assets/img/${n}.webp 1600w" sizes="${cls.includes('hero') || cls.includes('banner') ? '100vw' : '(max-width: 640px) 100vw, 380px'}" width="1600" height="900" alt="${esc(IMG.images[n]?.alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>` : '';
const titleTag = (c, t) => { if (!t) return `${c.t('homeTitle')} | ${site.name}`; const full = `${t} | ${site.name}`; return full.length <= 62 ? full : t; };
const crumbsNav = (c, list) => list.length ? `<nav class="crumbs" aria-label="Breadcrumb"><ol>${[[c.t('home'), `${c.P}/`], ...list].map(([n, u], i, a) => i === a.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>` : '';
const faqHtml = (c, faq) => faq.length ? `<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">${esc(c.t('faq'))}</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : '';
const faqSchema = (faq) => faq.length ? { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;

const googleTag = () => (site.gtmId ? `<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted'});
  gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', region: ${JSON.stringify(EEA)}});
  try { var c = localStorage.getItem('consent'); if (c) gtag('consent', 'update', {analytics_storage: c === 'yes' ? 'granted' : 'denied'}); } catch (e) {}
</script>
<script async src="https://www.googletagmanager.com/gtm.js?id=${site.gtmId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>` : '');

function layout(c, { title, description, rel, body, crumbs = [], jsonLd = [], ogType = 'website', published = '', modified = '', noindex = false }) {
  const full = titleTag(c, title);
  const desc = description || c.t('siteDescription');
  const canonical = SITE_URL + c.P + rel;
  const alts = noindex ? [] : alternates(rel);
  const secs = Object.entries(c.sections);
  const nav = secs.map(([k, s]) => `<a href="${c.P}/${k}/"${rel.startsWith(`/${k}/`) ? ' aria-current="page"' : ''}>${esc(s.name)}</a>`).join('');
  const langLinks = CTX.map((x) => `<a href="${HAS[x.L].has(rel) ? x.P + rel : `${x.P}/`}" hreflang="${x.L}" lang="${x.L}"${x.L === c.L ? ' aria-current="true"' : ''}>${esc(x.lang.name)}</a>`).join('');
  const graph = [
    { '@type': 'Organization', '@id': ORG_ID, name: site.name, url: SITE_URL + '/', logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/icon-512.png`, width: 512, height: 512 }, email: site.email },
    { '@type': 'WebSite', '@id': WEB_ID, name: site.name, url: SITE_URL + '/', description: site.description, inLanguage: CTX.map((x) => x.L), publisher: { '@id': ORG_ID }, about: GAME },
  ];
  if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: [[c.t('home'), `${c.P}/`], ...crumbs].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE_URL + u })) });
  for (const j of jsonLd) if (j) graph.push(j);
  return `<!doctype html>
<html lang="${c.L}" data-p="${c.P}">
<head>
${googleTag()}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'}">
<link rel="canonical" href="${canonical}">
${alts.length > 1 ? alts.map((x) => `<link rel="alternate" hreflang="${x.L}" href="${SITE_URL}${x.P}${rel}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE_URL}${rel}">` : ''}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${c.lang.locale}">
${alts.filter((x) => x.L !== c.L).map((x) => `<meta property="og:locale:alternate" content="${x.lang.locale}">`).join('\n')}
<meta property="og:title" content="${esc(title || full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${published ? `<meta property="article:published_time" content="${published}">\n<meta property="article:modified_time" content="${modified || published}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title || full)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${OG}">
<meta name="theme-color" content="#140f26">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/display.woff2" as="font" type="font/woff2" crossorigin>
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${c.P}/rss.xml">
<link rel="stylesheet" href="/assets/style.css?v=${BUILD_ID}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">${esc(c.t('skip'))}</a>
<header class="top">
  <div class="wrap top__row">
    <a class="logo" href="${c.P}/" aria-label="${esc(site.name)}"><span class="logo__sun" aria-hidden="true"></span>${esc(site.name)}</a>
    <nav class="top__nav" aria-label="${esc(c.t('sectionsLabel'))}">${nav}</nav>
    ${CTX.length > 1 ? `<details class="lang"><summary aria-label="${esc(c.t('language'))}: ${esc(c.lang.name)}">${c.L.toUpperCase()}</summary><div class="lang__list">${langLinks}</div></details>` : ''}
    <button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-controls="drawer"><span class="menu-btn__icon" aria-hidden="true"></span><span class="vh">${esc(c.t('menu'))}</span></button>
  </div>
  <div class="drawer" id="drawer" data-drawer hidden><div class="wrap drawer__inner">
    <label class="vh" for="dq">${esc(c.t('search'))}</label><input id="dq" type="search" placeholder="${esc(c.t('search'))}" data-search-input autocomplete="off">
    <ul class="results" data-results data-empty="${esc(c.t('noMatches'))}" hidden></ul>
    <div class="drawer__grid">${secs.map(([k, s]) => `<a href="${c.P}/${k}/">${esc(s.name)}</a>`).join('')}<a href="${c.P}/guides/">${esc(c.t('allGuides'))}</a></div>
    ${CTX.length > 1 ? `<p class="drawer__h">${esc(c.t('language'))}</p><div class="drawer__grid drawer__langs">${langLinks}</div>` : ''}
  </div></div>
</header>
<main id="main">
${body.replace('<!--CRUMBS-->', crumbsNav(c, crumbs))}
</main>
<footer class="foot">
  <div class="wrap foot__grid">
    <div><p class="logo logo--small"><span class="logo__sun" aria-hidden="true"></span>${esc(site.name)}</p><p class="foot__about">${esc(c.t('tagline'))}</p></div>
    <nav aria-label="${esc(c.t('footGuides'))}"><p class="foot__h">${esc(c.t('footGuides'))}</p>${secs.map(([k, s]) => `<a href="${c.P}/${k}/">${esc(s.name)}</a>`).join('')}</nav>
    <nav aria-label="${esc(c.t('footSite'))}"><p class="foot__h">${esc(c.t('footSite'))}</p><a href="${c.P}/guides/">${esc(c.t('allGuides'))}</a>${LEGAL.map((s) => `<a href="${pageUrl(c, s)}">${esc(c.t(`legal_${s}`))}</a>`).join('')}<a href="${c.P}/rss.xml">RSS</a></nav>
    ${CTX.length > 1 ? `<nav aria-label="${esc(c.t('language'))}"><p class="foot__h">${esc(c.t('language'))}</p>${langLinks}</nav>` : ''}
  </div>
  <div class="wrap"><p class="foot__copy">© ${new Date().getFullYear()} ${esc(site.name)}. ${esc(c.t('copyright'))}</p></div>
</footer>
${site.gtmId ? `<div class="consent" data-consent hidden role="region" aria-label="Cookies"><p>${esc(c.t('consentText'))} <a href="${pageUrl(c, 'privacy')}">${esc(c.t('legal_privacy'))}</a></p><div class="consent__actions"><button class="btn btn--ghost" type="button" data-consent-no>${esc(c.t('decline'))}</button><button class="btn" type="button" data-consent-yes>${esc(c.t('accept'))}</button></div></div>` : ''}
<script src="/assets/app.js?v=${BUILD_ID}" defer></script>
</body>
</html>`;
}

const card = (c, g) => `<li class="card"><a href="${c.P}/${g.section}/${g.slug}/">${img(g.image || secImg(g.section), 'card__img')}<span class="card__body"><span class="card__sec">${esc(c.secName(g.section))}</span><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><span class="card__meta">${esc(c.t('updated'))} ${c.fmtDate(g.updated)}</span></span></a></li>`;
const itemList = (c, name, items) => ({ '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.slice(0, 100).map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${c.P}/${g.section}/${g.slug}/`, name: g.title })) });
// Links written as /section/slug/ in a translated text point to the translated page when it exists.
const localize = (c, html) => (c.en ? html : html.replace(/href="(\/[^"#?]*)(#[^"]*)?"/g, (m, p, h = '') => (HAS[c.L].has(p) ? `href="${c.P}${p}${h}"` : m)));

function guidePage(c, g) {
  const rel = `/${g.section}/${g.slug}/`;
  const url = SITE_URL + c.P + rel;
  const related = c.guides.filter((x) => x.slug !== g.slug && (x.section === g.section || (g.related || []).includes(x.slug))).slice(0, 4);
  const body = `
<article class="guide">
  <header class="wrap guide__head">
    <!--CRUMBS-->
    <h1>${esc(g.title)}</h1>
    <p class="lede">${esc(g.description)}</p>
    <dl class="facts">
      ${g.status ? `<div><dt>${esc(c.t('status'))}</dt><dd class="status status--${g.status}">${esc(c.t(`status_${g.status}`))}</dd></div>` : ''}
      <div><dt>${esc(c.t('updated'))}</dt><dd><time datetime="${g.updated}">${c.fmtDate(g.updated)}</time></dd></div>
      <div><dt>${esc(c.t('read'))}</dt><dd>${g.minutes} ${esc(c.t('min'))}</dd></div>
      <div><dt>${esc(c.t('by'))}</dt><dd><a href="${pageUrl(c, 'about')}">${esc(c.t('team'))}</a></dd></div>
    </dl>
  </header>
  ${hasImg(g.image || secImg(g.section)) ? `<div class="wrap"><figure class="banner">${img(g.image || secImg(g.section), 'banner__img', true)}<figcaption>${esc(c.t('caption'))}</figcaption></figure></div>` : ''}
  <div class="wrap guide__body">
    ${g.summary.length ? `<aside class="summary" aria-labelledby="sum-h"><h2 id="sum-h">${esc(c.t('quick'))}</h2><ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></aside>` : ''}
    <div class="prose">${localize(c, g.html)}</div>
    ${faqHtml(c, g.faq)}
    ${g.sources.length ? `<section class="sources"><h2>${esc(c.t('sources'))}</h2><ul>${g.sources.map((s) => `<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.name)}</a></li>`).join('')}</ul></section>` : ''}
  </div>
</article>
${related.length ? `<section class="wrap more"><h2>${esc(c.t(g.isBlog ? 'readNext' : 'related'))}</h2><ul class="cards">${related.map((x) => card(c, x)).join('')}</ul></section>` : ''}`;
  return layout(c, {
    title: g.seoTitle || g.title, description: g.description, rel, ogType: 'article', published: g.date, modified: g.updated,
    crumbs: [[c.secName(g.section), `${c.P}/${g.section}/`], [g.title, c.P + rel]], body,
    jsonLd: [{ '@type': g.isBlog ? 'BlogPosting' : 'Article', '@id': `${url}#article`, headline: g.title, description: g.description, abstract: g.summary.join(' '), datePublished: g.date, dateModified: g.updated, url, mainEntityOfPage: url, image: hasImg(g.image) ? `${SITE_URL}/assets/img/${g.image}.webp` : OG, author: { '@type': 'Organization', '@id': ORG_ID, name: site.name, url: `${SITE_URL}/about/` }, publisher: { '@id': ORG_ID }, about: GAME, articleSection: c.secName(g.section), wordCount: g.words, inLanguage: c.L, isAccessibleForFree: true, citation: g.sources.map((s) => s.url) }, faqSchema(g.faq)],
  });
}

function addList(c, { base, h1, lede, list, title, description, crumbName, intro = '', kind = '' }) {
  const total = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const href = (n) => c.P + (n === 1 ? base : `${base}page/${n}/`);
  for (let p = 1; p <= total; p++) {
    const slice = list.slice((p - 1) * PER_PAGE, p * PER_PAGE);
    const rel = p === 1 ? base : `${base}page/${p}/`;
    const pg = c.t('pageN', { n: p });
    add(c, rel, list[0]?.updated || T0, () => layout(c, {
      title: p === 1 ? title : `${title.replace(/:.*/, '')} (${pg})`, description: p === 1 ? description : `${description} ${pg}.`, rel,
      crumbs: p === 1 ? [[crumbName, c.P + base]] : [[crumbName, c.P + base], [pg, c.P + rel]],
      body: `
<section class="wrap hero hero--small">
  <!--CRUMBS-->
  <h1>${esc(h1)}${p > 1 ? ` <span class="pg">${esc(pg)}</span>` : ''}</h1>
  ${p === 1 ? `<p class="lede">${esc(lede)}</p>` : ''}
</section>
<section class="wrap list" aria-labelledby="list-h">
  ${p === 1 && intro ? `<div class="prose intro">${intro}</div>` : ''}
  <h2 id="list-h" class="list__h">${esc(c.count(kind, list.length))}</h2>
  <ul class="cards">${slice.map((g) => card(c, g)).join('')}</ul>
  ${total > 1 ? `<nav class="paging" aria-label="${esc(pg)}">${p > 1 ? `<a href="${href(p - 1)}" rel="prev">${esc(c.t('newer'))}</a>` : ''}<span>${p} / ${total}</span>${p < total ? `<a href="${href(p + 1)}" rel="next">${esc(c.t('older'))}</a>` : ''}</nav>` : ''}
</section>`,
      jsonLd: [{ '@type': 'CollectionPage', '@id': `${SITE_URL}${c.P}${rel}#page`, name: h1, description, url: SITE_URL + c.P + rel, inLanguage: c.L, isPartOf: { '@id': WEB_ID }, about: GAME, mainEntity: itemList(c, h1, slice) }],
    }));
  }
}

function home(c) {
  const featured = (site.featured || []).map((slug) => c.guides.find((g) => g.slug === slug)).filter(Boolean);
  const faq = (Array.isArray(c.ui.homeFaq) ? c.ui.homeFaq : UI.en.homeFaq).map((f) => ({ q: fill(f.q), a: fill(f.a) }));
  const keys = Object.keys(c.sections);
  const cta1 = c.sections.missions ? 'missions' : keys[0];
  const cta2 = c.sections.map ? 'map' : keys.find((k) => k !== cta1);
  const body = `
<section class="hero hero--home${hasImg('hero') ? ' hero--img' : ''}">
  ${img('hero', 'hero__bg', true)}
  <div class="wrap hero__content">
    <p class="hero__kicker">${esc(c.t('kicker'))}</p>
    <h1>${esc(c.t('homeH1'))}</h1>
    <p class="lede">${esc(c.t('siteDescription'))}</p>
    <div class="hero__cta"><a class="btn" href="${c.P}/${cta1}/">${esc(c.sections[cta1].name)}</a>${cta2 && cta2 !== cta1 ? `<a class="btn btn--ghost" href="${c.P}/${cta2}/">${esc(c.sections[cta2].name)}</a>` : ''}</div>
  </div>
  ${hasImg('hero') ? '' : '<div class="horizon" aria-hidden="true"></div>'}
</section>
<section class="wrap sections" aria-labelledby="sec-h">
  <h2 id="sec-h">${esc(c.t('browse'))}</h2>
  <ul class="tiles">${Object.entries(c.sections).map(([k, s]) => `<li><a class="tile" href="${c.P}/${k}/">${img(secImg(k), 'tile__img')}<span class="tile__name">${esc(s.name)}</span><span class="tile__count">${esc(c.count(k, c.guides.filter((g) => g.section === k).length))}</span><span class="tile__desc">${esc(s.description)}</span></a></li>`).join('')}</ul>
</section>
${featured.length ? `<section class="wrap more" aria-labelledby="feat-h"><h2 id="feat-h">${esc(c.t('startHere'))}</h2><ul class="cards">${featured.map((g) => card(c, g)).join('')}</ul></section>` : ''}
<section class="wrap more" aria-labelledby="new-h"><h2 id="new-h">${esc(c.t('latest'))}</h2><ul class="cards">${c.guides.slice(0, 12).map((g) => card(c, g)).join('')}</ul><p class="all"><a class="btn btn--ghost" href="${c.P}/guides/">${esc(c.t('allGuides'))}</a></p></section>
<div class="wrap">${faqHtml(c, faq)}</div>`;
  return layout(c, { title: '', description: c.t('siteDescription'), rel: '/', body, jsonLd: [itemList(c, c.t('latest'), c.guides.slice(0, 20)), faqSchema(faq)] });
}

function staticPage(c, pg) {
  const rel = `/${pg.slug}/`;
  const body = `<article class="wrap page"><!--CRUMBS--><h1>${esc(pg.title)}</h1><p class="muted">${esc(c.t('updated'))}: <time datetime="${pg.updated}">${c.fmtDate(pg.updated)}</time></p><div class="prose">${localize(c, pg.html)}</div></article>`;
  return layout(c, { title: pg.title, description: pg.description, rel, crumbs: [[pg.title, c.P + rel]], body, jsonLd: [{ '@type': pg.schemaType || 'WebPage', '@id': `${SITE_URL}${c.P}${rel}#page`, name: pg.title, url: SITE_URL + c.P + rel, inLanguage: c.L, isPartOf: { '@id': WEB_ID }, dateModified: pg.updated }] });
}

// ---------- register pages ----------
for (const c of CTX) {
  const newest = c.guides[0]?.updated || T0;
  add(c, '/', newest, () => home(c));
  for (const g of c.guides) add(c, `/${g.section}/${g.slug}/`, g.updated, () => guidePage(c, g));
  for (const [k, s] of Object.entries(c.sections)) {
    const list = c.guides.filter((g) => g.section === k);
    const hub = list.find((g) => g.hub);
    addList(c, { base: `/${k}/`, h1: s.title, lede: s.description, list, title: s.title, description: s.description, crumbName: s.name, kind: k, intro: hub ? `<p>${esc(c.t('startWith'))} <a href="${c.P}/${k}/${hub.slug}/">${esc(hub.title)}</a>.</p>` : '' });
  }
  addList(c, { base: '/guides/', h1: c.t('allH1'), lede: c.t('allLede'), list: c.guides, title: c.t('allTitle'), description: c.t('allDescription'), crumbName: c.t('allGuides') });
  for (const pg of c.pages) add(c, `/${pg.slug}/`, pg.updated, () => staticPage(c, pg));
}

// ---------- write ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'static'))) fs.cpSync(path.join(ROOT, 'static'), DIST, { recursive: true });

for (const r of REG) write(`${r.c.P}${r.rel}index.html`.slice(1), r.render());
const EN = CTX[0];
write('404.html', layout(EN, { title: 'Page not found', description: 'This page does not exist.', rel: '/404.html', noindex: true, body: `<section class="wrap hero hero--small"><h1>Wasted. Page not found.</h1><p class="lede">The link may be old or mistyped.</p><p><a class="btn" href="/">Back to the guide</a></p></section>` }));

for (const c of CTX) {
  write(`${c.P}/search-index.json`.slice(1), JSON.stringify(c.guides.map((g) => ({ t: g.title, d: g.description, u: `${c.P}/${g.section}/${g.slug}/`, s: c.secName(g.section) }))));
  write(`${c.P}/rss.xml`.slice(1), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(site.name)}</title><link>${SITE_URL}${c.P}/</link><description>${esc(c.t('siteDescription'))}</description><language>${c.L}</language>\n${c.guides.slice(0, 40).map((g) => `<item><title>${esc(g.title)}</title><link>${SITE_URL}${c.P}/${g.section}/${g.slug}/</link><guid>${SITE_URL}${c.P}/${g.section}/${g.slug}/</guid><pubDate>${new Date(g.updated + 'T06:00:00Z').toUTCString()}</pubDate><description>${esc(g.description)}</description></item>`).join('\n')}\n</channel></rss>`);
}

// Sitemap: rebuilt on every build, one entry per page in every language, with hreflang alternates.
const smEntry = (r) => {
  const alts = alternates(r.rel);
  const links = alts.length > 1 ? alts.map((x) => `<xhtml:link rel="alternate" hreflang="${x.L}" href="${SITE_URL}${x.P}${r.rel}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${r.rel}"/>` : '';
  return `<url><loc>${SITE_URL}${r.c.P}${r.rel}</loc><lastmod>${r.lastmod}</lastmod>${links}</url>`;
};
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${REG.filter((r) => !r.rel.includes('/page/')).map(smEntry).join('\n')}\n</urlset>`);

const BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'meta-externalagent', 'Amazonbot', 'DuckAssistBot', 'MistralAI-User', 'CCBot'];
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /404.html\n\n${BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const llmsHead = `# ${site.name}\n\n> ${site.description}\n\n${site.name} is an independent, unofficial fan guide to Grand Theft Auto VI (GTA 6). Each page states whether its information is confirmed by Rockstar Games, lists its sources and shows the date it was last updated. Content may be quoted with a link to the page.\n\nLanguages: ${CTX.map((c) => `[${c.lang.name}](${SITE_URL}${c.P}/)`).join(', ')}.\n`;
write('llms.txt', `${llmsHead}\n${Object.entries(EN.sections).map(([k, s]) => `## ${s.title}\n${EN.guides.filter((g) => g.section === k).map((g) => `- [${g.title}](${SITE_URL}/${g.section}/${g.slug}/): ${g.description}`).join('\n')}`).join('\n\n')}\n\n## Full text\n- [All guides in one file](${SITE_URL}/llms-full.txt)\n`);
write('llms-full.txt', `${llmsHead}\n${EN.guides.map((g) => `---\n\n# ${g.title}\n\nURL: ${SITE_URL}/${g.section}/${g.slug}/\nUpdated: ${g.updated}\nStatus: ${g.status || 'n/a'}\n\n${g.summary.map((s) => `- ${s}`).join('\n')}\n\n${g.html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim()}\n\n${g.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}\n`).join('\n')}`);
console.log(`Built ${REG.length} pages: ${CTX.map((c) => `${c.L} ${c.guides.length}`).join(', ')} → dist/`);
