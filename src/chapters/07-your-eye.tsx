import { useState } from 'react'

import {
  Beam,
  Figure,
  LANDMARKS,
  MARK_COLOURS,
  ProjectedFigure,
  Scene,
  SceneLabel,
} from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { brightnessRatio } from '../physics/optics'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * The transfer: you have been carrying one of these around all along.
 *
 * Same geometry object as every other chapter, only the casing is drawn as an
 * eyeball. The pupil is the aperture and it responds to the room light the way
 * a real one does — wide in the dark, narrow in the sun — which quietly
 * replays chapter five on the child's own body.
 *
 * And so does the picture at the back of it: dimmer as the room darkens, and
 * grey once the rods have taken over. For a while it did not, which left the
 * chapter with one control and nothing but the casing answering it.
 */

const HOLE_X = 470
const EYE_DEPTH = 250
const OBJECT_DISTANCE = 340
const FIGURE_HEIGHT = 190
/**
 * Below this the room is dark: the line being read aloud says so, and the
 * picture on the retina has *finished* going grey rather than started. The two
 * have to meet at the end of the drain, not at its beginning — a line that says
 * "tout devient gris" over a picture still plainly coloured is the same defect
 * chapter 2 was corrected for, in the other direction.
 */
const DARK_BELOW = 35
/** How much further up the slider the colour takes to come back in full. */
const COLOUR_SPREAD = 30
/** A real pupil runs about 2 mm to 8 mm; the drawn range keeps the four to one. */
const NARROWEST_PUPIL = 14
const PUPIL_RANGE = 46
const WIDEST_PUPIL = NARROWEST_PUPIL + PUPIL_RANGE

export function YourEyeChapter() {
  const t = useT()
  const [light, setLight] = useState(70)

  const lit = light / 100
  // Bright room, small pupil.
  const pupil = NARROWEST_PUPIL + (1 - lit) * PUPIL_RANGE

  /*
   * Three things the room's light decides, and the reason this chapter has a
   * slider at all. The eye's own anatomy — the ball, the retina, the iris —
   * stays where it is: it is the diagram, not the light.
   *
   * The scale is a rendering choice, of the same kind chapter 6 makes when it
   * dims its image by the light it receives. What `optics.ts` cannot give is a
   * scale: a real retina answers light over about six orders of magnitude and
   * the pupil recovers barely one of them, and no slider running 0 to 100
   * spells that. The *shape* is not a choice, and is read from `optics.ts`
   * below.
   *
   * Two properties the numbers have to keep, both asserted in `e2e/`:
   * `retinaLit` rises with the light everywhere, and it stays under `roomLit`
   * everywhere — in this app's grammar opacity is how much light there is, so a
   * picture drawn brighter than the object it is a picture of would be a claim
   * no other chapter makes.
   */

  /*
   * The room, and everything standing in it to be looked at.
   *
   * The floor is not a taste either: below it the object drops under the 3:1
   * this project holds itself to, measured on the rendered pixels rather than
   * modelled, and axe has no rule that would ever have said so.
   */
  const roomLit = 0.52 + 0.48 * lit

  /*
   * What reaches the back of the eye. It falls with the room — there is simply
   * less light — but on a shallower slope, and the last term is why: the pupil
   * has opened, and light through a hole goes as the square of its diameter.
   * That is the inverse-square law rather than a taste, so it comes from
   * `optics.ts`, which tests it, instead of being spelled out again here.
   *
   * The gap between the two curves narrowing as the room darkens IS the pupil
   * catching up, drawn rather than asserted.
   */
  const retinaLit =
    0.26 +
    0.5 * lit +
    0.22 *
      brightnessRatio(
        { boxLength: EYE_DEPTH, objectDistance: OBJECT_DISTANCE, holeDiameter: pupil },
        WIDEST_PUPIL,
      )

  /*
   * And what is left of its colours. Below `DARK_BELOW` the retina is running
   * on rods, which carry a single pigment and cannot tell one wavelength from
   * another — which is why the world has no colours at night, and why the line
   * read aloud there says so. The beams keep theirs: the light arriving really
   * is coloured, it is the eye that can no longer say so.
   */
  const saturation = Math.max(0, Math.min(1, (light - DARK_BELOW) / COLOUR_SPREAD))

  const geometry = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: EYE_DEPTH,
    apertureDiameter: pupil,
    holeX: HOLE_X,
  })

  const centreX = HOLE_X + EYE_DEPTH / 2
  const radius = EYE_DEPTH / 2 + 34

  return (
    <ChapterShell
      slug="your-eye"
      narrationKey={light < DARK_BELOW ? 'chapter.your-eye.say.dark' : 'chapter.your-eye.say'}
      controls={
        <div className="flex flex-col gap-3">
          <BigSlider
            label={t('chapter.your-eye.light')}
            value={light}
            min={0}
            max={100}
            step={1}
            onChange={setLight}
          />
          <p className="text-center text-base text-muted">{t('chapter.your-eye.brain')}</p>
        </div>
      }
    >
      <Scene>
        {/* Light travels freely up to the pupil and is trapped past it. One
            chapter, one mounted instance, so a fixed id is safe here. */}
        <defs>
          <clipPath id="eye-chamber">
            <rect x={0} y={0} width={HOLE_X} height={520} />
            <circle cx={centreX} cy={geometry.axisY} r={radius - 8} />
          </clipPath>
        </defs>

        {/* The eyeball, drawn around the very same optical geometry. */}
        <circle cx={centreX} cy={geometry.axisY} r={radius} className="fill-chamber" />
        <circle
          cx={centreX}
          cy={geometry.axisY}
          r={radius}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth={6}
        />

        {/* Retina: the wall of this particular dark chamber. */}
        <path
          d={`M ${centreX} ${geometry.axisY - radius + 6}
              A ${radius - 6} ${radius - 6} 0 0 1 ${centreX} ${geometry.axisY + radius - 6}`}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth={16}
          strokeLinecap="round"
        />

        <g clipPath="url(#eye-chamber)" style={{ mixBlendMode: 'screen' }}>
          {LANDMARKS.map((landmark) => (
            <Beam
              key={landmark.key}
              geometry={geometry}
              sourceY={landmark.offset * FIGURE_HEIGHT}
              colour={MARK_COLOURS[landmark.key]}
              /* Their own curve, falling further than `roomLit` does. The floor
                 under `roomLit` is there to keep the object legible, and light
                 in flight carries no identity that needs protecting — while
                 these three converge exactly where the picture is, so any floor
                 left under them is a floor under the background the picture has
                 to be read against. */
              opacity={0.35 * (0.25 + 0.75 * lit)}
            />
          ))}
        </g>

        {/* Iris: two blocks with the pupil between them. */}
        <rect
          x={HOLE_X - 9}
          y={geometry.axisY - 96}
          width={18}
          height={Math.max(0, 96 - pupil / 2)}
          rx={9}
          fill="var(--color-mark-b)"
        />
        <rect
          x={HOLE_X - 9}
          y={geometry.axisY + pupil / 2}
          width={18}
          height={Math.max(0, 96 - pupil / 2)}
          rx={9}
          fill="var(--color-mark-b)"
        />

        {/* The picture at the back of the eye — upside down, like every other
            picture in this app, and the one thing on this screen the child's
            slider is really about.

            Still sharp whatever the pupil is doing, and that is not an
            oversight: an eye is not a pinhole, it has a lens, and opening the
            pupil in a dark room lets more of the world in without smearing it.
            Blurring this the way chapters two and three blur theirs would teach
            a six-year-old that the dark makes them short-sighted. What it does
            instead is what a real retina does — it dims, and it loses its
            colours.

            Outside the chamber clip on purpose, where the three marks it
            replaces also were. That clip is a circle 151 units across and the
            picture's right foot reaches 159, so clipping it takes the foot off
            in a straight line across the middle of the retina — while unclipped
            it lands *on* the retina, which is drawn from 145 to 161. */}
        <ProjectedFigure
          geometry={geometry}
          height={FIGURE_HEIGHT}
          opacity={retinaLit}
          saturation={saturation}
        />

        <Figure
          geometry={geometry}
          centreY={0}
          height={FIGURE_HEIGHT}
          opacity={roomLit}
        />

        <SceneLabel x={HOLE_X} y={geometry.axisY + 150} tone="ray">
          {t('chapter.your-eye.pupil')}
        </SceneLabel>
        <SceneLabel x={centreX + radius + 10} y={geometry.axisY + 6} anchor="start">
          {t('chapter.your-eye.retina')}
        </SceneLabel>
      </Scene>
    </ChapterShell>
  )
}
