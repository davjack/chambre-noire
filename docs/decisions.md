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

## How sharp the picture is allowed to be

The two chapters that run the shader draw a world into an offscreen canvas and
magnify it onto the back wall. Two separate things were making that picture
soft, and only one of them was physics.

**The texture was 640 × 480, whatever the screen showed.** On a 1244-pixel
canvas every texel was magnified 1.94 times, which put a bilinear ramp on every
edge in the scene — softness indistinguishable by eye from the blur of a wider
hole, on the two screens whose whole subject is how sharp a pinhole can be. It
is now drawn at 1024 or 2048 texels, picked from the canvas: 2048 is the floor
OpenGL ES 3.0 puts under `MAX_TEXTURE_SIZE`, so it needs no runtime query and no
fallback, and a phone does not carry the 12.6 MB a 2048 × 1536 texture costs to
hold texels it cannot show. Measured on the horizon edge of chapter 0, on a
1079-pixel picture, both changes together took the 10–90 % ramp from 3.95 px to
1.64 px — and 1.64 px is what the optics alone predict.

*Rejected: a raster asset at high resolution.* It would have to be authored,
optimised, cached and kept consistent with the SVG chapters, and the code that
draws it instead is forty lines that weigh nothing. *Would win* if the scene
ever needed to be a photograph.

*Rejected: refitting the texture to the canvas on every resize.* Two tiers give
at least a texel per pixel over the range that matters, and tracking the resize
would mean rebuilding the renderer from the `ResizeObserver` — the exact thing
that observer is careful not to do. The cap is a cap, though: a 1440p or 5K
screen at device-pixel-ratio 2 can ask for 2100 to 2500 pixels of picture and
still get 2048 texels. That is a magnification of 1.03 to 1.2, well under the
1.94 this replaced, and 2048 is the largest texture WebGL2 guarantees — so the
answer there is the cap, not the tiers. *Would win* if a chapter ever animated
the size of the picture.

**The opening screen modelled an eleven-centimetre box.** At the best possible
hole, a box that size blurs by 0.64 % of the wall's height: a visibly soft
picture, and the honest answer for a shoebox. But the shader maps the whole
scene onto the whole wall whatever the geometry, and that screen pins its
exposure to 1 — the eye of someone who has been standing in the chamber a while
— so those numbers set exactly one thing: how blurred the picture is. Scaling
the box and the wall together keeps the framing and divides the relative blur by
the square root of the factor. The opening is
now a two-metre chamber, at 0.16 %. That is not a thumb on the scale: it is the
reason a walk-in camera obscura is sharper than a shoebox, and it is the object
this app is named after.

**The objection this left open, and how it was settled.** Chapter 5 still models
a 10 cm box, so the sharpest picture it can reach stays several times softer than
the opening screen — and a reader did notice, and read it as the old blurry
texture having survived on that chapter. It had not; measured on the live site,
the ramp of the horizon edge came to 0.152 % of the picture height on chapter 0
against 0.555 % on chapter 5 *at its sweet spot* — but 1.377 % where the slider
actually opened, which is what was being looked at.

The second number was the answer. The slider used to start at 0.75 of its track,
a 1.58 mm hole against an optimum of 0.36, so the chapter opened on a smear nine
times softer than chapter 0 and read as a fault rather than as the wide end of a
trade. It now opens on the optimum, which is where the mark on the track already
pointed: 0.555 %, and the line read aloud on arrival says "Là, c'est le plus net
possible !"

The first number cannot be answered. At the best hole the geometric and the
diffraction terms are equal, so the total is `√(4.88·λ·f·k)` with
`k = (f + u) / u` — 2.24·√(λf) for chapter 5, where `k` is 1.025. Over the wall,
holding a chapter's own wall-to-box ratio **and its `k`**, that falls as `1/√f`:
the only lever is a bigger box, and it pays as a square root.

The two chapters are not quite the same shape — chapter 5 puts its wall at 0.80
of its box, chapter 0 at 0.75 — so the comparison is between the models rather
than along one curve: **0.656 % of the wall for chapter 5 against 0.160 % for
chapter 0**, a factor 4.1, so `f × 16.8`.

That gives a **1.7 m chamber only if the subject moves back with the box**, which
is what chapter 0 does — its house stands at 30 m for a 2 m box, fifteen box
lengths away, exactly as chapter 5's stands at 4 m for 100 mm. Grow the box alone
and `k` grows with it, the `1/√f` law stops holding, and the answer is worse:
with the house left at 4 m, matching chapter 0 takes **2.8 m of box**. Either
way the number is metres, and the point stands.

(Measured on screen the two chapters come out at 0.555 % and 0.152 %; the ramp of
an edge is a proxy for the blur, not the blur, and the two canvases are different
sizes, so the model is what the arithmetic above uses.)

Chapter 5 is deliberately a box you can hold, which chapter 6 (60 to 190 mm),
chapter 8 and chapter 9 all depend on. Asked to choose, the reader chose
coherence. The residual gap is the physics, and it is what chapter 6 exists to
teach.

*Rejected on the way:* growing chapter 5 to a shoebox's 300 mm — 1.4× for a box
that would then sit outside its own neighbour's range; and raising the wall
without the box, which works arithmetically and would put the field of view at
100° with nothing on screen to say so.

**And then it turned out to be a sharpness problem after all.** The box that was
modelled and the box that is prescribed were not the same object: chapter 9 has
the child build a shoebox, about 300 mm along the axis, while chapter 6 stopped
at 190 and chapter 5 modelled 100. Recorded here as tidiness, out of scope, worth
its own change one day.

It was worth more than that. The blur at the best hole falls as the box grows, so
those three chapters disagreeing about the size were also the reason chapter 5
looked broken beside chapter 0. Chapter 5 now models 300 mm with a 240 mm wall —
the same 0.8 ratio, so the framing does not move — and chapter 6 reads out 12 to
38 cm instead of 6 to 19, which is a relabelling and nothing more: its scene
units are unchanged, and `MM_PER_UNIT` cancels out of its brightness meter, which
was checked in pixels rather than argued from the algebra. The best hole moves
from 0.36 mm to 0.63 mm, which is the better answer for a shoebox and still a
needle.

Measured at the screen size the report came from: the horizon edge on chapter 5
went from **0.552 % of the picture height to 0.289 %**, against 0.174 % on
chapter 0. The gap that was 3.1× is 1.7×.

**Open objection, and it is the one that keeps coming back:** 1.7× is still
visible if the two screens are compared side by side. Nothing coherent closes it
— a hand-held box cannot reach a two-metre chamber, and the arithmetic above says
by how much. *Would win* the day the answer is judged to be parity rather than
coherence, at which point chapter 5 stops being the box chapters 6, 8 and 9
describe.

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

## The picture on the wall, in every diagram that has a box

Five chapters put the little person in front of a box. Until now exactly one of
them — *Boîte courte ou longue* — drew his picture inside it; the others put
three coloured shapes on the wall and left the child to work out that the shapes
were him. That is the one inference this app exists to spare them, and a reader
said so: *son image projetée n'est presque jamais représentée sur l'écran dans
la boîte*.

`ProjectedFigure` now draws it everywhere, from `imagePlacement`, so the picture
and the rays reaching it are one claim about one box rather than two. Where the
shapes used to be drawn separately they were removed: the figure carries its own
three landmarks, at exactly the points the separate ones occupied.

**It is blurred where the aperture is what the child is moving** — chapters 2 and
3 — by the height of the band one point of the object paints, spelled as a
Gaussian of a quarter of that (the standard deviation of a uniform disc of that
diameter). And it fades to nothing once that band is taller than the picture is,
which is what keeps chapter 2 honest: at the wide end there is no picture and
none is drawn. That threshold is also where the narration changes, and not by
coincidence — `WIDE_ENOUGH` is computed from it, so the line that says the wall
is starting to show something is spoken at the window where it starts to.

**The blur spreads vertically only**, and that is the more correct answer rather
than the cheaper one. These are side views: the wall is seen edge on, so the disc
the hole paints on it appears as a vertical segment — which is exactly how
chapter 3 draws its bands and chapter 8 its lit strip. Blurring sideways as well
was spreading the picture through the thickness of the wall, and it cost
something real: an `feGaussianBlur` is cropped to its filter region, whose margin
scales with the bounding box while the blur scales with the picture's height, so
around a fifty-unit hole in chapter 3 the horizontal half of the smear ended in
two straight vertical edges. A wider region would have hidden that; taking the
horizontal spread out removes it.

**It is not blurred in *Ton œil est une boîte noire*.** An eye has a lens. A
wide pupil in a dark room lets more of the world in without smearing it, and
blurring the retina the way chapters 2 and 3 blur their walls would teach a
six-year-old that the dark makes them short-sighted.

That was settled correctly and then read as licence to make it answer nothing at
all: the chapter has one control, and the picture the chapter is *about* was the
only thing on screen that ignored it. `e2e/smoke.spec.ts` already had a name for
that — *a picture that did not answer the control* — and a test for it on chapter
8, and none here. It now does two things as the room darkens, both of them what a
real retina does:

- **It dims, on a shallower slope than the room.** The gap between the two curves
  is the pupil's compensation, drawn instead of asserted — which is what the line
  being read aloud had been claiming on its own.
- **It loses its colours.** Rods carry a single pigment: *"Rods are more
  abundant, contain greater photopigment, have high sensitivity with lower visual
  acuity, and are achromatic, referring to using a singular photopigment,
  rhodopsin"*
  ([NIH StatPearls, *Physiology, Night Vision*](https://www.ncbi.nlm.nih.gov/books/NBK545246/)).
  The beams keep their colour on the way in, because the light really is
  coloured — it is the eye that can no longer say so. The narrated line changed
  with the picture, because a child who cannot read has to be told what they are
  watching happen.

The curves live in `src/chapters/eyeLight.ts` rather than in the chapter, next to
their test, for the reason chapter 8 keeps `eclipseImage` out of the chapter that
draws it: the numbers invite retuning, and three of the properties they have to
keep — the picture brightens with the room, it never outshines the object, the
colour has finished draining where the narration says it has — were each wrong at
some point while the chapter was being built, with nothing failing.

Both curves have floors, and the floors are not taste. Measured on the rendered
pixels — the filter runs in linear RGB, so modelling it in sRGB gets the answer
wrong — the object at its first floor came out at 2.1:1 against the page, under
the 3:1 this project claims in `styles.css`, and axe has no rule for the stroke
of an SVG that would ever have said so. **The object and the picture** measure
3.3:1 or better at every position of the slider; the dimming that survives those
floors is the lesson.

The beams do not, and never have on any screen of this app: around 1.2:1, because
translucent light that adds up where it overlaps is what they are for. They were
briefly given a curve of their own, falling faster than the room, to darken the
background the picture is read against — which drew the light crossing the room
dimming faster than the room itself, on the screen whose narrated line says the
pupil is opening to catch more of it. They are a fixed share of `room` again, a
smaller one; the floor belongs under the picture, not under the light.

**Rejected: brightness from real retinal illuminance**, luminance × pupil area.
With this chapter's linear pupil (four to one in diameter over a slider running
0 to 100) that curve is not monotone — it peaks near the middle, so the picture
would brighten as the child turns the light *off*. Honest arithmetic, dishonest
result, because the slider is not a photometric scale. *Would win* the day the
light control becomes logarithmic, which is what it would take to spell the six
orders of magnitude a real retina answers over.

**Rejected: a button that turns the retinal picture the right way up**, to
illustrate the line about the brain that this chapter states and never shows.
The image on the retina never turns around; only the interpretation does, so
drawing it rotating would be exactly the convenient lie chapter 8 refuses.
*Would win* as a second face-on panel in chapter 8's style — which is a screen,
not a prop.

**Open objection, and it is the real one:** in a side cutaway the back wall is
seen edge on, and a picture painted on it is a band, not a figure. *Comment
marche ta boîte* refuses that lie explicitly — it draws the eclipse as a lit
strip in the cutaway and puts the crescent in a second panel, face on, because
there the *shape* of the picture is the entire lesson. Here the lesson is where
the picture lands and how big it is, both of which survive being drawn face on,
and the recognisable little person is what carries it to a six-year-old. *Would
win* on any chapter whose point becomes the shape of the image — that chapter
needs chapter 8's second panel, not this.

The chamber runs 40 units past the back wall rather than 18, because a figure
has arms: they reach 0.19 of its height either side, and the old margin cut one
of them off flush at the longest box chapter 6 offers. That margin is a `Box`
prop rather than one shared constant, because it does two jobs — how much room
the picture needs, and how far past the wall the chamber is drawn — and *Comment
marche ta boîte* only cares about the second: it paints no figure on its wall,
and the wider chamber ran the box's rails under the face-on panel it keeps
deliberately separate. It asks for `BOX_BACK_MARGIN_BARE`. Chapter 6, whose box
grows, draws from `holeX = 555` so the long end stops short of the frame instead
of on it.

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
