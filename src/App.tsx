import { useEffect, useRef } from 'react'

import { chapterComponents } from './chapters'
import { FIRST_SLUG } from './chapters/order'
import { SettingsProvider } from './shell/SettingsContext'
import { useHashRoute } from './shell/useHashRoute'

function Router() {
  const [slug] = useHashRoute(FIRST_SLUG)
  const Chapter = chapterComponents[slug] ?? chapterComponents[FIRST_SLUG]
  const previousSlug = useRef<string | null>(null)

  useEffect(() => {
    // Each chapter is a full screen of its own; arriving halfway down one that
    // scrolls would hide the picture the narration is talking about.
    globalThis.scrollTo({ top: 0 })

    // Comparing slugs rather than counting runs: StrictMode invokes this twice
    // on mount, and a "first render" flag would report the second pass as a
    // navigation and steal focus from a visitor who has not asked for anything.
    const isNavigation = previousSlug.current !== null && previousSlug.current !== slug
    previousSlug.current = slug
    if (!isNavigation) return

    /*
     * Move focus into the new chapter.
     *
     * Remounting drops focus back to `<body>`, so the keyboard — and a switch,
     * which is the same thing with fewer keys — would have to travel the skip
     * link, two header buttons and ten progress buttons to reach the content
     * again. Thirteen presses per chapter is how a child stops at chapter
     * three.
     */
    document.querySelector<HTMLElement>('#scene')?.focus({ preventScroll: true })
  }, [slug])

  // `key` remounts on navigation, so a chapter never inherits the previous
  // one's slider positions.
  return Chapter ? <Chapter key={slug} /> : null
}

export function App() {
  return (
    <SettingsProvider>
      <Router />
    </SettingsProvider>
  )
}
