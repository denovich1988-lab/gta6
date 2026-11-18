// Lists English files that have no translation yet: node scripts/i18n-missing.mjs [lang]
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const only = process.argv[2];
let total = 0;
for (const { code } of site.languages.filter((l) => l.code !== 'en' && (!only || l.code === only))) {
  for (const dir of ['guides', 'blog', 'pages']) {
    const src = path.join(ROOT, 'content', dir);
    if (!fs.existsSync(src)) continue;
    for (const f of fs.readdirSync(src).filter((x) => x.endsWith('.md')).sort()) {
      const dst = path.join(ROOT, 'content', 'i18n', code, dir, f);
      if (!fs.existsSync(dst)) { console.log(`${code}\tcontent/${dir}/${f}\t→ content/i18n/${code}/${dir}/${f}`); total++; }
    }
  }
}
console.log(`${total} translation(s) missing`);
