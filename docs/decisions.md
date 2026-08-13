# Design decisions

Why this project looks the way it does: what was weighed, what was rejected,
and which objections to the current design are still open.

Nothing here is settled forever. Each entry names the condition under which the
rejected option would win, so a future change has something to argue against.

---

## Rendering: 2D everywhere, a shader in one place

Chapters draw with SVG, computed from `src/physics/optics.ts`. Two of them —
the opening screen and *Grand trou ou petit trou ?* — run a WebGL2 fragment
shader that integrates the scene over the aperture disc.

**Rejected: full 3D with three.js / React Three Fiber.** Free 3D navigation
costs a six-year-old more attention than it returns, the core idea (rays
crossing at the hole) reads better in a flat cutaway, and the bundle triples.
*Would win* for a 10+ audience, or if spatial exploration were the goal.

**Rejected: no WebGL at all, a CSS blur instead.** A blur filter gets blurrier
the more you turn it up, full stop. A real pinhole gets blurrier at **both**
ends — wide open because the hole is a disc, nearly shut because light
diffracts — and finding the sweet spot between them is the entire point of that
chapter. A CSS blur would have taught the opposite. *Would win* if the chapter
were dropped.

**Open objection:** a pinhole app for six-year-olds does not obviously need a
GPU at all — and this one puts that dependency on its opening screen, where a
failure costs the most. Both chapters fall back to an interactive 2D canvas
driven by the same numbers. If measurement on a target tablet showed the shader
below 30 fps, the fallback should become the primary path.

## Deliberately absent dependencies

No 3D library, no router, no i18n framework, no state manager.

- **Router** — ten linear chapters with deep links need about thirty lines of
  hash routing. A router is more code to download, not less to write.
- **i18n framework** — around ninety strings. A JSON dictionary plus a `useT()`
  hook is enough, and deriving `TranslationKey` from the French file makes a
  missing translation a build error.
- **State manager** — React state plus one context. Progress persists in
  `localStorage`, and every failure mode of that (absent, throwing in private
  mode, holding rubbish) is unit-tested.

*Would win:* any of these, the moment the app grows a second axis of navigation
or a shared mutable model.

## Linting: oxlint, not ESLint

Not a preference — a hard constraint. `typescript-eslint` declares the peer
range `"typescript": ">=4.8.4 <6.1.0"`, so it cannot run against TypeScript 7.
oxlint is used instead, and its type-aware rules are built on the same Go port
of the compiler.

*Fallback if oxlint ever blocks the work:* pin TypeScript 6 and switch back.

## Narration: recorded clips, not `speechSynthesis`

The browser's own voices proved to be a lottery the audience loses. Measured on
one Linux desktop, in a single session, with `speech-dispatcher` and eSpeak
correctly installed:

| Browser | Voices offered to the page |
|---|---|
| Firefox | 14 805 — every one an eSpeak variant, unintelligible in French to a six-year-old |
| Chromium-based | **0** |

A school tablet, an iPad and a parent's phone would each have produced something
different again. The app now ships 46 clips (1.2 MB) generated offline with
[Piper](https://github.com/rhasspy/piper), so the narration is identical
everywhere, works offline, and the voice was chosen by listening to candidates
rather than by accepting a default.

### The shake on held vowels, and how it was not found

A listener called the narration shaky. Three things were tried, in this order.

**The MP3 encode: ruled out.** Periodicity of the signal going in and coming
out of the 64 kbps mono encode: 58.0 % against 58.0 %. The codec is not it.

**The voice model: measured, changed, reverted.** Scored on how cleanly the
waveform repeats itself over voiced frames, `fr_FR-upmc-medium` beat
`fr_FR-tom-medium` by 5.2 points — fourteen standard errors, on the app's own
sentences. The clips were regenerated and the same listener heard **no
improvement at all**. The measurement was sound and answered the wrong
question; the voice went back to `tom`, which was liked.

**The synthesis settings: what actually did it.** The same measurement ranked
these as indistinguishable — every candidate inside its own error bar. Put to
the ear one variable at a time against the previous 1.12 / 0.6 / 0.7, two came
back better, and the winner was clear:

| | was | is |
|---|---|---|
| `length_scale` | 1.12 | **1.00** |
| `noise_scale` | 0.6 | 0.6 |
| `noise_w_scale` | 0.7 | 0.7 |

Reading slowly was done by stretching the phonemes, and Piper samples noise as
it generates: a held vowel gives that sampling longer to wander, which is what
a shake is. The narration is now about 10 % quicker than the deliberately slow
read it replaces; the sentences are twelve words long, and steadiness was worth
more than the extra beat.

**Rejected: combining the two candidates.** The runner-up kept the slow read and
turned the generator's variation down instead — 1.12 / 0.33 / 0.45 — and was
also judged better than the original. Both were applied together on the
assumption that two separate improvements add up. The same listener called the
result worse than either: less variation and less stretch together flatten the
voice. *Would win* only if someone listens to it and says so.

**The lesson, which is the reason this entry is long:** the proxies available
here — pitch jitter, periodicity — rank synthesis settings as noise and rank
models as decisive. The listener's verdict was the exact opposite on both
counts, and it also rejected a combination that both halves of the measurement
endorsed. Do not tune these numbers by measurement alone, and do not ship a
setting nobody has heard.

**Open objection:** a recorded human would be warmer than a neural voice.
`scripts/generate-narration.py` is the only file that would change.

## Page layout: an app shell

Fixed header, one scrolling middle, fixed bottom panel carrying the narrated
line and the navigation. Three earlier shapes each failed a real case:

1. **A page that grows** put the *Suite* button below the fold on all ten
   chapters in landscape and at 200 % browser zoom. A child who cannot see the
   way forward does not go looking for it.
2. **A pinned height with clipped overflow** put the button out of reach
   entirely — a failure of WCAG 1.4.4 and 1.4.10, not a cosmetic one.
3. **A sticky footer** kept the buttons visible but let the narrated line —
   the one that carries the lesson — scroll underneath it.

When room runs short the order is settled: **the way forward, then the sentence
being taught, then the controls, then the picture.** `e2e/layout.spec.ts`
asserts it across eight viewports, and scrolls nothing before asserting —
because the test it replaced called `scrollIntoViewIfNeeded()` first, and so
proved reachability rather than visibility while the defect was live.

The shell is sized in `svh` — the *small* viewport, the one visible while the
browser's own chrome is showing. `dvh` tracks the visible area as that chrome
retracts, so a shell sized in it would resize mid-scroll and reflow the layout
under the reader. `body` keeps a `100dvh` minimum on purpose, for the opposite
reason: the background should still cover the screen once the chrome is gone.

## Visual language: geometric, not illustrated

Flat shapes rather than drawings. Illustration done by a developer looks
half-finished next to the best work in this genre; a strict geometric language
can be executed cleanly in code.

**Open objection:** a warm, picture-book look would suit the audience better.
That needs an illustrator and an asset pipeline.

## Colour and contrast

The palette is Okabe–Ito, readable with every common form of colour blindness,
and colour never carries meaning alone — each tracked point also has its own
shape. The theme is dark because a camera obscura *is* a dark chamber and light
rays only read as light against black; contrast is still held to WCAG 2.2 AA.

## The story: the chapter that left

Position 8 used to be *Les taches de soleil* — a canopy, a gap between two
leaves, and the bright patches it casts on the grass, each of them a picture of
the Sun. The physics was right and the drawing was honest. It was still the
wrong screen, for one reason: it was the only one in the story with no box in
it. A child spent ten screens learning what a dark chamber does, then met a
tree, and then was asked to build a shoebox nobody had ever explained.

It is now *Comment marche ta boîte*: the box of the next chapter, opened along
its length, with every part labelled by the lesson it carries rather than by
its own name — the pinhole sorts the light, the tracing paper is the wall, the
length is the size of the picture, the tape is what keeps it dark. The leak
toggle is the only place in the app that shows what happens when the chamber is
*not* sealed, which is the reason step five of the recipe exists.

The eclipse survived the move, and gained from it: the Moon bites the top of
the Sun and the crescent on the paper is bitten at the bottom. Outdoors, under
a tree, that inversion is invisible — every patch is a picture of the same Sun,
so nothing tells the child which way up it landed. Inside the box, with the
rays crossing at the hole two centimetres away, it is the whole point.

**The cutaway cannot show a crescent**, because a disc seen edge on is a band.
So the band is drawn where the geometry puts it, lit and dark, and a second
panel shows the same paper face on, magnified — both fed by the same
`geometry`, so they cannot disagree. Drawing a circle directly on an edge-on
wall would have been simpler and would have been a lie.

*Would win:* the outdoor version, as a bonus screen **after** *Fabrique la
tienne*, for a child who has already built a box and can be told that the gaps
between the leaves are doing exactly what their pinhole does. It reads as a
reward there, and as a non sequitur where it was.

## Known gaps

Not defects — work that was scoped out and would be worth doing:

- A quiz chapter (tap and drag, no reading required).
- A live camera mode: `getUserMedia` fed through the same pinhole shader.
  Explicit opt-in, local only, no recording.
- An offline PWA, for classrooms with poor wifi.
- An Open Graph image. The metadata itself is already in `index.html`; without
  an image the Twitter card is declared `summary` rather than
  `summary_large_image`, which would otherwise render an empty banner.
- The audio clip filenames are not content-hashed, so a regenerated clip keeps
  its name and any cache will serve the old one until it expires. Nothing in
  this repository sets cache headers — the build is plain static files — so the
  behaviour is entirely the host's. Content-hashing the names would settle it;
  `src/shell/narrationAudio.ts` and `scripts/generate-narration.py` are the two
  ends that would have to agree.
- `scripts/generate-narration.py` cannot regenerate one language on its own. It
  deletes every clip and loops over both locales, and Piper's output is not
  reproducible byte for byte — no seed is exposed, and takes differ by up to
  3 % in length. So editing one French line rewrites 23 English clips as
  different takes of unchanged text, and the only thing standing between that
  and the history is a `git checkout` the docstring now spells out. A `--locale`
  filter would close it. The tests that would catch a filter written wrongly
  already exist and are named for it: `is complete for {locale}`, `has no clip
  left behind by a renamed key`, `holds real audio, not empty files`.
