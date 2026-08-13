import en from './en.json'
import fr from './fr.json'

export const locales = ['fr', 'en'] as const
export type Locale = (typeof locales)[number]

/**
 * Every user-facing string in the app is one of these keys. The type is derived
 * from the French dictionary, which makes French the reference: a key that
 * exists nowhere else cannot be used, and `dictionaries` below will not compile
 * if the English file is missing one.
 */
export type TranslationKey = keyof typeof fr

export const DEFAULT_LOCALE: Locale = 'fr'

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { fr, en }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

/** Picks the closest supported locale for a browser language tag. */
export function resolveLocale(languageTag: string | undefined): Locale {
  const primary = languageTag?.split('-')[0]?.toLowerCase()
  return isLocale(primary) ? primary : DEFAULT_LOCALE
}

export type TranslationVars = Record<string, string | number>

/**
 * Looks up a key and fills `{placeholders}`.
 *
 * A missing key returns the key itself rather than an empty string: silence is
 * the one failure mode nobody notices in review.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const template = dictionaries[locale][key] ?? key
  if (!vars) return template
  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** BCP 47 tag for `speechSynthesis` and `Intl`. */
export function bcp47(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-GB'
}
