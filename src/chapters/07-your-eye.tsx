import { useState } from 'react'

import { Beam, Figure, LANDMARKS, MARK_COLOURS, Mark, Scene, SceneLabel } from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * The transfer: you have been carrying one of these around all along.
 *
 * Same geometry object as every other chapter, only the casing is drawn as an
 * eyeball. The pupil is the aperture and it responds to the room light the way
 * a real one does — wide in the dark, narrow in the sun — which quietly
 * replays chapter five on the child's own body.
 */

const HOLE_X = 470
const EYE_DEPTH = 250
const OBJECT_DISTANCE = 340
const FIGURE_HEIGHT = 190

export function YourEyeChapter() {
  const t = useT()
  const [light, setLight] = useState(70)

  // Bright room, small pupil. A real pupil runs about 2 mm to 8 mm; the drawn
  // range keeps the same four-to-one span.
  const pupil = 14 + (1 - light / 100) * 46

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
      narration={t(light < 35 ? 'chapter.your-eye.say.dark' : 'chapter.your-eye.say')}
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
          stroke="var(--color-wall)"
          strokeWidth={14}
          strokeLinecap="round"
        />

        <g style={{ mixBlendMode: 'screen' }}>
          {LANDMARKS.map((landmark) => (
            <Beam
              key={landmark.key}
              geometry={geometry}
              sourceY={landmark.offset * FIGURE_HEIGHT}
              colour={MARK_COLOURS[landmark.key]}
              opacity={0.3}
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

        {LANDMARKS.map((landmark) => {
          const y = geometry.landing(landmark.offset * FIGURE_HEIGHT, 0)
          const point = geometry.toSvg({ x: geometry.boxLength, y })
          return (
            <Mark
              key={landmark.key}
              x={point.x}
              y={point.y}
              colour={MARK_COLOURS[landmark.key]}
              shape={landmark.shape}
              size={9}
            />
          )
        })}

        <Figure geometry={geometry} centreY={0} height={FIGURE_HEIGHT} />

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
