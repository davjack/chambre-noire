import { useState } from 'react'

import {
  BackWall,
  Box,
  CentreRay,
  Figure,
  LANDMARKS,
  MARK_COLOURS,
  ProjectedFigure,
  Scene,
} from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { relativeBrightness } from '../physics/optics'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'
import { Meter } from '../shell/Meter'

/*
 * The second trade: a longer box makes a bigger picture and a darker one.
 *
 * Same light, spread over more wall. The image on the wall is the same figure
 * drawn upside down at `imageHeight`, and its opacity is the real brightness
 * ratio — so growing the picture visibly costs something, rather than being
 * free the way a diagram usually implies.
 */

const OBJECT_DISTANCE = 400
const FIGURE_HEIGHT = 210
const HOLE_MM = 0.4
const MIN_LENGTH = 120
const MAX_LENGTH = 380
const MM_PER_UNIT = 0.5
/**
 * Left of the shared default, because this is the only chapter whose box grows.
 * At the long end it runs `MAX_LENGTH` plus the chamber's back margin past the
 * hole, and from the usual 580 that lands exactly on the edge of the viewBox —
 * a box that reads as cut off by the frame rather than as a long box.
 */
const HOLE_X = 555

export function BoxLengthChapter() {
  const t = useT()
  const [boxLength, setBoxLength] = useState(190)

  const geometry = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength,
    apertureDiameter: 10,
    holeX: HOLE_X,
  })

  // 1 scene unit = 0.5 mm, so the drawn box has a real length and a real
  // f-number. Brightness is quoted relative to the shortest box the slider
  // offers, which is what the child is comparing against.
  const relative =
    relativeBrightness(HOLE_MM, boxLength * MM_PER_UNIT) /
    relativeBrightness(HOLE_MM, MIN_LENGTH * MM_PER_UNIT)

  return (
    <ChapterShell
      slug="box-length"
      narrationKey={boxLength > 260 ? 'chapter.box-length.say.long' : 'chapter.box-length.say'}
      controls={
        <div className="flex flex-col gap-4">
          <BigSlider
            label={t('chapter.box-length.length')}
            value={boxLength}
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            step={2}
            onChange={setBoxLength}
            valueText={t('unit.cm', { value: (boxLength * 0.05).toFixed(1) })}
          />
          <Meter label={t('meter.brightness')} value={relative} colour="var(--color-ray)" />
        </div>
      }
    >
      <Scene>
        <Box geometry={geometry} apertureHeight={10}>
          <BackWall geometry={geometry} glow={0.05 + relative * 0.35} />

          {LANDMARKS.map((landmark) => (
            <CentreRay
              key={landmark.key}
              geometry={geometry}
              sourceY={landmark.offset * FIGURE_HEIGHT}
              colour={MARK_COLOURS[landmark.key]}
              width={2}
            />
          ))}

          {/* The image itself: the same figure, upside down, dimmed by the
              light it actually receives. */}
          <ProjectedFigure
            geometry={geometry}
            height={FIGURE_HEIGHT}
            opacity={0.35 + relative * 0.65}
          />
        </Box>

        <Figure geometry={geometry} centreY={0} height={FIGURE_HEIGHT} />
      </Scene>
    </ChapterShell>
  )
}
