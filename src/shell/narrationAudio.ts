import type { Locale, TranslationKey } from '../i18n'

/**
 * Where the clip for a narrated line lives.
 *
 * `scripts/generate-narration.py` writes exactly these paths, and a unit test
 * holds the two in step: add a narrated line without regenerating the audio and
 * the suite fails rather than the child hearing silence.
 */
export function narrationUrl(locale: Locale, key: TranslationKey): string {
  return `${import.meta.env.BASE_URL}audio/${locale}/${key.replaceAll('.', '-')}.mp3`
}

/** The keys that have a recorded clip: the ones `Narration` reads aloud. */
export function isNarrated(key: string): boolean {
  return key.includes('.say')
}
