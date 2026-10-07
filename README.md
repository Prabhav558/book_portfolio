# Book Portfolio

A light, Scandinavian-minimal portfolio told as four cloth-bound volumes on an oak shelf: grey matte covers with an oak spine band, debossed line icons and a brushed-steel clasp. A pencil sketch draws the diary, then the lights come up. Click the clasp to open the first book. After that, every scroll, swipe or arrow key turns one page.

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

- **One timeline per book** (`lib/timeline.ts`): pull off its shelf slot → open → turn pages → close → back into the same slot. Every book starts and ends on the shelf, so nothing ever appears from nowhere.
- **The director** (`lib/director.ts`) plays those timelines. One input plays one authored transition. Between two books it overlaps the first book's return with the next book leaving its slot. Jumps (rail or shelf) close the current book first. Input is mapped in `lib/input.ts` (wheel with trackpad-inertia rejection, touch swipes, keys).
- **Bending pages** (`lib/curl.ts`): the turning sheet is a chain of seven hinged strips with per-hinge lighting, so it curls like paper instead of rotating like a card. The next sheet is built during idle time while you read, so the turn itself has nothing to construct.
- **The intro** (`lib/sketch.ts`, `components/stage/Stage.tsx`): everything heavy (fonts, textures, WebGL shaders, page layers) loads first, hidden behind the white page. A pencil nib then draws the diary and shelf from their real positions, and the light spreads outward from the book. The reveal is compositor-only.
- **The room** (`components/three/ambient.ts`): one WebGL pass for soft daylight, a window shaft and drifting dust, tinted toward the volume on the table.
- **Performance rules:** only `transform` and `opacity` are animated; first-time costs (audio device, page layers, the clasp) are paid before they're needed.
- **Under 768px** books switch to single-page mode. With `prefers-reduced-motion` set, visitors see the calm `/quick` layout instead, with an opt-in to the animated version. `/quick` is always available from the top bar.
