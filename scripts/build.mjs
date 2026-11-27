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
<script>
  // Standard GTM start event: the container's Page View / All Pages
  // triggers fire on 'gtm.js', which only this push provides.
  window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
</script>
<script async src="https://www.googletagmanager.com/gtm.js?id=${site.gtmId}"></script>` : '');

const adsenseTag = () => (site.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}" crossorigin="anonymous"></script>` : '');

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
${adsenseTag()}
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
<meta name="theme-color" content="#0b0a0f">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/display.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/body-400.woff2" as="font" type="font/woff2" crossorigin>
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
    <div class="drawer__grid">${secs.map(([k, s]) => `<a href="${c.P}/${k}/">${esc(s.name)}</a>`).join('')}<a href="${c.P}/wiki/">${esc(c.t('wikiNav'))}</a><a href="${c.P}/guides/">${esc(c.t('allGuides'))}</a></div>
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
    <nav aria-label="${esc(c.t('footSite'))}"><p class="foot__h">${esc(c.t('footSite'))}</p><a href="${c.P}/guides/">${esc(c.t('allGuides'))}</a><a href="${c.P}/wiki/">${esc(c.t('wikiNav'))}</a>${LEGAL.map((s) => `<a href="${pageUrl(c, s)}">${esc(c.t(`legal_${s}`))}</a>`).join('')}<a href="${c.P}/rss.xml">RSS</a></nav>
  </div>
  <div class="wrap"><p class="foot__copy">© ${new Date().getFullYear()} ${esc(site.name)}. ${esc(c.t('copyright'))}</p></div>
</footer>
${site.gtmId ? `<div class="consent" data-consent hidden role="region" aria-label="Cookies"><p>${esc(c.t('consentText'))} <a href="${pageUrl(c, 'privacy')}">${esc(c.t('legal_privacy'))}</a></p><div class="consent__actions"><button class="btn btn--ghost" type="button" data-consent-no>${esc(c.t('decline'))}</button><button class="btn" type="button" data-consent-yes>${esc(c.t('accept'))}</button></div></div>` : ''}
<a class="to-top" href="#main" data-to-top hidden aria-label="${esc(c.t('top'))}"><span aria-hidden="true"></span></a>
<script src="/assets/app.js?v=${BUILD_ID}" defer></script>
</body>
</html>`;
}

const ph = (c, g) => `<span class="card__img card__ph card__ph--${g.section}" aria-hidden="true"><span>${esc(c.secName(g.section))}</span></span>`;
const card = (c, g) => `<li class="card"><a href="${c.P}/${g.section}/${g.slug}/">${hasImg(g.image) ? img(g.image, 'card__img') : ph(c, g)}<span class="card__body"><span class="card__sec">${esc(c.secName(g.section))}</span><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><span class="card__meta">${esc(c.t('updated'))} ${c.fmtDate(g.updated)}</span></span></a></li>`;
const itemList = (c, name, items) => ({ '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.slice(0, 100).map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${c.P}/${g.section}/${g.slug}/`, name: g.title })) });
// Links written as /section/slug/ in a translated text point to the translated page when it exists.
const localize = (c, html) => (c.en ? html : html.replace(/href="(\/[^"#?]*)(#[^"]*)?"/g, (m, p, h = '') => (HAS[c.L].has(p) ? `href="${c.P}${p}${h}"` : m)));

// Give every H2 in a text an id and build an "On this page" list from them (shown when there are 3+ sections).
function withToc(html) {
  const used = new Set(); const items = [];
  const out = html.replace(/<h2>(.*?)<\/h2>/g, (m, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    let id = text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `s${items.length + 1}`;
    while (used.has(id)) id += '-2';
    used.add(id); items.push([id, text]);
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, items };
}
// One YouTube video per page, only for blog posts and news guides. Front matter:
// video: { id: "<11-char id>", title: "...", channel: "...", date: YYYY-MM-DD, description: "..." }
// Put <!--VIDEO--> in the body where it should go; otherwise it goes before the second H2.
// The page loads only a thumbnail; the youtube-nocookie player loads when the reader presses play.
function checkVideo(g) {
  if (!g.video) return;
  if (!(g.isBlog || g.section === 'news')) throw new Error(`${g.slug}: video is allowed only in blog posts and news`);
  const v = g.video;
  if (!/^[A-Za-z0-9_-]{11}$/.test(v.id || '')) throw new Error(`${g.slug}: video.id must be an 11-character YouTube id`);
  for (const k of ['title', 'channel', 'date']) if (!v[k]) throw new Error(`${g.slug}: video.${k} is required`);
}
const videoDate = (v) => (v.date instanceof Date ? v.date.toISOString().slice(0, 10) : String(v.date));
const videoHtml = (c, v) => `<figure class="yt"><a class="yt__play" href="https://www.youtube.com/watch?v=${v.id}" data-yt="${v.id}" target="_blank" rel="nofollow noopener" aria-label="${esc(c.t('playVideo'))}: ${esc(v.title)}"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" width="480" height="360" loading="lazy" decoding="async" alt="${esc(v.title)}"><span class="yt__btn" aria-hidden="true"></span></a><figcaption>${esc(v.title)} <span class="muted">· ${esc(v.channel)} · YouTube</span></figcaption></figure>`;
function withVideo(c, g, html) {
  if (!g.video) return html;
  const block = videoHtml(c, g.video);
  if (html.includes('<!--VIDEO-->')) return html.replace(/(<p>)?<!--VIDEO-->(<\/p>)?/, block);
  let n = 0;
  const out = html.replace(/<h2[ >]/g, (m) => (++n === 2 ? block + m : m));
  return n >= 2 ? out : html + block;
}
const videoSchema = (g, url) => g.video ? { '@type': 'VideoObject', name: g.video.title, description: g.video.description || g.video.title, thumbnailUrl: `https://i.ytimg.com/vi/${g.video.id}/hqdefault.jpg`, uploadDate: videoDate(g.video), embedUrl: `https://www.youtube-nocookie.com/embed/${g.video.id}`, contentUrl: `https://www.youtube.com/watch?v=${g.video.id}`, publisher: { '@type': 'Organization', name: g.video.channel }, isPartOf: { '@id': `${url}#article` } } : null;
const tocHtml = (c, items) => items.length >= 3 ? `<details class="toc"><summary>${esc(c.t('toc'))} <span class="toc__n">${items.length}</span></summary><ol>${items.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></details>` : '';

// Walkthrough pages end with a "mark as done" switch and the next mission in story order.
function nextMission(c, g) {
  if (!/-walkthrough$/.test(g.slug)) return '';
  const order = CHAPTERS.flatMap((ch) => ch.slugs).filter((s) => c.guides.some((x) => x.slug === s));
  const i = order.indexOf(g.slug);
  const nx = i >= 0 ? c.guides.find((x) => x.slug === order[i + 1]) : null;
  return `<div class="nextm"><label class="donebox"><input type="checkbox" data-done="${g.slug}"><span>I finished this mission</span></label>${nx ? `<a class="nextm__card" href="/missions/${nx.slug}/"${hasImg(nx.image) ? ` style="background-image:url(/assets/img/${nx.image}-800.webp)"` : ''}><small>Next mission</small><b>${esc(nx.title.replace(/^GTA 6\s+/i, '').replace(/\s+Walkthrough.*$/i, '').replace(/:.*$/, ''))}</b></a>` : ''}</div>`;
}

function guidePage(c, g) {
  const rel = `/${g.section}/${g.slug}/`;
  const url = SITE_URL + c.P + rel;
  checkVideo(g);
  const T = withToc(withVideo(c, g, g.html));
  const related = c.guides.filter((x) => x.slug !== g.slug && (x.section === g.section || (g.related || []).includes(x.slug))).slice(0, 4);
  const body = `
<article class="guide" data-section="${g.section}">
  <header class="ghero"${hasImg(g.image) ? ` style="background-image:url(/assets/img/${g.image}.webp)"` : ''}>
    <div class="wrap">
      <!--CRUMBS-->
      <h1>${esc(g.title)}</h1>
      <p class="chips">${g.status ? `<span class="status--${g.status}">${esc(c.t(`status_${g.status}`))}</span>` : ''}<span>${esc(c.t('updated'))} <time datetime="${g.updated}">${c.fmtDate(g.updated)}</time></span><span>${g.minutes} ${esc(c.t('min'))} ${esc(c.t('read')).toLowerCase()}</span><span>${g.sources.length ? `Checked against ${g.sources.length} source${g.sources.length === 1 ? '' : 's'}` : `<a href="/about/">${esc(c.t('team'))}</a>`}</span></p>
    </div>
  </header>
  <div class="wrap guide__body">
    <p class="answer"><b>Short answer:</b> ${esc(g.description)}</p>
    ${g.summary.length ? `<aside class="summary" aria-labelledby="sum-h"><h2 id="sum-h">${esc(c.t('quick'))}</h2><ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></aside>` : ''}
    ${tocHtml(c, T.items)}
    <div class="prose">${localize(c, T.html)}</div>
    ${nextMission(c, g)}
    ${faqHtml(c, g.faq)}
  </div>
</article>
${related.length ? `<section class="wrap more"><h2>${esc(c.t(g.isBlog ? 'readNext' : 'related'))}</h2><ul class="cards">${related.map((x) => card(c, x)).join('')}</ul></section>` : ''}`;
  return layout(c, {
    title: g.seoTitle || g.title, description: g.description, rel, ogType: 'article', published: g.date, modified: g.updated,
    crumbs: [[c.secName(g.section), `${c.P}/${g.section}/`], [g.title, c.P + rel]], body,
    jsonLd: [{ '@type': g.isBlog ? 'BlogPosting' : 'Article', '@id': `${url}#article`, headline: g.title, description: g.description, abstract: g.summary.join(' '), datePublished: g.date, dateModified: g.updated, url, mainEntityOfPage: url, image: hasImg(g.image) ? `${SITE_URL}/assets/img/${g.image}.webp` : OG, author: { '@type': 'Organization', '@id': ORG_ID, name: site.name, url: `${SITE_URL}/about/` }, publisher: { '@id': ORG_ID }, about: GAME, articleSection: c.secName(g.section), wordCount: g.words, inLanguage: c.L, isAccessibleForFree: true, citation: g.sources.map((s) => s.url) }, faqSchema(g.faq), videoSchema(g, url)].filter(Boolean),
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

const leads = (c) => {
  const pick = ['gta-6-jason-duval', 'gta-6-lucia-caminos'].map((x) => c.guides.find((g) => g.slug === x)).filter(Boolean);
  if (pick.length < 2) return '';
  const who = c.ui.leads || UI.en.leads;
  return `<section class="wrap leads" aria-labelledby="leads-h"><h2 id="leads-h">${esc(c.t('leadsH'))}</h2><div class="leads__grid">${pick.map((g, i) => `<a class="lead lead--${i ? 'b' : 'a'}" href="${c.P}/${g.section}/${g.slug}/">${hasImg(g.image) ? img(g.image, 'lead__img') : ''}<span class="lead__body"><span class="lead__name">${esc(who[i].name)}</span><span class="lead__line">${esc(who[i].line)}</span><span class="lead__more">${esc(c.t('leadsMore'))}</span></span></a>`).join('')}</div></section>`;
};

// Story chapters for the home page, read from the English mission list (### Prologue / ### Chapter N headings).
const CHAPTERS = (() => {
  const f = fs.readdirSync(path.join(ROOT, 'content', 'guides')).find((x) => x.endsWith('gta-6-mission-list.md'));
  if (!f) return [];
  const out = [];
  for (const line of matter(fs.readFileSync(path.join(ROOT, 'content', 'guides', f), 'utf8')).content.split('\n')) {
    const h = line.match(/^###\s+(Prologue|Chapter\s+(\d+))/i);
    if (h) { out.push({ n: h[2] ? +h[2] : 0, slugs: [] }); continue; }
    if (/^##\s/.test(line) && !/^###/.test(line)) { if (out.length) out.push(null); continue; }
    const cur = out[out.length - 1];
    if (!cur) continue;
    for (const m of line.matchAll(/\/missions\/([a-z0-9-]+)\//g)) if (!cur.slugs.includes(m[1])) cur.slugs.push(m[1]);
  }
  return out.filter((x) => x && x.slugs.length);
})();

function home(c) {
  const faq = (Array.isArray(c.ui.homeFaq) ? c.ui.homeFaq : UI.en.homeFaq).map((f) => ({ q: fill(f.q), a: fill(f.a) }));
  const bySlug = new Map(c.guides.map((g) => [g.slug, g]));
  const enTitle = new Map(enGuides.map((g) => [g.slug, g.title]));
  const missionName = (slug) => (enTitle.get(slug) || slug).replace(/^GTA 6\s+/i, '').replace(/\s+Walkthrough.*$/i, '').replace(/:.*$/, '');
  const chapters = CHAPTERS.map((ch) => ({ ...ch, have: ch.slugs.filter((s) => bySlug.has(s)) })).filter((ch) => ch.have.length);
  const first = chapters.slice(0, 2).flatMap((ch) => ch.have).slice(0, 7);
  const list = bySlug.get('gta-6-mission-list');
  const mapGuide = bySlug.get('gta-6-map');
  const bg = (n) => hasImg(n) ? ` style="background-image:url(/assets/img/${n}-800.webp)"` : '';
  const cats = [['missions', 'Story order and walkthroughs'], ['map', 'Regions and locations'], ['vehicles', 'Vehicles and where to find them'], ['cheats', 'Cheats, secrets and money']].filter(([k]) => c.sections[k]);
  const catImg = (k) => ({ missions: 'g-mission-list', map: 'g-map', vehicles: 'cars', cheats: 'g-how-to-make-money' })[k] || secImg(k);
  const regions = [['gta-6-vice-city', 'vice-city'], ['port-gellhorn-gta-6', 'port']].map(([s, i]) => bySlug.get(s) && { g: bySlug.get(s), i }).filter(Boolean);
  const latest = c.guides.slice(0, 5);
  const body = `
<section class="xhero"${hasImg('hero') ? ` style="background-image:url(/assets/img/hero.webp)"` : ''}>
  <div class="wrap xhero__in">
    <div>
      <h1>Every mission.<br>Every secret.<br><em>All of Leonida.</em></h1>
      <p class="lede">${esc(c.t('siteDescription'))}</p>
      <p class="xhero__cta">${list ? `<a class="btn" href="/missions/${list.slug}/">Open the mission list</a>` : ''}${mapGuide ? `<a class="btn btn--ghost" href="/map/${mapGuide.slug}/#interactive-map">Open the map</a>` : ''}</p>
    </div>
    ${first.length ? `<div class="hud" data-tracker>
      <div class="hud__top"><h2>Your story progress</h2><span data-tracker-count></span></div>
      <div class="bar"><i data-tracker-bar></i></div>
      <ul class="hud__list">${first.map((s) => `<li><label><input type="checkbox" data-done="${s}"><span>${esc(missionName(s))}</span></label><a href="/missions/${s}/">Guide</a></li>`).join('')}</ul>
      <p class="hud__note">Ticks are saved in this browser only.</p>
    </div>` : ''}
  </div>
</section>
<section class="wrap block" aria-labelledby="cat-h">
  <div class="sec-head"><h2 id="cat-h">Pick your path</h2></div>
  <div class="cats">${cats.map(([k, t]) => `<a class="cat" href="/${k}/"${bg(catImg(k))}><span><b>${esc(c.secName(k))}</b><small>${esc(t)}</small></span></a>`).join('')}</div>
</section>
${chapters.length ? `<section class="wrap block" aria-labelledby="ch-h">
  <div class="sec-head"><h2 id="ch-h">${esc(c.t('chaptersH'))}</h2>${list ? `<a href="/missions/${list.slug}/">${esc(c.t('fullList'))}</a>` : ''}</div>
  <ol class="chap">${chapters.map((ch) => `<li><a href="/missions/${ch.have[0]}/"><span class="chap__no">${ch.n ? ch.n : 'P'}</span><span class="chap__name">${esc(ch.n ? c.t('chapter', { n: ch.n }) : c.t('prologue'))}</span><span class="chap__count">${esc(c.t('countWalk', { n: ch.have.length }))}</span></a></li>`).join('')}</ol>
</section>` : ''}
${regions.length ? `<section class="wrap block" aria-labelledby="reg-h"><div class="sec-head"><h2 id="reg-h">Explore Leonida</h2>${mapGuide ? `<a href="/map/${mapGuide.slug}/">Full map</a>` : ''}</div>
  <div class="regions">${regions.map(({ g, i }) => `<a class="reg" href="/${g.section}/${g.slug}/"><span class="reg__im"${bg(g.image || i)}></span><span class="reg__t"><b>${esc(topicName(g.title))}</b><small>${esc(g.description)}</small></span></a>`).join('')}</div></section>` : ''}
<section class="wrap block" aria-labelledby="new-h">
  <div class="sec-head"><h2 id="new-h">Latest guides</h2><a href="/guides/">${esc(c.t('allGuides'))}</a></div>
  <div class="latest">${latest.map((g, i) => `<a class="lt${i ? '' : ' lt--big'}" href="/${g.section}/${g.slug}/"><span class="lt__im"${bg(g.image || secImg(g.section))}></span><span class="lt__t"><span class="card__sec">${esc(c.secName(g.section))}</span><b>${esc(g.title)}</b>${i ? '' : `<small>${esc(g.description)}</small>`}</span></a>`).join('')}</div>
</section>
<section class="wrap block trust" aria-label="How we check facts">
  <div><b>Rockstar or two sources</b><span>A fact goes on the site only when Rockstar says it or two independent guides agree.</span></div>
  <div><b>Dated updates</b><span>Every page shows when it was last checked.</span></div>
  <div><b>No guesses</b><span>If something is not confirmed, the page says so.</span></div>
</section>
<div class="wrap">${faqHtml(c, faq)}</div>`;
  return layout(c, { title: '', description: c.t('siteDescription'), rel: '/', body, jsonLd: [itemList(c, c.t('latest'), c.guides.slice(0, 20)), faqSchema(faq)] });
}

// ---------- Wiki: an A–Z index of missions, characters, places, vehicles, weapons and game systems ----------
// Built only from pages that exist in the language, so every entry links to a verified guide.
const WIKI_TOPICS = {
  vehicles: ['gta-6-cars', 'gta-6-boats', 'gta-6-motorcycles', 'gta-6-planes-helicopters', 'gta-6-trucks', 'gta-6-train'],
  weapons: ['gta-6-weapons', 'gta-6-weapon-wheel'],
  gameplay: ['gta-6-wanted-level', 'gta-6-fast-travel', 'gta-6-how-to-save', 'gta-6-first-person-mode', 'gta-6-safehouses', 'gta-6-replay-missions', 'gta-6-change-clothes-and-hair', 'gta-6-jasons-house-projects', 'gta-6-controller', 'gta-6-difficulty-settings', 'how-to-switch-characters-in-gta-6', 'gta-6-radio-stations', 'gta-6-animals', 'how-to-make-money-in-gta-6', 'gta-6-heists', 'gta-6-romance', 'gta-6-strangers-and-freaks', 'gta-6-challenges'],
  secrets: ['gta-6-cheats', 'gta-6-safe-codes', 'gta-6-collectibles', 'gta-6-trophies', 'gta-6-100-completion', 'gta-6-easter-eggs', 'gta-6-bigfoot'],
};
// Short English names for guides whose titles are questions or how-tos; other languages use their own title.
const WIKI_EN_NAMES = { 'gta-6-replay-missions': 'Replaying missions', 'gta-6-difficulty-settings': 'Difficulty settings', 'gta-6-change-clothes-and-hair': 'Clothes and hair', 'how-to-make-money-in-gta-6': 'Making money', 'gta-6-how-to-save': 'Saving the game', 'how-to-switch-characters-in-gta-6': 'Switching characters', 'gta-6-wanted-level': 'Wanted level', 'gta-6-trophies': 'Trophies', 'gta-6-jasons-house-projects': "Jason's house projects", 'gta-6-weapons': 'Weapons', 'gta-6-100-completion': '100% completion' };
const WIKI_CATS = ['missions', 'characters', 'places', 'vehicles', 'weapons', 'gameplay', 'secrets'];
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
const topicName = (t) => t.replace(/\b(GTA ?(6|VI)|Grand Theft Auto VI)\b/gi, '').split(/[:：]/)[0].replace(/\s+/g, ' ').replace(/^[\s\-–—,]+|[\s\-–—,?]+$/g, '').replace(/^(in|в|en|na|di|de|im|w)\s+/i, '').replace(/\s+(in|в|у|en|em|no|na|di|dans|im|w|de)$/i, '').trim();
const tableRows = (html) => [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]));

// Guide descriptions often open with "GTA 6 <name> walkthrough:"; the wiki already shows the name, so drop that lead-in.
const wikiText = (t) => { const m = String(t).match(/^[^:：.!?。]{0,90}\b(GTA ?6|GTA VI)\b[^:：.!?。]{0,90}[:：]\s*(.+)$/); const x = m ? m[2] : t; return x.charAt(0).toUpperCase() + x.slice(1); };
function wikiEntries(c) {
  const by = new Map(c.guides.map((g) => [g.slug, g]));
  const url = (g) => `${c.P}/${g.section}/${g.slug}/`;
  const out = []; const seenName = new Set();
  const push = (e) => { e.text = wikiText(e.text); const k = e.cat + '|' + e.name.toLowerCase(); if (!e.name || seenName.has(k)) return; seenName.add(k); out.push(e); };
  // Missions: names from the mission list table (game names stay in English), text from each walkthrough.
  const list = enGuides.find((g) => g.slug === 'gta-6-mission-list'); // English list: newest and complete; mission names are game names
  for (const cells of tableRows(list?.html || '')) {
    const link = cells.map((x) => x.match(/href="(?:\/[a-z]{2})?\/missions\/([a-z0-9-]+)\/"/)).find(Boolean);
    if (!link || !by.has(link[1])) continue;
    const name = cells.map(strip).find((x) => x && !/^\d+$/.test(x) && !/walkthrough|прохожд|guía|soluce|lösung|poradnik|detonado|guida/i.test(x));
    const g = by.get(link[1]);
    push({ name: name || topicName(g.title), cat: 'missions', text: g.description, href: url(g) });
  }
  // Characters and places: the tables on the characters and map hubs, in this language.
  const fromTable = (slug, cat, own) => {
    const hub = by.get(slug); if (!hub) return;
    for (const cells of tableRows(hub.html)) {
      if (cells.length < 2 || !/<strong>/.test(cells[0])) continue;
      const name = strip(cells[0]); const linked = cells[0].match(/href="(?:\/[a-z]{2})?\/[a-z]+\/([a-z0-9-]+)\/"/);
      const target = (linked && by.get(linked[1])) || (own[name] && by.get(own[name])) || hub;
      push({ name, cat, text: strip(cells[1]), href: url(target) });
    }
  };
  fromTable('gta-6-characters', 'characters', { 'Boobie Ike': 'gta-6-boobie-ike' });
  fromTable('gta-6-map', 'places', { 'Vice City': 'gta-6-vice-city', 'Port Gellhorn': 'port-gellhorn' });
  for (const [cat, slugs] of Object.entries(WIKI_TOPICS)) for (const s of slugs) { const g = by.get(s); if (g) push({ name: (c.ui.wikiNames || {})[s] || (c.en && WIKI_EN_NAMES[s]) || topicName(g.title), cat, text: g.description, href: url(g) }); }
  return out.sort((a, b) => a.name.localeCompare(b.name, c.L, { sensitivity: 'base' }));
}

function wikiPage(c) {
  const items = wikiEntries(c);
  const letter = (n) => { const ch = n.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase(); return /[0-9]/.test(ch) ? '#' : ch; };
  const groups = [];
  for (const e of items) { const L = letter(e.name); const last = groups[groups.length - 1]; if (last && last.L === L) last.items.push(e); else groups.push({ L, items: [e] }); }
  const cats = WIKI_CATS.filter((k) => items.some((e) => e.cat === k));
  const body = `
<section class="wrap hero hero--small">
  <!--CRUMBS-->
  <h1>${esc(c.t('wikiH1'))}</h1>
  <p class="lede">${esc(c.t('wikiLede'))}</p>
</section>
<section class="wrap wiki" data-wiki>
  <div class="wiki__tools">
    <label class="vh" for="wq">${esc(c.t('wikiFilter'))}</label>
    <input id="wq" type="search" placeholder="${esc(c.t('wikiFilter'))}" data-wiki-q autocomplete="off">
    <div class="wiki__cats" role="group" aria-label="${esc(c.t('sectionsLabel'))}"><button type="button" class="chip" aria-pressed="true" data-wiki-cat="">${esc(c.t('wikiAll'))} <span>${items.length}</span></button>${cats.map((k) => `<button type="button" class="chip" aria-pressed="false" data-wiki-cat="${k}">${esc(c.t('wikiCat_' + k))} <span>${items.filter((e) => e.cat === k).length}</span></button>`).join('')}</div>
    <nav class="wiki__az" aria-label="A–Z">${groups.map((g) => `<a href="#w-${encodeURIComponent(g.L)}">${esc(g.L)}</a>`).join('')}</nav>
  </div>
  ${groups.map((g) => `<div class="wiki__group" data-wiki-group><h2 id="w-${encodeURIComponent(g.L)}" class="wiki__letter">${esc(g.L)}</h2><ul class="wiki__list">${g.items.map((e) => `<li data-cat="${e.cat}"><a href="${e.href}"><span class="wiki__name">${esc(e.name)}</span><span class="wiki__cat">${esc(c.t('wikiCat_' + e.cat))}</span><span class="wiki__text">${esc(e.text)}</span></a></li>`).join('')}</ul></div>`).join('')}
  <p class="wiki__none" data-wiki-none hidden>${esc(c.t('noMatches'))}</p>
</section>`;
  return layout(c, { title: c.t('wikiTitle'), description: c.t('wikiDesc'), rel: '/wiki/', crumbs: [[c.t('wikiNav'), `${c.P}/wiki/`]], body,
    jsonLd: [{ '@type': 'CollectionPage', '@id': `${SITE_URL}${c.P}/wiki/#page`, name: c.t('wikiH1'), description: c.t('wikiDesc'), url: `${SITE_URL}${c.P}/wiki/`, inLanguage: c.L, isPartOf: { '@id': WEB_ID }, about: GAME,
      mainEntity: { '@type': 'DefinedTermSet', name: c.t('wikiH1'), hasDefinedTerm: items.map((e) => ({ '@type': 'DefinedTerm', name: e.name, description: e.text, url: SITE_URL + e.href })) } }] });
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
  add(c, '/wiki/', newest, () => wikiPage(c));
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

// Pages still in the archive are not published yet: links to them become plain text until they go live.
const LIVE = new Set(REG.map((r) => r.c.P + r.rel));
const unlinkMissing = (html) => html.replace(/<a href="(\/[^"#?]*\/)(#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g, (m, p, h, rest, text) => (LIVE.has(p) || p.startsWith('/assets/') ? m : text));
for (const r of REG) write(`${r.c.P}${r.rel}index.html`.slice(1), unlinkMissing(r.render()));
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
if (site.adsenseClient) write('ads.txt', `google.com, ${site.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /404.html\n\n${BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const llmsHead = `# ${site.name}\n\n> ${site.description}\n\n${site.name} is an independent, unofficial fan guide to Grand Theft Auto VI (GTA 6). Each page states whether its information is confirmed by Rockstar Games, lists its sources and shows the date it was last updated. Content may be quoted with a link to the page.\n\nLanguages: ${CTX.map((c) => `[${c.lang.name}](${SITE_URL}${c.P}/)`).join(', ')}.\n`;
write('llms.txt', `${llmsHead}\n${Object.entries(EN.sections).map(([k, s]) => `## ${s.title}\n${EN.guides.filter((g) => g.section === k).map((g) => `- [${g.title}](${SITE_URL}/${g.section}/${g.slug}/): ${g.description}`).join('\n')}`).join('\n\n')}\n\n## Full text\n- [All guides in one file](${SITE_URL}/llms-full.txt)\n`);
write('llms-full.txt', `${llmsHead}\n${EN.guides.map((g) => `---\n\n# ${g.title}\n\nURL: ${SITE_URL}/${g.section}/${g.slug}/\nUpdated: ${g.updated}\nStatus: ${g.status || 'n/a'}\n\n${g.summary.map((s) => `- ${s}`).join('\n')}\n\n${g.html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim()}\n\n${g.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}\n`).join('\n')}`);
console.log(`Built ${REG.length} pages: ${CTX.map((c) => `${c.L} ${c.guides.length}`).join(', ')} → dist/`);
