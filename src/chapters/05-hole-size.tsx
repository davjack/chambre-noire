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

const BOX_LENGTH_MM = 100
const OBJECT_DISTANCE_MM = 4000
const WALL_HEIGHT_MM = 80
const MIN_HOLE_MM = 0.05
const MAX_HOLE_MM = 5

const holeScale = logScale(MIN_HOLE_MM, MAX_HOLE_MM)

export function HoleSizeChapter() {
  const t = useT()
  const [slider, setSlider] = useState(0.75)
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
