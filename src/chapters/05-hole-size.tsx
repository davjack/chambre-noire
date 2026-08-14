import { useCallback, useState } from 'react'

import { PinholeCanvas } from '../engine/PinholeCanvas'
import { useT } from '../i18n/useT'
import {
  brightnessRatio,
  optimalHoleDiameterFor,
  relativeSharpness,
  type PinholeSetup,
} from '../physics/optics'
import { BigSlider } from '../shell/BigSlider'
import { logScale } from '../shell/logScale'
import { ChapterShell } from '../shell/ChapterShell'
import { Meter } from '../shell/Meter'

/*
 * The trade nobody expects: sharp or bright, pick one.
 *
 * This is the only chapter that runs on the GPU, and the reason is that a CSS
 * blur would have made the lesson false. A blur filter gets blurrier as you
 * turn it up, full stop. A real pinhole gets blurrier at BOTH ends — wide open
 * because the hole is a disc, nearly shut because light diffracts — and the
 * sweet spot between them is the whole point of the chapter. The shader
 * integrates over the aperture, so the child finds that spot by looking.
 *
 * The slider is logarithmic. On a linear one the sharpest hole sits at 6 % of
 * the track and a child sweeps straight past it.
 */

/*
 * A shoebox, which is the box chapter 9 tells the child to build and the one
 * chapter 6 now reads out — 12 to 38 cm, this sitting near its top.
 *
 * It used to be 10 cm, below both, and that cost more than tidiness. The blur at
 * the best hole goes as `√(4.88·λ·f·k)` over the wall, so it falls with a bigger
 * box: 0.66 % of the wall's height at 10 cm against 0.39 % here. Nothing else in
 * this chapter can touch that number — at the optimum the geometric and the
 * diffraction terms are equal by definition, and the wall keeps its 0.8 of the
 * box so the framing does not move.
 *
 * The house stands at 30 m, where chapter 0 already puts it. It is the same
 * drawing; it was at 4 m here, which no house of that size can be.
 */
const BOX_LENGTH_MM = 300
const OBJECT_DISTANCE_MM = 30_000
const WALL_HEIGHT_MM = 240
const MIN_HOLE_MM = 0.05
const MAX_HOLE_MM = 5

const holeScale = logScale(MIN_HOLE_MM, MAX_HOLE_MM)

/**
 * Where the slider starts: on the best hole this box has, which is also where
 * the mark on the track already points.
 *
 * It used to start at 0.75 of the track — a 1.58 mm hole against an optimum of
 * 0.36 — so the chapter opened on a smear, nine times softer than the opening
 * screen, and read as a rendering fault rather than as the wide end of a trade.
 * From here the child finds *both* ways to spoil it instead of one, and the line
 * read aloud on arrival says what this box can actually do: "Là, c'est le plus
 * net possible !"
 *
 * `holeDiameter` is passed only because `PinholeSetup` asks for one; the optimum
 * is a property of the box and the distance, never of the hole currently set.
 */
const OPTIMUM_MM = optimalHoleDiameterFor({
  boxLength: BOX_LENGTH_MM,
  objectDistance: OBJECT_DISTANCE_MM,
  holeDiameter: MIN_HOLE_MM,
})

export function HoleSizeChapter() {
  const t = useT()
  const [slider, setSlider] = useState(holeScale.toSlider(OPTIMUM_MM))
  /*
   * On by default, and that is the realistic setting, not the forgiving one:
   * someone standing inside a camera obscura *does* adapt, and sees the image
   * perfectly well. Left off, the sharpest hole renders almost black — f/278 —
   * and the chapter's own lesson becomes invisible at the exact point it is
   * being made. Turning it off is the reveal: "look how little light there
   * really is". The brightness meter tells the true story either way.
   */
  const [darkAdapted, setDarkAdapted] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  const holeDiameter = holeScale.toValue(slider)
  const setup: PinholeSetup = {
    boxLength: BOX_LENGTH_MM,
    objectDistance: OBJECT_DISTANCE_MM,
    holeDiameter,
  }

  const optimum = optimalHoleDiameterFor(setup)
  const ratio = holeDiameter / optimum
  const brightness = brightnessRatio(setup, MAX_HOLE_MM)

  const narration =
    ratio > 2.5
      ? 'chapter.hole-size.say.big'
      : ratio < 0.5
        ? 'chapter.hole-size.say.small'
        : ratio > 0.8 && ratio < 1.25
          ? 'chapter.hole-size.say.best'
          : 'chapter.hole-size.say'

  const onFallback = useCallback((fallback: boolean) => setUsingFallback(fallback), [])

  return (
    <ChapterShell
      slug="hole-size"
      narrationKey={narration}
      controls={
        <div className="flex flex-col gap-4">
          <BigSlider
            label={t('chapter.hole-size.hole')}
            value={slider}
            min={0}
            max={1}
            step={0.005}
            onChange={setSlider}
            valueText={t('unit.mm', { value: holeDiameter.toFixed(2) })}
            markAt={holeScale.toSlider(optimum)}
            markLabel={t('chapter.hole-size.sweetSpot')}
          />
          <div className="flex flex-col gap-2">
            <Meter
              label={t('meter.sharpness')}
              value={relativeSharpness(setup)}
              colour="var(--color-mark-c)"
            />
            <Meter
              label={t('meter.brightness')}
              value={brightness}
              colour="var(--color-ray)"
            />
          </div>
          <button
            type="button"
            className="pill self-center !min-h-14 text-base"
            data-variant={darkAdapted ? 'primary' : undefined}
            onClick={() => setDarkAdapted((current) => !current)}
            aria-pressed={darkAdapted}
            aria-describedby="dark-adapt-help"
          >
            {t('chapter.hole-size.darkAdapt')}
          </button>
          <p id="dark-adapt-help" className="text-center text-sm text-muted">
            {t('chapter.hole-size.darkAdaptHelp')}
          </p>
        </div>
      }
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div className="aspect-4/3 min-h-0 w-auto max-w-full flex-1 overflow-hidden rounded-blob border-4 border-edge bg-night">
          <PinholeCanvas
            className="size-full"
            holeDiameter={holeDiameter}
            boxLength={BOX_LENGTH_MM}
            objectDistance={OBJECT_DISTANCE_MM}
            wallHeight={WALL_HEIGHT_MM}
            exposure={darkAdapted ? 1 : brightness}
            onFallback={onFallback}
          />
        </div>
        {usingFallback ? (
          <p className="text-center text-sm text-muted">{t('fallback.webgl')}</p>
        ) : null}
      </div>
    </ChapterShell>
  )
}
