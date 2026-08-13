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
| 8 | Comment marche ta boîte | Slides the Moon over the Sun, opens a leak | What each part of the box is for — and an eclipse on the paper |
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
- Chapter 8 bites the picture of the Sun on the side opposite the sky, because
  the rays crossed at the hole. That inversion is asserted too, along with the
  rule that the Moon's shadow never darkens wall the Sun was not lighting.
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

## The narration

Every sentence is on screen in large type, and every one of them is also a
recorded clip that ships with the app — 46 files, 1.3 MB, one per narrated line
per language.

**Not `speechSynthesis`.** The browser's own voices proved to be a lottery the
audience loses. Measured on one Ubuntu desktop, in a single session, with
`speech-dispatcher` and eSpeak correctly installed:

| Browser | Voices offered to the page |
|---|---|
| Firefox | 14 805 — every one an eSpeak variant, unintelligible in French to a six-year-old |
| Brave / Chrome / Chromium | **0** |

A school tablet, an iPad and a parent's phone would each have produced something
different again. Shipping the audio makes the narration identical everywhere,
offline included, and let the voice be chosen by listening to it rather than
accepting whatever the device happened to ship.

Voices: **fr_FR-tom-medium** and **en_GB-alan-medium**, both from
[Piper](https://github.com/rhasspy/piper) — neural, permissively licensed, and
generated offline.

### Regenerating the clips

Needed whenever a narrated line changes. A unit test fails if the dictionaries
and the audio drift apart, so this is never something you can forget silently.

```bash
python3 -m venv .venv && .venv/bin/pip install piper-tts   # once
.venv/bin/python scripts/generate-narration.py             # ~30 s
```

Models download once into `.voices/` (60 MB each, gitignored). `ffmpeg` does the
MP3 encode. To change voice, edit `VOICES` at the top of the script — the
catalogue is at
[rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices).

## Deploying

`npm run build` produces a fully static `dist/`. The base path is relative, so
it works from a sub-directory (GitHub Pages, a folder on a school server)
without a rebuild. No environment variables, no backend, nothing to configure.

## Constraints it holds itself to

- **74.2 KB of JavaScript**, gzipped — budget of 200 KB, enforced by
  `npm run verify`.
- **Zero WCAG 2.2 AA violations** on every chapter, checked by axe in CI-able
  tests, not asserted in prose.
- **Same narration on every device**: 46 recorded clips ship with the app, so
  nothing depends on the voices a browser happens to offer. The text is on
  screen regardless.
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
