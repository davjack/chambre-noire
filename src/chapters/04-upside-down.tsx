import { useState } from 'react'

import {
  BackWall,
  Box,
  CentreRay,
  Figure,
  LANDMARKS,
  MARK_COLOURS,
  Mark,
  Scene,
  SceneLabel,
} from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * Why the picture is upside down — answered twice, because it happens twice.
 *
 * The side view shows top and bottom swapping. The top view, directly below
 * it, shows left and right swapping in exactly the same way. Seeing the same
 * crossing from two angles is what turns "it's upside down" into "of course it
 * is": the rays cross at the hole, and every axis through that point flips.
 */

const OBJECT_DISTANCE = 400
const BOX_LENGTH = 260
const FIGURE_HEIGHT = 170
const LATERAL = [76, 0, -76]

export function UpsideDownChapter() {
  const t = useT()
  const [lift, setLift] = useState(55)

  const side = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: 10,
    axisY: 130,
  })
  const top = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: 10,
    axisY: 390,
  })

  return (
    <ChapterShell
      slug="upside-down"
      narration={t(
        Math.abs(lift) > 20 ? 'chapter.upside-down.say.crossed' : 'chapter.upside-down.say',
      )}
      controls={
        <BigSlider
          label={t('chapter.upside-down.height')}
          value={lift}
          min={-90}
          max={90}
          step={1}
          onChange={setLift}
        />
      }
    >
      <Scene>
        {/* ── Side view ─────────────────────────────────────────────── */}
        <SceneLabel x={20} y={30} anchor="start">
          {t('chapter.upside-down.sideView')}
        </SceneLabel>
        <BackWall geometry={side} glow={0.1} halfHeight={112} />
        {LANDMARKS.map((landmark) => (
          <CentreRay
            key={landmark.key}
            geometry={side}
            sourceY={lift + landmark.offset * FIGURE_HEIGHT}
            colour={MARK_COLOURS[landmark.key]}
          />
        ))}
        <Box geometry={side} apertureHeight={10} halfHeight={112} />
        <Figure geometry={side} centreY={lift} height={FIGURE_HEIGHT} />
        {LANDMARKS.map((landmark) => {
          const y = side.landing(lift + landmark.offset * FIGURE_HEIGHT, 0)
          const point = side.toSvg({ x: side.boxLength, y })
          return (
            <Mark
              key={landmark.key}
              x={point.x + 8}
              y={point.y}
              colour={MARK_COLOURS[landmark.key]}
              shape={landmark.shape}
              size={9}
            />
          )
        })}

        <line x1={40} y1={258} x2={960} y2={258} stroke="var(--color-edge)" strokeWidth={2} />

        {/* ── Top view ──────────────────────────────────────────────── */}
        <SceneLabel x={20} y={296} anchor="start">
          {t('chapter.upside-down.topView')}
        </SceneLabel>
        <BackWall geometry={top} glow={0.1} halfHeight={104} />
        {LATERAL.map((lateral, index) => {
          const landmark = LANDMARKS[index]
          if (!landmark) return null
          return (
            <CentreRay
              key={lateral}
              geometry={top}
              sourceY={lateral}
              colour={MARK_COLOURS[landmark.key]}
            />
          )
        })}
        <Box geometry={top} apertureHeight={10} halfHeight={104} />
        {LATERAL.map((lateral, index) => {
          const landmark = LANDMARKS[index]
          if (!landmark) return null
          const source = top.toSvg({ x: -top.objectDistance, y: lateral })
          const image = top.toSvg({ x: top.boxLength, y: top.landing(lateral, 0) })
          return (
            <g key={lateral}>
              <Mark
                x={source.x}
                y={source.y}
                colour={MARK_COLOURS[landmark.key]}
                shape={landmark.shape}
                size={13}
              />
              <Mark
                x={image.x + 8}
                y={image.y}
                colour={MARK_COLOURS[landmark.key]}
                shape={landmark.shape}
                size={9}
              />
            </g>
          )
        })}
      </Scene>
    </ChapterShell>
  )
}
