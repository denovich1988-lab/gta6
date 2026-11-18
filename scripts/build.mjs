// Static site builder for the GTA 6 guide: content/guides/*.md + content/pages/*.md → dist/
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const SITE_URL = (process.env.SITE_URL || site.url).replace(/\/$/, '');
const BUILD_ID = Date.now().toString(36);
const PER_PAGE = 40;

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); // Asia/Tashkent
const write = (rel, html) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const fill = (t) => String(t).replaceAll('{{SITE}}', site.name).replaceAll('{{URL}}', SITE_URL).replaceAll('{{EMAIL}}', site.email);
const marked = new Marked();
const secName = (k) => site.sections[k]?.name || k;

const ORG_ID = `${SITE_URL}/#organization`;
const WEB_ID = `${SITE_URL}/#website`;
const OG = `${SITE_URL}/assets/og.png`;
const LEGAL = [['/about/', 'About'], ['/contact/', 'Contact'], ['/privacy/', 'Privacy policy'], ['/terms/', 'Terms of use'], ['/disclaimer/', 'Disclaimer']];

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
      date: data.date ? iso(data.date) : '', updated: iso(data.updated || data.date),
      summary: data.summary || [], faq: (data.faq || []).map((f) => ({ q: fill(f.q), a: fill(f.a) })), sources: data.sources || [],
      words, minutes: Math.max(1, Math.round(words / 220)), html: marked.parse(body),
    };
  });
}

const titleTag = (t) => { if (!t) return `GTA 6 Guide: Missions, Map and Walkthroughs | ${site.name}`; const full = `${t} | ${site.name}`; return full.length <= 62 ? full : t; };
const crumbsNav = (c) => c.length ? `<nav class="crumbs" aria-label="Breadcrumb"><ol>${[['Home', '/'], ...c].map(([n, u], i, a) => i === a.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>` : '';
const faqHtml = (faq) => faq.length ? `<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : '';
const faqSchema = (faq) => faq.length ? { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;
const GAME = { '@type': 'VideoGame', name: 'Grand Theft Auto VI', alternateName: 'GTA 6', gamePlatform: ['PlayStation 5', 'Xbox Series X|S'], publisher: { '@type': 'Organization', name: 'Rockstar Games' } };

function layout({ title, description, pathname, body, crumbs = [], jsonLd = [], ogType = 'website', published = '', modified = '', noindex = false }) {
  const full = titleTag(title);
  const desc = description || site.description;
  const canonical = SITE_URL + pathname;
  const nav = Object.entries(site.sections).map(([k, s]) => `<a href="/${k}/"${pathname.startsWith(`/${k}/`) ? ' aria-current="page"' : ''}>${esc(s.name)}</a>`).join('');
  const graph = [
    { '@type': 'Organization', '@id': ORG_ID, name: site.name, url: SITE_URL + '/', logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/icon-512.png`, width: 512, height: 512 }, email: site.email },
    { '@type': 'WebSite', '@id': WEB_ID, name: site.name, url: SITE_URL + '/', description: site.description, inLanguage: 'en', publisher: { '@id': ORG_ID }, about: GAME },
  ];
  if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], ...crumbs].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE_URL + u })) });
  for (const j of jsonLd) if (j) graph.push(j);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.name)}">
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
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/rss.xml">
<link rel="stylesheet" href="/assets/style.css?v=${BUILD_ID}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap top__row">
    <a class="logo" href="/" aria-label="${esc(site.name)} home"><span class="logo__sun" aria-hidden="true"></span>${esc(site.name)}</a>
    <nav class="top__nav" aria-label="Sections">${nav}</nav>
    <button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-controls="drawer"><span class="menu-btn__icon" aria-hidden="true"></span><span class="vh">Menu</span></button>
  </div>
  <div class="drawer" id="drawer" data-drawer hidden><div class="wrap drawer__inner">
    <label class="vh" for="dq">Search guides</label><input id="dq" type="search" placeholder="Search guides" data-search-input autocomplete="off">
    <ul class="results" data-results hidden></ul>
    <div class="drawer__grid">${Object.entries(site.sections).map(([k, s]) => `<a href="/${k}/">${esc(s.name)}</a>`).join('')}<a href="/guides/">All guides</a></div>
  </div></div>
</header>
<main id="main">
${body.replace('<!--CRUMBS-->', crumbsNav(crumbs))}
</main>
<footer class="foot">
  <div class="wrap foot__grid">
    <div><p class="logo logo--small"><span class="logo__sun" aria-hidden="true"></span>${esc(site.name)}</p><p class="foot__about">${esc(site.tagline)} Independent and fan-made.</p></div>
    <nav aria-label="Guides"><p class="foot__h">Guides</p>${Object.entries(site.sections).map(([k, s]) => `<a href="/${k}/">${esc(s.title.replace(/:.*/, ''))}</a>`).join('')}</nav>
    <nav aria-label="Site"><p class="foot__h">Site</p><a href="/guides/">All guides</a>${LEGAL.map(([u, n]) => `<a href="${u}">${n}</a>`).join('')}<a href="/rss.xml">RSS feed</a></nav>
  </div>
  <div class="wrap"><p class="foot__copy">© ${new Date().getFullYear()} ${esc(site.name)}. An unofficial fan site, not affiliated with or endorsed by Rockstar Games or Take-Two Interactive. Grand Theft Auto and GTA are trademarks of their owners.</p></div>
</footer>
<script src="/assets/app.js?v=${BUILD_ID}" defer></script>
</body>
</html>`;
}

const STATUS = { confirmed: 'Confirmed', partly: 'Partly confirmed', unconfirmed: 'Not confirmed yet', live: 'Updated from launch' };
const card = (g) => `<li class="card"><a href="/${g.section}/${g.slug}/"><span class="card__sec">${esc(secName(g.section))}</span><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><span class="card__meta">Updated ${fmtDate(g.updated)}</span></a></li>`;
const itemList = (name, items) => ({ '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.slice(0, 100).map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/${g.section}/${g.slug}/`, name: g.title })) });

function guidePage(g, guides) {
  const url = `${SITE_URL}/${g.section}/${g.slug}/`;
  const related = guides.filter((x) => x.slug !== g.slug && (x.section === g.section || (g.related || []).includes(x.slug))).slice(0, 4);
  const body = `
<article class="guide">
  <header class="wrap guide__head">
    <!--CRUMBS-->
    <h1>${esc(g.title)}</h1>
    <p class="lede">${esc(g.description)}</p>
    <dl class="facts">
      ${g.status ? `<div><dt>Status</dt><dd class="status status--${g.status}">${STATUS[g.status] || g.status}</dd></div>` : ''}
      <div><dt>Updated</dt><dd><time datetime="${g.updated}">${fmtDate(g.updated)}</time></dd></div>
      <div><dt>Read</dt><dd>${g.minutes} min</dd></div>
      <div><dt>By</dt><dd><a href="/about/">${esc(site.name)} team</a></dd></div>
    </dl>
  </header>
  <div class="wrap guide__body">
    ${g.summary.length ? `<aside class="summary" aria-labelledby="sum-h"><h2 id="sum-h">Quick answer</h2><ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></aside>` : ''}
    <div class="prose">${g.html}</div>
    ${faqHtml(g.faq)}
    ${g.sources.length ? `<section class="sources"><h2>Sources</h2><ul>${g.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul></section>` : ''}
  </div>
</article>
${related.length ? `<section class="wrap more"><h2>Related guides</h2><ul class="cards">${related.map(card).join('')}</ul></section>` : ''}`;
  return layout({
    title: g.seoTitle || g.title, description: g.description, pathname: `/${g.section}/${g.slug}/`, ogType: 'article', published: g.date, modified: g.updated,
    crumbs: [[secName(g.section), `/${g.section}/`], [g.title, `/${g.section}/${g.slug}/`]], body,
    jsonLd: [{ '@type': 'Article', '@id': `${url}#article`, headline: g.title, description: g.description, abstract: g.summary.join(' '), datePublished: g.date, dateModified: g.updated, url, mainEntityOfPage: url, image: OG, author: { '@type': 'Organization', '@id': ORG_ID, name: `${site.name} team`, url: `${SITE_URL}/about/` }, publisher: { '@id': ORG_ID }, about: GAME, articleSection: secName(g.section), wordCount: g.words, inLanguage: 'en', isAccessibleForFree: true }, faqSchema(g.faq)],
  });
}

function pager(base, page, total) {
  if (total <= 1) return '';
  const href = (n) => (n === 1 ? base : `${base}page/${n}/`);
  return `<nav class="paging" aria-label="Pages">${page > 1 ? `<a href="${href(page - 1)}" rel="prev">Newer</a>` : ''}<span>Page ${page} of ${total}</span>${page < total ? `<a href="${href(page + 1)}" rel="next">Older</a>` : ''}</nav>`;
}

function listPages({ base, h1, lede, list, title, description, crumbs, intro = '' }) {
  const total = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const out = [];
  for (let p = 1; p <= total; p++) {
    const slice = list.slice((p - 1) * PER_PAGE, p * PER_PAGE);
    const pathname = p === 1 ? base : `${base}page/${p}/`;
    const body = `
<section class="wrap hero hero--small">
  <!--CRUMBS-->
  <h1>${esc(h1)}${p > 1 ? ` <span class="pg">page ${p}</span>` : ''}</h1>
  ${p === 1 ? `<p class="lede">${esc(lede)}</p>` : ''}
</section>
<section class="wrap list" aria-labelledby="list-h">
  ${p === 1 && intro ? `<div class="prose intro">${intro}</div>` : ''}
  <h2 id="list-h" class="list__h">${list.length} guide${list.length === 1 ? '' : 's'}</h2>
  ${slice.length ? `<ul class="cards">${slice.map(card).join('')}</ul>` : '<p class="empty">The first guides for this section are being written. Check back soon.</p>'}
  ${pager(base, p, total)}
</section>`;
    out.push([pathname.slice(1) + 'index.html', layout({ title: p === 1 ? title : `${title.replace(/:.*/, '')} (page ${p})`, description: p === 1 ? description : `${description} Page ${p}.`, pathname, crumbs: p === 1 ? crumbs : [...crumbs, [`Page ${p}`, pathname]], body, jsonLd: [{ '@type': 'CollectionPage', '@id': `${SITE_URL}${pathname}#page`, name: h1, description, url: SITE_URL + pathname, isPartOf: { '@id': WEB_ID }, about: GAME, mainEntity: itemList(h1, slice) }] })]);
  }
  return out;
}

function home(guides) {
  const pick = (slug) => guides.find((g) => g.slug === slug);
  const featured = (site.featured || []).map(pick).filter(Boolean);
  const faq = [
    { q: 'What is GTA 6 and when does it come out?', a: 'Grand Theft Auto VI is Rockstar Games\u2019 open-world crime game set in the state of Leonida. Its release date is November 19, 2026, on PlayStation 5 and Xbox Series X|S.' },
    { q: 'Who are the main characters in GTA 6?', a: 'You play as two protagonists, Jason Duval and Lucia Caminos, a couple pulled into a criminal conspiracy across Leonida.' },
    { q: 'Is GTA 6 on PC?', a: 'Not at launch. Rockstar has not announced a PC version or a PC release date.' },
    { q: `Is ${site.name} an official Rockstar site?`, a: `No. ${site.name} is an independent fan site. We are not affiliated with Rockstar Games or Take-Two Interactive.` },
  ];
  const body = `
<section class="hero">
  <div class="wrap">
    <p class="hero__kicker">Unofficial GTA 6 guide</p>
    <h1>GTA 6 missions, map and walkthroughs</h1>
    <p class="lede">${esc(site.description)}</p>
    <div class="hero__cta"><a class="btn" href="/missions/">Mission walkthroughs</a><a class="btn btn--ghost" href="/map/">Explore the map</a></div>
  </div>
  <div class="horizon" aria-hidden="true"></div>
</section>
<section class="wrap sections" aria-labelledby="sec-h">
  <h2 id="sec-h">Browse the guide</h2>
  <ul class="tiles">${Object.entries(site.sections).map(([k, s]) => `<li><a class="tile" href="/${k}/"><span class="tile__name">${esc(s.name)}</span><span class="tile__count">${((n) => `${n} guide${n === 1 ? '' : 's'}`)(guides.filter((g) => g.section === k).length)}</span><span class="tile__desc">${esc(s.description)}</span></a></li>`).join('')}</ul>
</section>
${featured.length ? `<section class="wrap more" aria-labelledby="feat-h"><h2 id="feat-h">Start here</h2><ul class="cards">${featured.map(card).join('')}</ul></section>` : ''}
<section class="wrap more" aria-labelledby="new-h"><h2 id="new-h">Latest guides</h2><ul class="cards">${guides.slice(0, 12).map(card).join('')}</ul><p class="all"><a class="btn btn--ghost" href="/guides/">All ${guides.length} guides</a></p></section>
<div class="wrap">${faqHtml(faq)}</div>`;
  return layout({ title: '', description: site.description, pathname: '/', body, jsonLd: [itemList('Latest GTA 6 guides', guides.slice(0, 20)), faqSchema(faq)] });
}

function staticPage(pg) {
  const body = `<article class="wrap page"><!--CRUMBS--><h1>${esc(pg.title)}</h1><p class="muted">Last updated: <time datetime="${pg.updated}">${fmtDate(pg.updated)}</time></p><div class="prose">${pg.html}</div></article>`;
  return layout({ title: pg.title, description: pg.description, pathname: `/${pg.slug}/`, crumbs: [[pg.title, `/${pg.slug}/`]], body, jsonLd: [{ '@type': pg.schemaType || 'WebPage', '@id': `${SITE_URL}/${pg.slug}/#page`, name: pg.title, url: `${SITE_URL}/${pg.slug}/`, isPartOf: { '@id': WEB_ID }, dateModified: pg.updated }] });
}

// ---------- build ----------
const t = today();
const guides = load('guides', ['title', 'description', 'section', 'date']).filter((g) => !g.draft && g.date <= t).sort((a, b) => b.updated.localeCompare(a.updated) || a.slug.localeCompare(b.slug));
const pages = load('pages', ['title', 'description', 'updated']);
const seen = new Set();
for (const g of guides) {
  if (!site.sections[g.section]) throw new Error(`${g.slug}: unknown section "${g.section}"`);
  if (seen.has(g.slug)) throw new Error(`duplicate slug ${g.slug}`);
  seen.add(g.slug);
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'static'))) fs.cpSync(path.join(ROOT, 'static'), DIST, { recursive: true });

write('index.html', home(guides));
for (const g of guides) write(`${g.section}/${g.slug}/index.html`, guidePage(g, guides));
for (const [k, s] of Object.entries(site.sections)) {
  const hub = guides.find((g) => g.section === k && g.hub);
  for (const [f, h] of listPages({ base: `/${k}/`, h1: s.title, lede: s.description, list: guides.filter((g) => g.section === k), title: s.title, description: s.description, crumbs: [[s.name, `/${k}/`]], intro: hub ? `<p>New here? Start with <a href="/${k}/${hub.slug}/">${esc(hub.title)}</a>.</p>` : '' })) write(f, h);
}
for (const [f, h] of listPages({ base: '/guides/', h1: 'All GTA 6 guides', lede: 'Every guide on the site, most recently updated first.', list: guides, title: 'All GTA 6 Guides and Walkthroughs', description: 'Browse every GTA 6 guide: missions, map, characters, cars, weapons, cheats, editions, PC and online.', crumbs: [['All guides', '/guides/']] })) write(f, h);
for (const pg of pages) write(`${pg.slug}/index.html`, staticPage(pg));
write('404.html', layout({ title: 'Page not found', description: 'This page does not exist.', pathname: '/404.html', noindex: true, body: `<section class="wrap hero hero--small"><h1>Wasted. Page not found.</h1><p class="lede">The link may be old or mistyped.</p><p><a class="btn" href="/">Back to the guide</a></p></section>` }));
write('search-index.json', JSON.stringify(guides.map((g) => ({ t: g.title, d: g.description, u: `/${g.section}/${g.slug}/`, s: secName(g.section) }))));

const newest = guides[0]?.updated || t;
const urls = [['/', newest], ['/guides/', newest], ...Object.keys(site.sections).map((k) => [`/${k}/`, guides.find((g) => g.section === k)?.updated || newest]), ...guides.map((g) => [`/${g.section}/${g.slug}/`, g.updated]), ...pages.map((p) => [`/${p.slug}/`, p.updated])];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `<url><loc>${SITE_URL}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>`);
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(site.name)}</title><link>${SITE_URL}/</link><description>${esc(site.description)}</description><language>en</language>\n${guides.slice(0, 40).map((g) => `<item><title>${esc(g.title)}</title><link>${SITE_URL}/${g.section}/${g.slug}/</link><guid>${SITE_URL}/${g.section}/${g.slug}/</guid><pubDate>${new Date(g.updated + 'T06:00:00Z').toUTCString()}</pubDate><description>${esc(g.description)}</description></item>`).join('\n')}\n</channel></rss>`);
const BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot'];
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /404.html\n\n${BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write('llms.txt', `# ${site.name}\n\n> ${site.description}\n\n${site.name} is an independent, unofficial fan guide to Grand Theft Auto VI. Each page states whether its information is confirmed by Rockstar Games.\n\n${Object.entries(site.sections).map(([k, s]) => `## ${s.title}\n${guides.filter((g) => g.section === k).map((g) => `- [${g.title}](${SITE_URL}/${g.section}/${g.slug}/): ${g.description}`).join('\n') || `- [${s.title}](${SITE_URL}/${k}/)`}`).join('\n\n')}\n`);
console.log(`Built ${guides.length} guides and ${pages.length} pages → dist/`);
