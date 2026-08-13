import { useState } from 'react'

import {
  BackWall,
  Beam,
  Box,
  Figure,
  LANDMARKS,
  MARK_COLOURS,
  Mark,
  Scene,
} from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * The heart of the app.
 *
 * The same three points that smeared across the whole wall a moment ago now
 * each land in one place. Nothing was added — light was *removed*. The band
 * each point paints is drawn at exactly `geometricBlur` tall, so watching it
 * collapse to a dot is watching the formula, not an illustration of it.
 */

const OBJECT_DISTANCE = 430
const BOX_LENGTH = 300
const FIGURE_HEIGHT = 250
const SORTED_BELOW = 26

export function TheHoleChapter() {
  const t = useT()
  const [hole, setHole] = useState(220)

  const geometry = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: hole,
  })
  const sorted = hole <= SORTED_BELOW

  return (
    <ChapterShell
      slug="the-hole"
      narration={t(sorted ? 'chapter.the-hole.say.sorted' : 'chapter.the-hole.say')}
      controls={
        <div className="flex flex-col gap-3">
          <BigSlider
            label={t('chapter.the-hole.window')}
            value={hole}
            min={4}
            max={300}
            step={2}
            onChange={setHole}
          />
          {/* Naming the three points is what lets a child say what they see
              instead of only pointing at it. */}
          <ul className="flex justify-center gap-5">
            {LANDMARKS.map((landmark) => (
              <li key={landmark.key} className="flex items-center gap-2 text-sm text-muted">
                <svg viewBox="-16 -16 32 32" className="size-4" aria-hidden="true">
                  <Mark x={0} y={0} colour={MARK_COLOURS[landmark.key]} shape={landmark.shape} size={12} />
                </svg>
                {t(`chapter.the-hole.mark.${landmark.key}`)}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <Scene>
        <BackWall geometry={geometry} glow={0.1} />

        <g style={{ mixBlendMode: 'screen' }}>
          {LANDMARKS.map((landmark) => (
            <Beam
              key={landmark.key}
              geometry={geometry}
              sourceY={landmark.offset * FIGURE_HEIGHT}
              colour={MARK_COLOURS[landmark.key]}
              opacity={0.35}
            />
          ))}
        </g>

        {/* What each point of the object paints on the wall. */}
        {LANDMARKS.map((landmark) => {
          const band = geometry.band(landmark.offset * FIGURE_HEIGHT)
          const top = geometry.toSvg({ x: geometry.boxLength, y: band.top })
          const centre = geometry.toSvg({ x: geometry.boxLength, y: band.centre })
          return (
            <g key={landmark.key}>
              <rect
                x={geometry.wallX}
                y={top.y}
                width={16}
                height={Math.max(2, band.height)}
                fill={MARK_COLOURS[landmark.key]}
                opacity={sorted ? 0.35 : 0.8}
              />
              {sorted ? (
                <Mark
                  x={geometry.wallX + 8}
                  y={centre.y}
                  colour={MARK_COLOURS[landmark.key]}
                  shape={landmark.shape}
                  size={11}
                />
              ) : null}
            </g>
          )
        })}

        <Box geometry={geometry} apertureHeight={hole} />
        <Figure geometry={geometry} centreY={0} height={FIGURE_HEIGHT} />
      </Scene>
    </ChapterShell>
  )
}
