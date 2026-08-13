const PREFIX = 'petit-trou:'

/**
 * localStorage, treated as a nice-to-have.
 *
 * It throws in Safari private mode and is simply absent from some kiosk
 * browsers. Progress in this app is a convenience, never a requirement, so both
 * failures degrade to "this session only" rather than breaking anything.
 */
export function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(PREFIX + key) ?? null
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, value)
  } catch {
    // Storage unavailable — the session works, it just will not be remembered.
  }
}

/**
 * Turns whatever is in storage into a set of chapter slugs.
 *
 * Anything can be in there: a half-written value from a killed tab, a string
 * left by an older version, something a curious ten-year-old typed into the
 * console. None of it may reach the progress bar as `undefined`.
 */
export function parseVisited(raw: string | null): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'))
  } catch {
    return new Set()
  }
}
