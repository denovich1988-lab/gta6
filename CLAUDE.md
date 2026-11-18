# GTA 6 guide site — content rules

Static site. `npm run build` builds `content/guides/*.md` and `content/pages/*.md` into `dist/`; then run `python3 scripts/check-seo.py` (both must pass). Push to `main` deploys.

## Guides
- File: `content/guides/YYYY-MM-DD-slug.md`. Front matter: `title`, `seoTitle` (≤60 chars, contains the target keyword), `description` (70–160 chars, unique), `section` (missions | map | characters | vehicles | weapons | cheats | buying | pc | online | news), `date`, `updated` (when revised), `status` (confirmed | partly | unconfirmed | live), `summary` (3 short facts), `faq` (3–4 q/a), `sources` (name + url), optional `related` slugs.
- Mission walkthrough structure: Before you start → Objectives → Step-by-step → Where players fail → Optional goals and rewards. Add each new mission to the list in `gta-6-mission-list` (story order) and bump its `updated`.
- One target keyword per page. Proven keywords (US volume/KD): gta 6 map 87k/34, gta 6 lucia 20k/2, gta vi radio stations 12k/4, gta 6 characters 7k/10, gta 6 online 5k/5, gta 6 jason 4.5k/21, gta 6 file size 3.7k/6, gta 6 crossplay 2.6k/0, gta 6 voice actors 2.4k/3, gta 6 system requirements 1.9k/0, gta 6 map size 1.7k/13, gta 6 cars 1.5k/2, will gta 6 have cheat codes 1.1k/0, gta 6 guns 1k/5, gta 6 animals 1k/0, gta 6 missions 600/0, port gellhorn gta 6 600/0. After launch: "gta 6 <mission name> walkthrough", "how to …", collectibles, money, trophies.

## Accuracy rules (strict)
- Publish only what is verified by Rockstar or by at least two reputable sources that agree; cite them in `sources`. Never invent mission steps, names, cheat codes, stats or locations. If unsure, leave it out or mark it unconfirmed.
- No leaks presented as fact. No official artwork, screenshots or logos. Write everything in our own words; never copy competitor text.
- Keep the fan-site disclaimer. Don't edit design or config unless asked.
