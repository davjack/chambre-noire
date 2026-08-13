# La Chambre Noire

**How a tiny hole makes a picture — explained to children from age 6.**

Ten screens, one idea each, every one of them manipulable. No video, no quiz to
pass, no reading required: whatever is said is also written in large type, and
whatever is written can be spoken aloud.

> Light travels in straight lines, so a small hole sorts it — and the picture
> comes out upside down.

## The story

| # | Chapter | What the child does | What it shows |
|---|---------|---------------------|---------------|
| 0 | Regarde bien | Touches the black wall | The world walks in, upside down |
| 1 | La lumière va tout droit | Moves a lamp, blocks it with a hand | Rays are straight; shadows follow |
| 2 | Sans trou, pas d'image | Opens the window wide | Every point lights the whole wall: no picture |
| 3 | Un trou minuscule range la lumière | Closes it to a pinhole | Each point finds its own place |
| 4 | Pourquoi c'est à l'envers | Lifts the figure, in two views | Rays cross at the hole — both axes flip |
| 5 | Grand trou ou petit trou ? | Slides the aperture | Sharp or bright: pick one |
| 6 | Boîte courte ou longue | Slides the box length | Bigger picture, dimmer picture |
| 7 | Ton œil est une boîte noire | Changes the room light | The pupil is the hole |
| 8 | Les taches de soleil | Moves the Moon across the Sun | Gaps between leaves are pinholes |
| 9 | Fabrique la tienne | Reads a recipe | A shoebox, foil and a needle |

French and English, switchable at any point. Deep links per chapter
(`#/the-hole`), so a teacher can send a class straight to one.

## What makes it honest

The pictures are not illustrations of the physics — they are drawn from it.

- `src/physics/optics.ts` holds the real formulas: magnification `f/u`,
  geometric blur `d·(f+u)/u`, Airy diffraction `2.44·λ·f/d`, the two combined in
  quadrature, and Young's optimal diameter `1.562·√(λf)`. Unit-tested, including
  a brute-force scan proving the predicted sweet spot really is where the blur
  curve bottoms out.
- The lit band a chapter draws on the wall is *exactly* `geometricBlur` tall —
  asserted by a test, not by eye.
- Chapter 5 runs a WebGL2 fragment shader that integrates the scene over the
  aperture disc, in linear light. A CSS blur would have got blurrier the more
  you turned it up; a real pinhole gets blurrier at **both** ends, and finding
  the sweet spot between them is the point of the chapter.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---------|--------------|
| `npm run verify` | typecheck + lint + unit tests + build + gzip budget |
| `npm run e2e` | Playwright: every chapter, axe WCAG 2.2 AA, canvas pixels, three projects |
| `npm run build` | Static site into `dist/` |
| `npm run preview` | Serves the built site |

`npm run e2e` needs a browser once: `npx playwright install chromium`.

One of its three projects, `dev-strict-mode`, runs the canvas tests against
`npm run dev` rather than the build. React StrictMode mounts every effect twice
there, and a WebGL bug once lived in exactly that gap: the production build was
perfect while chapters 0 and 5 were black for the whole dev session.

## Narration, and where it works

The spoken narration uses the browser's `speechSynthesis`, and browsers differ
sharply on Linux: **Firefox exposes the system voices** through
`speech-dispatcher` (`sudo apt install speech-dispatcher-espeak-ng`), while
Chromium-based browsers commonly expose **none at all on the same machine**.

The app checks rather than assumes. Where no voice exists the sound button is
not shown — an inviting button that does nothing is worse than no button — and
a line under the narration says so. Every spoken sentence is always on screen in
large type regardless, so nothing is ever lost with the sound off.

## Deploying

`npm run build` produces a fully static `dist/`. The base path is relative, so
it works from a sub-directory (GitHub Pages, a folder on a school server)
without a rebuild. No environment variables, no backend, nothing to configure.

## Constraints it holds itself to

- **72 KB of JavaScript**, gzipped — budget of 200 KB, enforced by
  `npm run verify`.
- **Zero WCAG 2.2 AA violations** on every chapter, checked by axe in CI-able
  tests, not asserted in prose.
- **Works without a voice**: `speechSynthesis` is an enhancement; the text is
  always on screen.
- **Works without WebGL2**: chapters 0 and 5 fall back to an interactive canvas
  renderer driven by the same `optics.ts` numbers, and say so on screen.
- **Respects `prefers-reduced-motion`**: every scene is readable from its static
  frame.

## Stack

Vite 8 · React 19 · TypeScript 7 · Tailwind CSS 4 · oxlint · Vitest 4 ·
Playwright. No 3D library, no router, no i18n framework, no state manager —
each was weighed and each lost to about thirty lines of code.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the conventions this project holds
to, and [docs/decisions.md](docs/decisions.md) for why the stack looks the way
it does.

## Credit

The pedagogical approach — manipulate rather than read — is borrowed from
[eclipse.anisayari.com](https://eclipse.anisayari.com/) by Anis Ayari. Chapter 8
is the wink back at it: the crescents under a tree during an eclipse are pinhole
images of the Sun.

Optics formulas: [Pinhole camera](https://en.wikipedia.org/wiki/Pinhole_camera).

## Licence

MIT.
