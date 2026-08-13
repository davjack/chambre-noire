import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { DEFAULT_LOCALE, isLocale, resolveLocale, type Locale } from '../i18n'
import { parseVisited, readStored, writeStored } from './storage'

function subscribeToMedia(query: string) {
  return (onChange: () => void) => {
    const list = globalThis.matchMedia?.(query)
    list?.addEventListener('change', onChange)
    return () => list?.removeEventListener('change', onChange)
  }
}

function useMediaQuery(query: string): boolean {
  const subscribe = useMemo(() => subscribeToMedia(query), [query])
  return useSyncExternalStore(
    subscribe,
    () => globalThis.matchMedia?.(query).matches ?? false,
    () => false,
  )
}

export interface Settings {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Narration is opt-in: a classroom of thirty tablets should not start talking. */
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  reducedMotion: boolean
  visited: ReadonlySet<string>
  markVisited: (slug: string) => void
}

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = readStored('locale')
    if (isLocale(stored)) return stored
    return globalThis.navigator ? resolveLocale(globalThis.navigator.language) : DEFAULT_LOCALE
  })

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(
    () => readStored('sound') === 'on',
  )

  const [visited, setVisited] = useState<ReadonlySet<string>>(() =>
    parseVisited(readStored('visited')),
  )

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeStored('locale', next)
  }, [])

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    writeStored('sound', enabled ? 'on' : 'off')
  }, [])

  const markVisited = useCallback((slug: string) => {
    setVisited((current) => {
      if (current.has(slug)) return current
      const next = new Set(current)
      next.add(slug)
      writeStored('visited', JSON.stringify([...next]))
      return next
    })
  }, [])

  const value = useMemo<Settings>(
    () => ({
      locale,
      setLocale,
      soundEnabled,
      setSoundEnabled,
      reducedMotion,
      visited,
      markVisited,
    }),
    [locale, setLocale, soundEnabled, setSoundEnabled, reducedMotion, visited, markVisited],
  )

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings(): Settings {
  const settings = useContext(SettingsContext)
  if (!settings) throw new Error('useSettings must be used inside <SettingsProvider>')
  return settings
}
