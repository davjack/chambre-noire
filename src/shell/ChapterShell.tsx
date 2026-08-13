import { useEffect, type ReactNode } from 'react'

import { chapterIndex, chapterOrder } from '../chapters/order'
import { useT } from '../i18n/useT'
import { Narration } from './Narration'
import { useSettings } from './SettingsContext'
import { useHashRoute } from './useHashRoute'

interface ChapterShellProps {
  slug: string
  /** The one sentence being said right now. Chapters change it as the child plays. */
  narration: string
  /** The scene: an SVG or a canvas, and nothing else. */
  children: ReactNode
  /** Sliders and toggles, kept out of the scene so the picture stays a picture. */
  controls?: ReactNode
  /** Overrides the "Next" label on the last chapter. */
  nextLabelKey?: 'nav.next' | 'nav.finish'
}

export function ChapterShell({
  slug,
  narration,
  children,
  controls,
  nextLabelKey = 'nav.next',
}: ChapterShellProps) {
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
    <div className="flex min-h-dvh flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
      <a
        href="#scene"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ray focus:px-5 focus:py-3 focus:font-bold focus:text-night"
      >
        {t('app.skipToScene')}
      </a>

      <header className="flex items-center justify-between gap-3 px-4 pt-3">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">{t('app.title')}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="pill !min-h-11 !px-4 text-sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? t('sound.disable') : t('sound.enable')}
          </button>
          <button
            type="button"
            className="pill !min-h-11 !px-4 text-sm"
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            aria-label={t('lang.switchLabel')}
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
                  className="group grid h-11 w-full place-items-center"
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

      <h1 className="text-balance px-4 text-center text-3xl font-extrabold sm:text-4xl">
        {t(chapterOrder[index]?.titleKey ?? 'app.title')}
      </h1>

      <main
        id="scene"
        tabIndex={-1}
        className="flex min-h-0 flex-1 items-center justify-center px-3"
      >
        {children}
      </main>

      {controls ? <div className="mx-auto w-full max-w-2xl px-4">{controls}</div> : null}

      <Narration text={narration} />

      <nav className="flex items-center justify-between gap-3 px-4 pb-4">
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
          {t(next ? nextLabelKey : 'nav.finish')}
          <span aria-hidden="true">→</span>
        </button>
      </nav>
    </div>
  )
}
