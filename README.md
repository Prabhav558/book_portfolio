# Book Portfolio

A portfolio told as four cloth-bound volumes on an oak shelf. A drawing of the first volume is inked in, the drawing turns into the book, and you unlatch its clasp. After that, scroll, swipe, press an arrow key, or take a page by its corner and turn it. Volumes you have not opened yet stay on the shelf as drawings; each turns real the first time you take it down.

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
| Colours of the four volumes | `content/palette.ts` (six roles per volume; the recipe is at the top of the file) |
| Project screenshots | set `image: "/work/name.jpg"` on a featured project (file in `public/work/`). Until then its left-hand page is a tinted plate with the project's initial. |
| Résumé download | replace `public/resume.pdf` |
| Contact form | create a free key at [web3forms.com](https://web3forms.com), then add `NEXT_PUBLIC_FORM_KEY=...` to `.env.local`. Without a key the form falls back to `mailto:`. |
| Room, paper, ink, oak and steel | the tokens at the top of `app/globals.css` (`--room`, `--paper`, `--ink`, `--oak`, …) and the `.clasp-*` rules |
| Typefaces | `app/layout.tsx` (Instrument Serif for display, Instrument Sans for text) |
| What a page is called in the index | `name` on its block, in the files under `components/pages/` |
| Cover icons | `CoverIcon` in `components/pages/primitives.tsx` |
| Real sound recordings (optional) | drop files in `public/sounds/` and list them in `SOUND_FILES` in `lib/audio.ts`. Every sound is synthesised by default. |

## How it works

- **Layout** (`lib/layout.ts`): one function sizes the scene for the viewport. It picks the device kind (phone, phone landscape, tablet portrait, desktop), gives each book the largest size that fits beside the shelf and controls, and decides single-page or two-page per book. `TABLET_MODES` sets the per-book choice on portrait tablets.
- **Pages** (`components/pages/`): each book is a list of composed pages (title page, statement, a chapter opener in the volume's colour, lists, plates, a letter form, a colophon). The type scale is a comment at the head of the type rules in `app/globals.css`: sizes are fractions of the page width, with a floor for text.
- **Pagination** (`components/book/Paginator.tsx`): pages are measured off-screen at the real page size; one that would overflow is scaled to fit, and a quiet filler page keeps two-page books even. Your place is kept when the screen is resized or rotated.
- **The book** (`components/book/Book.tsx`, the "book" rules in `app/globals.css`): boards with a cloth turn-in and endpapers, an oak spine, a page block with uneven edges, pages that dip into the gutter. Leaves hinge above the table so both halves of the open book lie level.
- **One timeline per book** (`lib/timeline.ts`): off its shelf slot, open, turn pages, close, back into the same slot.
- **The director** (`lib/director.ts`) plays those timelines: one input, one authored transition; books overlap when changing volume; jumping from mid-book riffles the remaining pages shut. `hold()` hands a page over to be turned by hand.
- **Turning pages.** Scroll, keys and the arrows play a curved turn: each leaf has a chain of hinged strips with per-hinge lighting (`lib/curl.ts`), filled and armed while the scene is at rest. A drag folds the sheet where it is held and follows the pointer (`lib/fold.ts`); a corner lifts as the pointer nears it.
- **Input** (`lib/input.ts`): wheel, swipe and keys turn one page; a drag on the open book picks the page up and lets it go with the pointer's speed.
- **The camera** (`components/stage/Stage.tsx`): the shelf, books and intro ink sit inside one node. It looks at the open book, drifts up to the shelf as a book goes back, and comes down with the next. It only pans, because moving a layer is free and zooming redraws every surface.
- **The intro** (`lib/sketch.ts`): fonts, textures, WebGL, audio and the first book's sheets load first; then the cover is drawn in ink exactly over the real book, and the sheet it is drawn on dissolves. Unread volumes keep their ink on the shelf.
- **The index** (`components/ui/IndexCard.tsx`): a card pulled out from a tab. It lists every volume and its named pages with the page numbers they have on this screen, and jumps anywhere.
- **The cursor** (`components/ui/Cursor.tsx`): mouse and trackpad only. Mark anything with `data-cursor="Word"` to have it say that word.
- **The room** (`components/three/ambient.ts`): one WebGL pass for daylight and a window shaft, tinted toward the open volume.

## Accessibility

- Arrow keys, Page Up/Down, Space, Home and End turn pages; Enter opens the closed book; Esc closes the index.
- Only the pages on show can be reached: every other page is `inert`. Each turn is announced ("Volume 2, Projects. Pages 3 and 4 of 10.").
- The first Tab stop is a link to `/quick`, the same content as an ordinary page. With `prefers-reduced-motion` set, visitors get that page by default, with an opt-in to the animated version.
- Touch targets are 44px; text colours pass 4.5:1 on their backgrounds.

## Checking it

```bash
NEXT_DIST=.next-prod npx next build --turbopack && NEXT_DIST=.next-prod npx next start -p 3123
node tools/check.mjs shots            # key states at eight screen sizes -> tools/out/
node tools/gallery.mjs desktop phone  # every resting page of every book
node tools/intro.mjs                  # frames through the opening drawing
node tools/handoff.mjs                # frames through a book change and the ending
node tools/peel.mjs desktop phone     # pages taken by the corner, dropped, turned, brought back
node tools/a11y.mjs                   # the site walked with the keyboard only
node tools/check.mjs perf             # frame times for the intro, turns, drags and a book change
node tools/check.mjs perf 4           # the same with the CPU slowed 4x
node tools/trace.mjs handoff desktop 4   # where main-thread time goes (intro | open | handoff)
```

`NEXT_DIST` builds into its own folder, so this can run while `npm run dev` is up (the build may reformat `tsconfig.json`; `git checkout tsconfig.json` undoes that). The tools read the site from `SITE` (default `http://localhost:3123/`) and need Chrome at the default Windows path (override with the `CHROME` env variable). `CSS="…" node tools/trace.mjs open` tries a style change without editing the source, to see what a rule costs.

Two things learned the hard way, worth keeping in mind when changing the book's styles: blurred or outlined shadows on rounded shapes are slow for the GPU to draw (they cost over 100ms as the cover swings open), and a custom property set on the root element restyles every page of every book.
