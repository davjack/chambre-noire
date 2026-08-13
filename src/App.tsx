import { useEffect } from 'react'

import { chapterComponents } from './chapters'
import { FIRST_SLUG } from './chapters/order'
import { SettingsProvider } from './shell/SettingsContext'
import { useHashRoute } from './shell/useHashRoute'

function Router() {
  const [slug] = useHashRoute(FIRST_SLUG)
  const Chapter = chapterComponents[slug] ?? chapterComponents[FIRST_SLUG]

  // Each chapter is a full screen of its own; arriving halfway down one that
  // scrolls would hide the picture the narration is talking about.
  useEffect(() => {
    globalThis.scrollTo({ top: 0 })
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
