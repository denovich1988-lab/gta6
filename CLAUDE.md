# GTA 6 guide site — content rules

Static site. `npm run build` builds `content/guides/*.md`, `content/blog/*.md` and `content/pages/*.md` into `dist/`; then run `python3 scripts/check-seo.py` (both must pass). Push to `main` deploys.

## Guides
- File: `content/guides/YYYY-MM-DD-slug.md`. Front matter: `title`, `seoTitle` (≤60 chars, contains the target keyword), `description` (70–160 chars, unique), `section` (missions | map | characters | vehicles | weapons | cheats | buying | pc | online | news), `date`, `updated` (when revised), `status` (confirmed | partly | unconfirmed | live), `summary` (3 short facts), `faq` (3–4 q/a), `sources` (name + url), optional `related` slugs.
- Mission walkthrough structure: Before you start → Objectives → Step-by-step → Where players fail → Optional goals and rewards. Add each new mission to the list in `gta-6-mission-list` (story order) and bump its `updated`.
- The scheduled task adds up to 50 guides each morning in batches of 10 (build, check, commit, push per batch). Fewer is fine when verified information runs out: never pad with invented or duplicate pages.
- One target keyword per page. Proven keywords (US volume/KD): gta 6 map 87k/34, gta 6 lucia 20k/2, gta vi radio stations 12k/4, gta 6 characters 7k/10, gta 6 online 5k/5, gta 6 jason 4.5k/21, gta 6 file size 3.7k/6, gta 6 crossplay 2.6k/0, gta 6 voice actors 2.4k/3, gta 6 system requirements 1.9k/0, gta 6 map size 1.7k/13, gta 6 cars 1.5k/2, will gta 6 have cheat codes 1.1k/0, gta 6 guns 1k/5, gta 6 animals 1k/0, gta 6 missions 600/0, port gellhorn gta 6 600/0. After launch: "gta 6 <mission name> walkthrough", "how to …", collectibles, money, trophies.

## Keyword plan
- `keywords.md` is the content plan (Ahrefs data from competitors). Every new guide or blog post targets one unchecked group from it, top to bottom; put the target keyword in `seoTitle`, the H1, the first paragraph and one FAQ question, and use the secondary keywords in headings and FAQ. After publishing, tick the row and add the slug.
- When the Ahrefs connector is available, check the competitors' new keywords about once a week (gtabase.com, tracker.gg/gta6, matching terms for "gta 6") and add rows, especially post-launch ones: mission names, collectibles, money, challenges, trophies.

## Blog — 2 posts every morning
- File: `content/blog/YYYY-MM-DD-slug.md`, URL `/blog/<slug>/`. Front matter: `title`, `seoTitle` (≤60 chars, with the keyword), `description` (70–160 chars), `date`, `status`, `summary` (3 facts), `faq` (3 q/a), `sources` (2+), `related` slugs. No `section` (the build sets it).
- Blog = answers to question keywords and news explainers (file size, launch times, platforms, delays, budget, sales, patches). Guides = lasting reference pages (missions, map, cheats, vehicles, weapons). Don't cover the same keyword in both.
- 500–1100 words, answer in the first sentence, a table or numbered steps where it helps, 2–4 internal links. Check `content/blog` and `content/guides` first: no repeated topics. Commit: `Add blog post: <title>`.

## Cheats and codes
- A cheat code goes on `gta-6-cheats` only when at least two independent sources show the same inputs (or Rockstar publishes it). List the unlock condition too. Keep `status: partly` until codes are tested in the released game. Add newly published codes each day and bump `updated`.

## Accuracy rules (strict)
- Publish only what is verified by Rockstar or by at least two reputable sources that agree; cite them in `sources`. Never invent mission steps, names, cheat codes, stats or locations. If unsure, leave it out or mark it unconfirmed.
- No leaks presented as fact. No official artwork, screenshots or logos. Write everything in our own words; never copy competitor text.
- Keep the fan-site disclaimer. Don't edit design or config unless asked.
