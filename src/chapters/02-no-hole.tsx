import { useState } from 'react'

import {
  BackWall,
  Beam,
  Box,
  Figure,
  LANDMARKS,
  MARK_COLOURS,
  ProjectedFigure,
  Scene,
} from '../engine/RayDiagram'
import { createGeometry, pictureFade } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * Idea two: an open window gives no picture at all.
 *
 * This is the step most explanations skip, and it is the one that makes the
 * hole surprising. Each point of the object floods the whole wall; the beams
 * are drawn with `screen` blending so overlapping light really does add up to
 * white, exactly as it does on a real wall. Narrow the window and the white
 * separates back into colours — which is the next chapter, previewed.
 */

const OBJECT_DISTANCE = 430
const BOX_LENGTH = 300
const FIGURE_HEIGHT = 250
/**
 * Above this the window is open as wide as the chapter goes and the line says
 * so. The slider starts below it, so the opening line is the one about every
 * point lighting the whole wall — which is what the wall is showing at 300.
 */
const UNTOUCHED_ABOVE = 340
/*
 * There is no threshold constant for "the wall is showing something again": the
 * chapter asks `pictureFade` how much of him survives, which is the number
 * `ProjectedFigure` draws him with. It used to be a round 150 while the drawing
 * stopped at 102.7, so for fifty units of the slider the line being read aloud
 * promised a picture the wall was not yet showing.
 */
const WASH_POINTS = [
  -0.45, -0.375, -0.3, -0.225, -0.15, -0.075, 0, 0.075, 0.15, 0.225, 0.3, 0.375, 0.45,
]

export function NoHoleChapter() {
  const t = useT()
  const [windowSize, setWindowSize] = useState(300)

  const geometry = createGeometry({
    objectDistance: OBJECT_DISTANCE,
    boxLength: BOX_LENGTH,
    apertureDiameter: windowSize,
  })

  // How much of him the wall is showing — the same number the picture is drawn
  // with, so what is said and what is on screen change together.
  const picture = pictureFade(geometry.band(0).height, geometry.imageHeight(FIGURE_HEIGHT))

  // Three plainly named bands, in the order the child crosses them.
  const narration =
    windowSize > UNTOUCHED_ABOVE
      ? 'chapter.no-hole.say'
      : picture > 0
        ? 'chapter.no-hole.say.narrow'
        : 'chapter.no-hole.say.wide'

  return (
    <ChapterShell
      slug="no-hole"
      narrationKey={narration}
      controls={
        <BigSlider
          label={t('chapter.no-hole.window')}
          value={windowSize}
          min={20}
          max={380}
          step={2}
          onChange={setWindowSize}
        />
      }
    >
      <Scene>
        <Box geometry={geometry} apertureHeight={windowSize}>
          <BackWall geometry={geometry} glow={0.1} />
          <g style={{ mixBlendMode: 'screen' }}>
            {/* A real object emits from every point of itself, not from three.
                These pale beams are the rest of the figure, and they are what
                actually washes the wall out — with only the three landmarks the
                overlap stays patchy and the chapter's claim goes unproven. */}
            {WASH_POINTS.map((offset) => (
              <Beam
                key={offset}
                geometry={geometry}
                sourceY={offset * FIGURE_HEIGHT}
                colour="#eaf1f8"
                opacity={0.16}
              />
            ))}
            {LANDMARKS.map((landmark) => (
              <Beam
                key={landmark.key}
                geometry={geometry}
                sourceY={landmark.offset * FIGURE_HEIGHT}
                colour={MARK_COLOURS[landmark.key]}
                opacity={0.25}
              />
            ))}
          </g>

          {/* The picture that is not there. Every point of him is spread over a
              band taller than he is, so `ProjectedFigure` fades him to nothing
              — and he starts coming back at the window where `picture` above
              leaves zero, which is the window the narration changes at. */}
          <ProjectedFigure
            geometry={geometry}
            height={FIGURE_HEIGHT}
            blur={geometry.band(0).height}
          />
        </Box>
        <Figure geometry={geometry} centreY={0} height={FIGURE_HEIGHT} />
      </Scene>
    </ChapterShell>
  )
}
