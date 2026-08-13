import { useCallback, useState } from 'react'

import { PinholeCanvas } from '../engine/PinholeCanvas'
import { useT } from '../i18n/useT'
import { optimalHoleDiameter } from '../physics/optics'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * The opening. No explanation, no diagram, no words beyond four: touch the
 * black wall and the world walks in upside down.
 *
 * It runs the real simulation rather than a picture of one, because the child
 * meets the honest thing first and spends the next nine chapters taking it
 * apart.
 */
const BOX_LENGTH_MM = 110
const OBJECT_DISTANCE_MM = 8000
const WALL_HEIGHT_MM = 85

export function WowChapter() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const onFallback = useCallback((fallback: boolean) => setUsingFallback(fallback), [])

  return (
    <ChapterShell
      slug="wow"
      narrationKey={open ? 'chapter.wow.say.open' : 'chapter.wow.say.closed'}
      controls={
        <div className="flex flex-col gap-1">
          {open ? (
            <p className="text-center text-lg font-semibold text-ray">{t('chapter.wow.cta')}</p>
          ) : null}
          {/* The very first screen of the app is the worst place to leave a
              child looking at a black square with no explanation. */}
          {usingFallback ? (
            <p className="text-center text-sm text-muted">{t('fallback.webgl')}</p>
          ) : null}
        </div>
      }
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-pressed={open}
        aria-label={t('chapter.wow.action')}
        className="relative aspect-4/3 h-full w-auto max-w-full overflow-hidden rounded-blob border-4 border-edge bg-night"
      >
        <PinholeCanvas
          className={`size-full transition-opacity duration-700 ${open ? 'opacity-100' : 'opacity-0'}`}
          holeDiameter={optimalHoleDiameter(BOX_LENGTH_MM)}
          boxLength={BOX_LENGTH_MM}
          objectDistance={OBJECT_DISTANCE_MM}
          wallHeight={WALL_HEIGHT_MM}
          exposure={1}
          onFallback={onFallback}
        />
        {open ? null : (
          <span className="absolute inset-0 grid place-items-center">
            <span className="hole-pulse block size-6 rounded-full bg-ray/80" />
          </span>
        )}
      </button>
    </ChapterShell>
  )
}
