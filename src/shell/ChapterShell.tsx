import { useEffect, type ReactNode } from 'react'

import { chapterIndex, chapterOrder } from '../chapters/order'
import type { TranslationKey } from '../i18n'
import { useT } from '../i18n/useT'
import { Narration } from './Narration'
import { useSettings } from './SettingsContext'
import { useHashRoute } from './useHashRoute'

interface ChapterShellProps {
  slug: string
  /** The line being said right now — as a key, because the clip is keyed too. */
  narrationKey: TranslationKey
  /** The scene: an SVG or a canvas, and nothing else. */
  children: ReactNode
  /** Sliders and toggles, kept out of the scene so the picture stays a picture. */
  controls?: ReactNode
}

export function ChapterShell({ slug, narrationKey, children, controls }: ChapterShellProps) {
  const t = useT()
  const { markVisited, visited, soundEnabled, setSoundEnabled, locale, setLocale } = useSettings()
  const [, navigate] = useHashRoute(slug)

  const index = chapterIndex(slug)
  const previous = index > 0 ? chapterOrder[index - 1] : undefined
  const next = index < chapterOrder.length - 1 ? chapterOrder[index + 1] : undefined

  useEffect(() => {
    markVisited(slug)
  }, [slug, markVisited])

  return (
    /*
     * An app shell: a header, a scrolling middle, and a footer that is always
     * there. Three earlier attempts each failed a real case.
     *
     * Letting the page grow to a viewport-height minimum put "Suite" below the
     * fold on all ten chapters in landscape and at 200 % zoom — a child who
     * cannot see the way forward does not go looking for it. Pinning the
     * height and clipping the overflow put it out of reach entirely, failing
     * WCAG 1.4.4 and 1.4.10. Sticking the footer to the bottom kept it visible
     * but let the narration — the one line that matters most — scroll
     * underneath it.
     *
     * (Class names are spelled out nowhere in this comment on purpose:
     * Tailwind scans comments too, and naming a utility here emits its rule
     * into the bundle.)
     *
     * Here nothing overlaps and nothing is clipped: only the middle scrolls,
     * and it can shrink to nothing, so the fixed furniture always fits.
     *
     * The height unit is the *small* viewport, the one visible while the
     * browser's own chrome shows. The dynamic unit sizes to the layout
     * viewport, which on a phone is taller than the visible area.
     */
    <div className="flex h-svh flex-col pb-[env(safe-area-inset-bottom)]">
      <a
        href="#scene"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ray focus:px-5 focus:py-3 focus:font-bold focus:text-night"
      >
        {t('app.skipToScene')}
      </a>

      <header className="flex items-center justify-between gap-3 px-4 pt-3">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">{t('app.title')}</p>
        <div className="flex items-center gap-2">
          {/* Always offered now: the narration is a clip that ships with the
              app, so there is no device where this button does nothing.

              No `aria-pressed`: the label already says what the next press
              does. Carrying both makes a screen reader announce "Sound off,
              toggle button, pressed", which states the opposite of the truth. */}
          <button
            type="button"
            className="pill !min-h-11 !px-4 text-sm [@media(max-height:430px)]:!min-h-9"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? t('sound.disable') : t('sound.enable')}
          </button>
          {/* No `aria-label` either: it read "Passer en anglais" over a button
              labelled "English", so voice control could not act on what it saw
              — WCAG 2.5.3 Label in Name. The visible word is the better name. */}
          <button
            type="button"
            className="pill !min-h-11 !px-4 text-sm [@media(max-height:430px)]:!min-h-9"
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
          >
            {t('lang.switch')}
          </button>
        </div>
      </header>

      <nav aria-label={t('nav.step', { current: index + 1, total: chapterOrder.length })}>
        <ol className="flex gap-1 px-4">
          {chapterOrder.map((chapter, position) => {
            const isCurrent = chapter.slug === slug
            return (
              <li key={chapter.slug} className="flex-1">
                <button
                  type="button"
                  onClick={() => navigate(chapter.slug)}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={t('nav.goToStep', {
                    number: position + 1,
                    title: t(chapter.titleKey),
                  })}
                  className="group grid h-11 w-full place-items-center [@media(max-height:430px)]:h-7"
                >
                  <span
                    className={`block h-1.5 w-full rounded-full transition-colors ${
                      isCurrent
                        ? 'bg-ray'
                        : visited.has(chapter.slug)
                          ? 'bg-muted/60'
                          : 'bg-edge group-hover:bg-muted/40'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* The only part that scrolls, and only when it has to. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-1">
        <h1 className="text-balance px-4 text-center text-2xl font-extrabold sm:text-3xl">
          {t(chapterOrder[index]?.titleKey ?? 'app.title')}
        </h1>

        {/* 8 rem is the smallest scene worth looking at — but not at any cost:
            at 300 px tall it is room the window does not have, and the column
            overflowed. `min(8rem, 20svh)` keeps the floor everywhere it fits
            and yields where it does not. */}
        <main id="scene" tabIndex={-1} className="relative min-h-[min(8rem,20svh)] flex-1 px-3">
          {/* Absolute so the children get a definite height to size against —
              `h-full` inside a plain flex item would have nothing to resolve. */}
          <div className="absolute inset-0 flex items-center justify-center">{children}</div>
        </main>

        {controls ? <div className="mx-auto w-full max-w-2xl px-4">{controls}</div> : null}
      </div>

      {/*
       * Outside the scroller, with the navigation.
       *
       * When room runs short something has to give, and the order is not
       * negotiable: the way forward, then the sentence being taught, then the
       * controls, then the picture. Leaving the narration inside the scrolling
       * middle put the one line that carries the lesson below the fold on every
       * chapter in landscape and at 200 % zoom — measured, not assumed.
       */}
      {/* The border belongs here, not on the navigation: narration and buttons
          are one fixed panel, and a visible edge is what tells a reader that
          content disappearing above it has scrolled under something rather
          than broken. */}
      <div className="shrink-0 border-t border-edge/60 pb-1 pt-2">
        <Narration narrationKey={narrationKey} />
      </div>

      <nav className="flex shrink-0 items-center justify-between gap-3 px-4 pb-4 pt-2">
        <button
          type="button"
          className="pill"
          onClick={() => previous && navigate(previous.slug)}
          disabled={!previous}
        >
          <span aria-hidden="true">←</span>
          {t('nav.prev')}
        </button>
        <button
          type="button"
          className="pill"
          data-variant="primary"
          onClick={() => navigate(next ? next.slug : chapterOrder[0].slug)}
        >
          {t(next ? 'nav.next' : 'nav.finish')}
          <span aria-hidden="true">→</span>
        </button>
      </nav>
    </div>
  )
}
