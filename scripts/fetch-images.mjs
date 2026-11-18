// Downloads illustrations listed in images.json that are missing from assets/img and saves WebP versions (1600px and 800px wide).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'images.json'), 'utf8'));
const dir = path.join(ROOT, 'assets', 'img');
fs.mkdirSync(dir, { recursive: true });
let added = 0;
for (const [name, im] of Object.entries(cfg.images)) {
  const big = path.join(dir, `${name}.webp`);
  if (fs.existsSync(big)) continue;
  try {
    const res = await fetch(`${cfg.base}${im.id}/output.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(big);
    await sharp(buf).resize({ width: 800 }).webp({ quality: 78 }).toFile(path.join(dir, `${name}-800.webp`));
    added++;
    console.log('saved', name);
  } catch (e) {
    console.log('skip', name, e.message);
  }
}
console.log(`${added} new image(s)`);
