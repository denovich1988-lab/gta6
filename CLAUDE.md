# GTA 6 guide site — content rules

Static site. `npm run build` builds `content/guides/*.md`, `content/blog/*.md` and `content/pages/*.md` into `dist/`; then run `python3 scripts/check-seo.py` (both must pass). Push to `main` deploys.

## Guides
- File: `content/guides/YYYY-MM-DD-slug.md`. Front matter: `title`, `seoTitle` (≤60 chars, contains the target keyword), `description` (70–160 chars, unique), `section` (missions | map | characters | vehicles | weapons | cheats | buying | pc | online | news), `date`, `updated` (when revised), `status` (confirmed | partly | unconfirmed | live), `summary` (3 short facts), `faq` (3–4 q/a), `sources` (name + url), optional `related` slugs.
- Mission walkthrough structure: Before you start → Objectives → Step-by-step → Where players fail → Optional goals and rewards. Add each new mission to the list in `gta-6-mission-list` (story order) and bump its `updated`.
- The daily task (about 09:30 Tashkent) adds 10 guides and 2 blog posts in English, never asking for confirmation. Fewer is fine when verified information runs out: never pad with invented or duplicate pages.
- One target keyword per page. Proven keywords (US volume/KD): gta 6 map 87k/34, gta 6 lucia 20k/2, gta vi radio stations 12k/4, gta 6 characters 7k/10, gta 6 online 5k/5, gta 6 jason 4.5k/21, gta 6 file size 3.7k/6, gta 6 crossplay 2.6k/0, gta 6 voice actors 2.4k/3, gta 6 system requirements 1.9k/0, gta 6 map size 1.7k/13, gta 6 cars 1.5k/2, will gta 6 have cheat codes 1.1k/0, gta 6 guns 1k/5, gta 6 animals 1k/0, gta 6 missions 600/0, port gellhorn gta 6 600/0. After launch: "gta 6 <mission name> walkthrough", "how to …", collectibles, money, trophies.

## Keyword plan
- `keywords.md` is the content plan (Ahrefs data from competitors). Keywords with KD up to 90 are allowed (owner, 2026-11-24; was 50); prefer the lowest KD. Every new guide or blog post targets one unchecked group from it, top to bottom; put the target keyword in `seoTitle`, the H1, the first paragraph and one FAQ question, and use the secondary keywords in headings and FAQ. After publishing, tick the row and add the slug.
- When the Ahrefs connector is available, check the competitors' new keywords about once a week (gtabase.com, tracker.gg/gta6, matching terms for "gta 6") and add rows, especially post-launch ones: mission names, collectibles, money, challenges, trophies.

## Blog — 2 posts every morning (same daily task)
- File: `content/blog/YYYY-MM-DD-slug.md`, URL `/blog/<slug>/`. Front matter: `title`, `seoTitle` (≤60 chars, with the keyword), `description` (70–160 chars), `date`, `status`, `summary` (3 facts), `faq` (3 q/a), `sources` (3+), `related` slugs. No `section` (the build sets it).
- Blog = answers to question keywords, comparisons and news explainers (launch, platforms, delays, budget, sales, patches, "GTA 6 vs …", "best …", "everything new in …"). Guides = lasting reference pages (missions, map, cheats, vehicles, weapons). Don't cover the same keyword in both.
- **Long-form (owner's rule): 1,500–2,500 words.** Competitor answer pages (Dexerto, Game Rant, GamesRadar) are 300–700 words with one table; we win by being the most complete, best-structured page for the query, never by padding. Every section must add a fact, a comparison or a practical tip. Reference post: `content/blog/2026-11-19-gta-6-new-features.md`.
- **Structure every post like this:**
  1. Bold first sentence that answers the query with the target keyword, then 2–3 sentences of context and what the reader will get.
  2. One line on how the facts were checked ("confirmed by Rockstar or two independent guides").
  3. An "at a glance" table (comparison, numbers, timeline or by platform).
  4. 6–14 H2 sections. Each: the fact, then **Why it matters** or **Tip** in bold, then an internal link to the deeper guide. Use numbered H2s only for real lists/rankings.
  5. A "What is not confirmed" or "What it does not have (yet)" section, when relevant.
  6. A practical section: numbered steps, a checklist or "what to do first".
  7. A short verdict or "what this means for you".
  8. "What we will add to this page" (future updates) as the last section.
  The FAQ (3 questions from real search queries) and the summary box are rendered automatically from front matter — don't repeat them in the body.
- **YouTube video (owner's rule):** a blog post or a `news` guide may embed at most one YouTube video, only when it helps the reader (official trailers, Rockstar or platform-holder videos first). Never in other guide sections. Add to front matter `video: { id: "<11-char id>", title, channel, date: YYYY-MM-DD, description }` and put `<!--VIDEO-->` in the body where it belongs (otherwise it goes before the second H2). Use only a video whose id, title and channel you found in search results; never guess an id. The build renders a click-to-play thumbnail (youtube-nocookie) and VideoObject schema, and fails if `video` is used elsewhere.
- 6–12 internal links to existing guides and posts (check the exact `/section/slug/` URL of each). Check `content/blog` and `content/guides` first: no repeated topics. Commit: `Add blog post: <title>`.
- Each day also expand the 2 oldest blog posts that are still under 1,000 words to this structure (keep slug and facts, add verified sections, bump `updated`). Check word counts with: `for f in content/blog/*.md; do echo "$(sed -n '/^---$/,/^---$/!p' $f | wc -w) $f"; done | sort -n`.

## Languages
- English is the source (`content/guides`, `content/blog`, `content/pages`, URLs without a prefix). Translations live in `content/i18n/<lang>/{guides,blog,pages}/<same file name>.md` for `es pt ru fr de pl it ja ko zh tr nl uk cs id vi` and are published under `/<lang>/…` with the same slug. The build adds hreflang, the language switcher and sitemap alternates automatically; a page appears in a language only when its translation file exists.
- A translation file has only: `title`, `seoTitle` (≤60 chars), `description` (70–160 chars), `summary`, `faq` and the body. Everything else (section, dates, status, sources, image, related) comes from the English file. Do not translate slugs or file names.
- Translate naturally for players in that language (not word for word), keep every fact, number, table row and code identical, keep internal links as written in English (`/section/slug/`; the build points them to the translated page). Keep game names in English: place names, character names, vehicle and weapon names, "Rockstar", "GTA 6". Translate D-pad directions (Up, Down, Left, Right) and button words.
- `node scripts/i18n-missing.mjs [lang]` lists files that still need a translation.
- New languages added 2026-11-24 (ja, ko, zh = Simplified Chinese, tr, nl, uk, cs, id, vi) start with 3 guides each. The daily task translates **3 more pages into each of these 9 languages** (27 a day) (hubs and highest-volume guides first: characters/jason/lucia, price-editions, platforms, pc-release-date, online, mission-list, then walkthroughs and the 5 static pages), until they catch up with the older languages. CJK descriptions must still be 70–160 characters. When an English file is revised (new `updated` date), update its translations too.
- Interface texts are in `i18n/ui.json`. Language list is in `site.config.json` → `languages`.

## Illustrations (Animx, at most 15 a day)
- Every page gets its own picture; a picture is never reused on another page or section (owner's rule). Pages without their own picture show a styled placeholder automatically, never another page's image.
- Each day generate pictures for the new pages, up to 15 in total (owner raised the limit from 10 on 2026-11-19; guides first, then blog posts, then older pages still on the placeholder). Pages over the limit keep the placeholder and get a picture on a later day, oldest first.
- Use the Animx connector (`generate_image`, aspectRatio 16:9; at most 8 can render at once). Style: "Stylised cinematic digital painting", dusk/neon Florida mood, pink orange and teal palette, "no text, no logos". Each prompt must describe a different scene from every existing one (check the `alt` texts in `images.json`).
- Never depict Jason, Lucia or any other Rockstar character, real people, recognisable faces, Rockstar logos, box art, or anything that imitates a screenshot. Places, vehicles, objects and anonymous small silhouettes only.
- Add it to `images.json` → `images` as `"g-short-name": { "id": "<generation id>", "alt": "Illustration of …" }` (the file URL is `base` + id + `/output.png`; if Animx returns a different URL pattern, skip the image) and set `image: g-short-name` in the English front matter. CI downloads and converts it on push. Translations reuse it.

## Cheats and codes
- A cheat code goes on `gta-6-cheats` only when at least two independent sources show the same inputs (or Rockstar publishes it). List the unlock condition too. Keep `status: partly` until codes are tested in the released game. Add newly published codes each day and bump `updated`.

## Accuracy rules (strict)
- `sources` in the front matter are required for every guide and post, but they are not shown on the page (owner's decision): they are our record of verification and go into the page's structured data only. External links inside the text are made nofollow automatically; use them sparingly.
- Publish only what is verified by Rockstar or by at least two reputable sources that agree; cite them in `sources`. Never invent mission steps, names, cheat codes, stats or locations. If unsure, leave it out or mark it unconfirmed.
- No leaks presented as fact. No official artwork, screenshots or logos. Write everything in our own words; never copy competitor text.
- Keep the fan-site disclaimer. Don't edit design or config unless asked.
