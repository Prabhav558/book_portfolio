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
| Résumé download | replace `public/resume.pdf` |
| Contact form | create a free key at [web3forms.com](https://web3forms.com), then add `NEXT_PUBLIC_FORM_KEY=...` to `.env.local`. Without a key the form falls back to `mailto:`. |
| Volume colours (cover, ink, ribbon, light tint) | the `leather`, `accent`, `silk` and `glow` values at the bottom of each file in `components/pages/` |
| Room, oak and steel | the tokens at the top of `app/globals.css` (`--night`, `--oak`, …) and the `.clasp-*` rules |
| Cover icons | `CoverIcon` in `components/pages/primitives.tsx` |
| Real sound recordings (optional) | drop files in `public/sounds/` and list them in `SOUND_FILES` in `lib/audio.ts`. Every sound is synthesised by default. |

## How it works

- **Layout** (`lib/layout.ts`): one function sizes the scene for the viewport. It picks the device kind (phone, phone landscape, tablet portrait, desktop), gives each book the largest size that fits beside the shelf and controls, and decides single-page or two-page per book. `TABLET_MODES` sets the per-book choice on portrait tablets.
- **Pagination** (`components/book/Paginator.tsx`): content is written as a flow of blocks (`blocks` in each file under `components/pages/`). Blocks are measured at the real page size and packed into as many pages as that device needs, so body text never drops below about 15px. Your place is kept when the screen is resized or rotated.
- **One timeline per book** (`lib/timeline.ts`): pull off its shelf slot, open, turn pages, close, back into the same slot.
- **The director** (`lib/director.ts`) plays those timelines: one input, one authored transition; books overlap when changing volume; jumping from mid-book riffles the remaining pages shut. `scrub()` lets a page be held and dragged.
- **Input** (`lib/input.ts`): wheel, swipe and keys turn one page; a horizontal drag on the open book makes the page follow the pointer and finishes or falls back depending on how far and how fast it was released.
- **Bending pages** (`lib/curl.ts`): each leaf has its own chain of hinged strips with per-hinge lighting. They are filled while the scene is at rest and kept painted but invisible, so picking a page up costs nothing.
- **The intro** (`lib/sketch.ts`, `components/stage/Stage.tsx`): fonts, textures, WebGL, audio and the first book's sheets load under a blank page; then a pencil draws the diary and shelf and the light spreads out from the book.
- **The room** (`components/three/ambient.ts`): one WebGL pass for daylight, a window shaft and dust, tinted toward the open volume.
- With `prefers-reduced-motion` set, visitors see the calm `/quick` layout instead, with an opt-in to the animated version.

## Checking it

```bash
npm run build && npx next start -p 3123
node tools/check.mjs shots            # screenshots of key states at eight device sizes -> tools/out/
node tools/check.mjs perf             # frame times for the intro, turns, drags and a book change
node tools/check.mjs perf 4           # the same with the CPU slowed 4x
node tools/trace.mjs intro desktop    # where main-thread time goes
```

These need Chrome at the default Windows path (override with the `CHROME` env variable).
