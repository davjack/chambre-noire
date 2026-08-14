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
/*
 * A room, not a shoebox — the chamber this app is named after.
 *
 * The shader maps the whole scene onto the whole wall whatever these numbers
 * say, and the exposure below is pinned to 1 — the eye of someone who has been
 * standing in the chamber a while. So on this screen they set exactly one
 * thing: how blurred the picture is. Scaling the box and the wall together
 * therefore keeps the framing and divides the relative blur by the square root
 * of the factor.
 * That is not a trick to make the picture look better: a two-metre camera
 * obscura really is four times sharper than an eleven-centimetre one, for the
 * same reason a longer box needs a bigger hole.
 *
 * Here the total blur comes to 0.16 % of the wall's height, against 0.64 % for
 * the small box this screen used to model — sharp, rather than slightly out of
 * focus with nothing on screen to explain why.
 *
 * The box the child will build is modelled elsewhere on purpose. Chapter 5 runs
 * the shoebox, where the softness at the best possible hole *is* the lesson
 * instead of a disappointment on the opening screen.
 */
const BOX_LENGTH_MM = 2000
const OBJECT_DISTANCE_MM = 30_000
const WALL_HEIGHT_MM = 1500

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
