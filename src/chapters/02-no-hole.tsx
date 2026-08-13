import { useState } from 'react'

import { BackWall, Beam, Box, Figure, LANDMARKS, MARK_COLOURS, Scene } from '../engine/RayDiagram'
import { createGeometry } from '../engine/geometry'
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
const WIDE_ENOUGH = 150
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

  const narrationKey =
    windowSize > WIDE_ENOUGH ? 'chapter.no-hole.say.wide' : 'chapter.no-hole.say.narrow'

  return (
    <ChapterShell
      slug="no-hole"
      narration={t(windowSize > 340 ? 'chapter.no-hole.say' : narrationKey)}
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
        </Box>
        <Figure geometry={geometry} centreY={0} height={FIGURE_HEIGHT} />
      </Scene>
    </ChapterShell>
  )
}
