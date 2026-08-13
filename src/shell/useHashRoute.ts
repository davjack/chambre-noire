import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hash routing in thirty lines.
 *
 * Ten chapters visited in a line need deep links (a teacher sends
 * `#/le-trou` to a class) and nothing else — no nested routes, no loaders, no
 * data layer. A router dependency would be more code to load, not less to
 * write.
 */

function subscribe(onChange: () => void): () => void {
  globalThis.addEventListener('hashchange', onChange)
  return () => globalThis.removeEventListener('hashchange', onChange)
}

function readSlug(): string {
  return decodeURIComponent(globalThis.location?.hash.replace(/^#\/?/, '') ?? '')
}

export function useHashRoute(fallback: string): [string, (slug: string) => void] {
  const raw = useSyncExternalStore(subscribe, readSlug, () => '')
  const navigate = useCallback((slug: string) => {
    globalThis.location.hash = `#/${slug}`
  }, [])
  return [raw || fallback, navigate]
}
