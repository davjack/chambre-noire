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
const FIGURE_HEIGHT = 150
const LATERAL = [68, 0, -68]
const SIDE_HALF = 100
const TOP_HALF = 96
const MAX_LIFT = 60

export function UpsideDownChapter() {
  const t = useT()
  const [lift, setLift] = useState(45)

  const side = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: 10,
    axisY: 152,
  })
  const top = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: 10,
    axisY: 396,
  })

  return (
    <ChapterShell
      slug="upside-down"
      narrationKey={
        Math.abs(lift) > 20 ? 'chapter.upside-down.say.crossed' : 'chapter.upside-down.say'
      }
      controls={
        <BigSlider
          label={t('chapter.upside-down.height')}
          value={lift}
          min={-MAX_LIFT}
          max={MAX_LIFT}
          step={1}
          onChange={setLift}
        />
      }
    >
      <Scene>
        {/* ── Side view ─────────────────────────────────────────────── */}
        <SceneLabel x={980} y={38} anchor="end">
          {t('chapter.upside-down.sideView')}
        </SceneLabel>
        <Box geometry={side} apertureHeight={10} halfHeight={SIDE_HALF}>
          <BackWall geometry={side} glow={0.1} halfHeight={SIDE_HALF} />
          {LANDMARKS.map((landmark) => (
            <CentreRay
              key={landmark.key}
              geometry={side}
              sourceY={lift + landmark.offset * FIGURE_HEIGHT}
              colour={MARK_COLOURS[landmark.key]}
            />
          ))}
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
        </Box>
        <Figure geometry={side} centreY={lift} height={FIGURE_HEIGHT} />

        <line x1={40} y1={258} x2={960} y2={258} stroke="var(--color-edge)" strokeWidth={2} />

        {/* ── Top view ──────────────────────────────────────────────── */}
        <SceneLabel x={980} y={284} anchor="end">
          {t('chapter.upside-down.topView')}
        </SceneLabel>
        <Box geometry={top} apertureHeight={10} halfHeight={TOP_HALF}>
          <BackWall geometry={top} glow={0.1} halfHeight={TOP_HALF} />
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
          {LATERAL.map((lateral, index) => {
            const landmark = LANDMARKS[index]
            if (!landmark) return null
            const image = top.toSvg({ x: top.boxLength, y: top.landing(lateral, 0) })
            return (
              <Mark
                key={lateral}
                x={image.x + 8}
                y={image.y}
                colour={MARK_COLOURS[landmark.key]}
                shape={landmark.shape}
                size={9}
              />
            )
          })}
        </Box>
        {LATERAL.map((lateral, index) => {
          const landmark = LANDMARKS[index]
          if (!landmark) return null
          const source = top.toSvg({ x: -top.objectDistance, y: lateral })
          return (
            <Mark
              key={lateral}
              x={source.x}
              y={source.y}
              colour={MARK_COLOURS[landmark.key]}
              shape={landmark.shape}
              size={13}
            />
          )
        })}
      </Scene>
    </ChapterShell>
  )
}
