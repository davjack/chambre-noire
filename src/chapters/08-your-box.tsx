import { useState } from 'react'

import {
  BackWall,
  Box,
  CentreRay,
  Scene,
  SceneLabel,
  WALL_THICKNESS,
  boxInnerWidth,
} from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
import { eclipseImage } from './eclipse'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * The box the next chapter tells the child to build, opened along its length.
 *
 * This is where the nine ideas become one object: the pinhole is the hole that
 * sorts the light, the tracing paper is the wall, the length of the box is the
 * size of the picture, and the tape is what keeps the chamber dark. Each part
 * is labelled with the lesson it carries rather than with its own name.
 *
 * It is pointed at the Sun on purpose. A pinhole box is the way an eclipse is
 * watched without looking at it — the reason the safety line under the slider
 * is not decoration — and an eclipse is the one subject that proves the
 * picture on the paper is a picture: bite the Sun at the top and the crescent
 * on the paper is bitten at the bottom, because the rays crossed at the hole.
 *
 * The cutaway shows the paper edge on, so the crescent cannot be drawn there:
 * a side view of a disc is a band, and drawing a circle on an edge-on wall
 * would be the kind of convenient lie this app does not tell. The band IS
 * drawn, lit and dark exactly where the geometry says, and the panel on the
 * right is the same paper seen face on, magnified. Both read their numbers
 * from `geometry`, and the callout that ties them together lands on the edges
 * of the picture in each view — so the magnification it claims is the
 * magnification the panel actually draws.
 */

const OBJECT_DISTANCE = 300
const BOX_LENGTH = 210
const HOLE_X = 470
const BOX_HALF_HEIGHT = 150
const APERTURE = 8
const SUN_RADIUS = 78
/** The Moon is very slightly the bigger disc in the sky — which is why totality exists. */
const MOON_RATIO = 1.02

/** The tracing paper seen face on: where the crescent can actually be shown. */
const PANEL = { x: 716, y: 130, size: 260 }
/** Fraction of the panel the Sun's picture fills, magnified from the real one. */
const PANEL_FILL = 0.34

/** Along the box, as fractions of its length: three strips of tape per seam. */
const TAPE_AT = [0.16, 0.5, 0.84]
/** Which of them comes off when the child makes a leak — by position, not by
 *  value: comparing the fractions works only while one of them stays exactly
 *  0.5, and the day it does not the tape stays on over an open seam. */
const LEAK_INDEX = 1

export function YourBoxChapter() {
  const t = useT()
  const [phase, setPhase] = useState(0)
  const [leaking, setLeaking] = useState(false)

  const geometry = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: APERTURE,
    holeX: HOLE_X,
  })
  const { axisY, holeX, wallX } = geometry

  // Distance between the centres of the Sun and the Moon, in Sun radii: the
  // two discs are just touching at phase 0 and deeply overlapped at phase 1.
  // The Moon rides above the axis, so the bite is at the top of the Sun — and,
  // past the hole, at the bottom of the picture.
  //
  // The upper bound is not a taste: any further out and the Moon leaves the
  // top of the frame, which reads as a bug rather than as a Moon on its way.
  const separation = 2.05 - 1.7 * phase
  const moonCentreY = SUN_RADIUS * separation
  const moonRadius = SUN_RADIUS * MOON_RATIO

  // Everything on the image side is the geometry's answer, inversion included.
  // It lives in `eclipse.ts` because it is the part of this chapter that can
  // quietly stop agreeing with the physics, and a unit test holds it there.
  const {
    imageRadius,
    moonImageRadius,
    moonImageCentre,
    litTop,
    litBottom,
    shadowTop,
    shadowHeight,
  } = eclipseImage(geometry, { sunRadius: SUN_RADIUS, moonRadius, moonCentreY })

  const sun = geometry.toSvg({ x: -OBJECT_DISTANCE, y: 0 })
  const moon = geometry.toSvg({ x: -OBJECT_DISTANCE, y: moonCentreY })
  const top = axisY - BOX_HALF_HEIGHT
  const bottom = axisY + BOX_HALF_HEIGHT
  const boxLengthPx = wallX - holeX
  const tapeX = (fraction: number) => holeX + boxLengthPx * fraction
  const gapX = tapeX(TAPE_AT[LEAK_INDEX] ?? 0.5)

  // The same picture, face on and magnified — the only view in which a
  // crescent is a crescent. The scale is a drawing choice, not an optical
  // quantity; what is not a choice is that the callout below has to land on
  // the edges this scale produces.
  const panelScale = (PANEL.size * PANEL_FILL) / imageRadius
  const panelCx = PANEL.x + PANEL.size / 2
  const panelCy = PANEL.y + PANEL.size / 2
  /**
   * A scene height, placed inside the panel. The panel has its own origin, so
   * `toSvg` cannot express this — but writing `panelCy - value * panelScale`
   * at each of the four places that need it is four chances to drop the sign,
   * on the one view where a sign error inverts the lesson.
   */
  const onPanel = (sceneY: number) => panelCy - sceneY * panelScale

  const narrationKey = leaking
    ? 'chapter.your-box.say.leak'
    : phase > 0.1
      ? 'chapter.your-box.say.eclipse'
      : 'chapter.your-box.say'

  return (
    <ChapterShell
      slug="your-box"
      narrationKey={narrationKey}
      controls={
        <div className="flex flex-col gap-3">
          <BigSlider
            label={t('chapter.your-box.eclipse')}
            value={phase}
            min={0}
            max={1}
            step={0.01}
            onChange={setPhase}
          />
          {/* The label says what the next press does, so it carries no
              `aria-pressed`: a screen reader would announce "make a leak,
              pressed", which states the opposite of what is on the screen. */}
          <button
            type="button"
            className="pill self-center"
            data-variant={leaking ? 'primary' : undefined}
            onClick={() => setLeaking((current) => !current)}
          >
            {t(leaking ? 'chapter.your-box.seal' : 'chapter.your-box.leak')}
          </button>
          {/* Small on purpose: it is a rule to follow outdoors, not the lesson
              of the chapter, and every pixel it takes comes off the picture on
              the shortest viewports. */}
          <p className="text-center text-sm text-muted">{t('chapter.your-box.safety')}</p>
        </div>
      }
    >
      <Scene>
        <defs>
          <radialGradient id="your-box-halo">
            <stop offset="0%" stopColor="var(--color-glow)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-glow)" stopOpacity="0" />
          </radialGradient>
          {/* One chapter, one mounted instance, so a fixed id is safe here. */}
          <clipPath id="your-box-screen">
            <rect x={PANEL.x} y={PANEL.y} width={PANEL.size} height={PANEL.size} rx={18} />
          </clipPath>
        </defs>

        {/* ── The Sun ─────────────────────────────────────────────────────── */}
        <circle cx={sun.x} cy={sun.y} r={SUN_RADIUS * 1.9} fill="url(#your-box-halo)" />
        <circle cx={sun.x} cy={sun.y} r={SUN_RADIUS} fill="var(--color-ray)" />

        {/* ── The box, opened along its length ────────────────────────────── */}
        <Box geometry={geometry} apertureHeight={APERTURE} halfHeight={BOX_HALF_HEIGHT}>
          <BackWall geometry={geometry} glow={leaking ? 0.6 : 0.15} halfHeight={BOX_HALF_HEIGHT} />

          {/* The two rays that bracket the picture: from the top and bottom
              edges of the Sun, through the hole, to the two ends of the lit
              strip. The crossing is the same crossing as every other chapter. */}
          {[SUN_RADIUS, -SUN_RADIUS].map((edge) => (
            <CentreRay
              key={edge}
              geometry={geometry}
              sourceY={edge}
              colour="var(--color-ray)"
              width={2}
            />
          ))}

          {/* The strip the picture makes on the paper, seen edge on, with the
              part the Moon has taken away drawn dark over it. The pair fades
              together when the box leaks — fading only the lit half would
              leave the bite drawn crisply on a picture that is meant to be
              drowning. */}
          <g opacity={leaking ? 0.2 : 1}>
            {/* Height from the two screen ends, not from twice the scene-side
                radius: those agree only while `toSvg` keeps a scale of one,
                and `geometry.ts` says in its own header that a schematic scale
                is unavoidable. Mixing the two frames is what this chapter has
                already been corrected for once. */}
            <rect
              x={wallX}
              y={litTop}
              width={WALL_THICKNESS}
              height={litBottom - litTop}
              fill="var(--color-ray)"
              opacity={0.95}
            />
            <rect
              x={wallX}
              y={shadowTop}
              width={WALL_THICKNESS}
              height={shadowHeight}
              fill="var(--color-wall)"
            />
          </g>

          {/* A seam has come open: light walks in, floods the chamber and the
              picture drowns in it — chapter two, on the child's own box. */}
          {leaking ? (
            <g style={{ mixBlendMode: 'screen' }}>
              <polygon
                points={`${gapX - 20},${top} ${gapX + 20},${top} ${gapX + 190},${bottom} ${gapX - 110},${bottom}`}
                fill="var(--color-ray)"
                opacity={0.32}
              />
              {/* Light bounces off the sides too, so the whole chamber lifts —
                  but faintly: a flat wash as strong as the shaft would hide the
                  shaft, and the shaft is the part that says where it gets in. */}
              <rect
                x={holeX}
                y={top}
                width={boxInnerWidth(geometry)}
                height={BOX_HALF_HEIGHT * 2}
                fill="var(--color-ray)"
                opacity={0.07}
              />
            </g>
          ) : null}
        </Box>

        {/* The Moon, drawn after the rays that leave the Sun rather than before
            them. Both rays start on the Sun's limb, and once the Moon is well
            over it they start *inside* the Moon: painted underneath, they read
            as light coming out of the disc whose whole job on this screen is to
            block it. The chapter this one replaced had the same order for the
            same reason. */}
        <circle
          cx={moon.x}
          cy={moon.y}
          r={moonRadius}
          fill="var(--color-night)"
          stroke="var(--color-edge)"
          strokeWidth={2}
        />

        {/* Kitchen foil over the front: the same object the next chapter puts
            on the shopping list. Drawn after the box, over its front wall. */}
        <g stroke="var(--color-muted)" strokeWidth={2} opacity={0.5}>
          {[top + 34, top + 74, bottom - 74, bottom - 34].map((y) => (
            <path key={y} d={`M ${holeX - 5} ${y} l 10 -16`} />
          ))}
        </g>

        {/* The tape, strip by strip — and the one that came off. */}
        {TAPE_AT.map((fraction, index) => (
          <g key={fraction} fill="var(--color-muted)" opacity={0.75}>
            {leaking && index === LEAK_INDEX ? null : (
              <rect x={tapeX(fraction) - 16} y={top - 11} width={32} height={14} rx={4} />
            )}
            <rect x={tapeX(fraction) - 16} y={bottom - 3} width={32} height={14} rx={4} />
          </g>
        ))}
        {leaking ? (
          <rect x={gapX - 16} y={top - 9} width={32} height={10} fill="var(--color-night)" />
        ) : null}

        {/* ── The paper, face on: where a crescent looks like a crescent ──── */}
        <g
          stroke="var(--color-edge)"
          strokeWidth={2}
          strokeDasharray="6 6"
          opacity={0.7}
          fill="none"
        >
          {/* On the edges of the picture at both ends, not on the corners of
              the panel: the corners would claim the panel is the picture, and
              draw a magnification the panel does not use. */}
          <path d={`M ${wallX + WALL_THICKNESS} ${litTop} L ${PANEL.x} ${onPanel(imageRadius)}`} />
          <path d={`M ${wallX + WALL_THICKNESS} ${litBottom} L ${PANEL.x} ${onPanel(-imageRadius)}`} />
        </g>
        <rect
          x={PANEL.x}
          y={PANEL.y}
          width={PANEL.size}
          height={PANEL.size}
          rx={18}
          fill="var(--color-wall)"
          stroke="var(--color-edge)"
          strokeWidth={4}
        />
        <g clipPath="url(#your-box-screen)">
          {/* The picture fades as a whole. Fading the bite on its own would
              fill the crescent back in, which is the opposite of what a leak
              does to it. */}
          <g opacity={leaking ? 0.2 : 1}>
            {/* The two `data-testid`s are the only test hooks in the app, and
                they earn it: this pair is the one place a crescent is drawn,
                the sign that puts the bite at the bottom is written by hand
                here, and reading the pixels cannot tell a bite at the bottom
                from a bite at the top. */}
            <circle
              data-testid="paper-sun"
              cx={panelCx}
              cy={onPanel(0)}
              r={imageRadius * panelScale}
              fill="var(--color-ray)"
            />
            <circle
              data-testid="paper-moon"
              cx={panelCx}
              cy={onPanel(moonImageCentre)}
              r={moonImageRadius * panelScale}
              fill="var(--color-wall)"
            />
          </g>
          {leaking ? (
            <rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.size}
              height={PANEL.size}
              fill="var(--color-ray)"
              opacity={0.18}
            />
          ) : null}
        </g>

        {/* ── What each part is for ───────────────────────────────────────── */}
        {/* The seam label follows the seam. Left on "taped shut" while the
            chamber is flooding, it would contradict both the picture and the
            line being read aloud. */}
        <SceneLabel x={holeX} y={top - 22} anchor="start" tone={leaking ? 'ray' : 'muted'}>
          {t(leaking ? 'chapter.your-box.tapeOpen' : 'chapter.your-box.tape')}
        </SceneLabel>
        <SceneLabel x={panelCx} y={PANEL.y + PANEL.size + 30} tone="ink">
          {t('chapter.your-box.screen')}
        </SceneLabel>
        <SceneLabel x={holeX} y={bottom + 46} tone="ray">
          {t('chapter.your-box.hole')}
        </SceneLabel>
        <SceneLabel x={holeX + boxLengthPx / 2} y={bottom + 86}>
          {t('chapter.your-box.length')}
        </SceneLabel>
      </Scene>
    </ChapterShell>
  )
}
