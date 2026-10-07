# Book Portfolio

A light, Scandinavian-minimal portfolio told as four cloth-bound volumes on an oak shelf: grey matte covers with an oak spine band, debossed line icons and a brushed-steel clasp. A pencil sketch draws the diary, then the lights come up. Click the clasp to open the first book. After that, scroll, swipe, press an arrow key or drag a page to turn it.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Make it yours

| What | Where |
| --- | --- |
| All text, links, projects, roles | `content/portfolio.ts` |
| Project screenshots | set `image: "/work/name.jpg"` on a featured project (file in `public/work/`). Until then its left-hand page is a tinted plate with the project's initial. |
| Résumé download | replace `public/resume.pdf` |
| Contact form | create a free key at [web3forms.com](https://web3forms.com), then add `NEXT_PUBLIC_FORM_KEY=...` to `.env.local`. Without a key the form falls back to `mailto:`. |
| Volume colours (cover, ink, ribbon, light tint) | the `leather`, `accent`, `silk` and `glow` values at the bottom of each file in `components/pages/` |
| Room, paper, ink, oak and steel | the tokens at the top of `app/globals.css` (`--room`, `--paper`, `--ink`, `--oak`, …) and the `.clasp-*` rules |
| Typefaces | `app/layout.tsx` (Instrument Serif for display, Instrument Sans for text) |
| Cover icons | `CoverIcon` in `components/pages/primitives.tsx` |
| Real sound recordings (optional) | drop files in `public/sounds/` and list them in `SOUND_FILES` in `lib/audio.ts`. Every sound is synthesised by default. |

## How it works

- **Layout** (`lib/layout.ts`): one function sizes the scene for the viewport. It picks the device kind (phone, phone landscape, tablet portrait, desktop), gives each book the largest size that fits beside the shelf and controls, and decides single-page or two-page per book. `TABLET_MODES` sets the per-book choice on portrait tablets.
- **Pages** (`components/pages/`): each book is a list of composed pages (title page, statement, a chapter opener in the volume's cloth colour, lists, plates, a letter form, a colophon). Display type is sized in container units so a page keeps its proportions at any size; text has a floor of about 15px. The type and page system is the "pages" section of `app/globals.css` (`.t-*`, `.rows`, `.pc--tone`, `.pc--bleed`).
- **Pagination** (`components/book/Paginator.tsx`): pages are measured off-screen at the real page size; one that would overflow is scaled to fit, and a quiet filler page keeps two-page books even. Your place is kept when the screen is resized or rotated.
- **One timeline per book** (`lib/timeline.ts`): pull off its shelf slot, open, turn pages, close, back into the same slot.
- **The director** (`lib/director.ts`) plays those timelines: one input, one authored transition; books overlap when changing volume; jumping from mid-book riffles the remaining pages shut. `scrub()` lets a page be held and dragged.
- **Input** (`lib/input.ts`): wheel, swipe and keys turn one page; a horizontal drag on the open book makes the page follow the pointer and finishes or falls back depending on how far and how fast it was released.
- **Bending pages** (`lib/curl.ts`): each leaf has its own chain of hinged strips with per-hinge lighting. They are filled, and then armed (painted but invisible), one at a time while the scene is at rest, so picking a page up costs nothing.
- **The intro** (`lib/sketch.ts`, `components/stage/Stage.tsx`): fonts, textures, WebGL, audio and the first book's sheets load under a blank page; then a pencil draws the diary and shelf, tracing the real cover's icon, title and clasp, and the light spreads out from the book.
- **The room** (`components/three/ambient.ts`): one WebGL pass for daylight and a window shaft, tinted toward the open volume.
- With `prefers-reduced-motion` set, visitors see the calm `/quick` layout instead, with an opt-in to the animated version.

## Checking it

```bash
NEXT_DIST=.next-prod npx next build --turbopack && NEXT_DIST=.next-prod npx next start -p 3123
node tools/check.mjs shots            # screenshots of key states at eight device sizes -> tools/out/
node tools/gallery.mjs desktop phone  # every resting page of every book
node tools/check.mjs perf             # frame times for the intro, turns, drags and a book change
node tools/check.mjs perf 4           # the same with the CPU slowed 4x
node tools/trace.mjs handoff desktop 4   # where main-thread time goes (intro | open | handoff)
```

`NEXT_DIST` builds into its own folder, so this can run while `npm run dev` is up (the build may reformat `tsconfig.json`; `git checkout tsconfig.json` undoes that). The tools read the site from `SITE` (default `http://localhost:3123/`) and need Chrome at the default Windows path (override with the `CHROME` env variable).
