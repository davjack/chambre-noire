import { useCallback, useEffect, useRef, useState } from 'react'

import type { TranslationKey } from '../i18n'
import { useT } from '../i18n/useT'
import { narrationUrl } from './narrationAudio'
import { useSettings } from './SettingsContext'

/**
 * Narration, and the promise that goes with it: the spoken line is *always*
 * also on screen, in large type, inside a live region.
 *
 * The voice is a recorded clip, not `speechSynthesis`. That was not a
 * preference — the browser's own voices proved to be a lottery the audience
 * loses. Measured on one Ubuntu desktop, in a single session: Firefox offered
 * 14 805 voices, every one of them an eSpeak variant whose French a
 * six-year-old cannot follow, and Brave offered none at all. A school tablet
 * and a parent's phone would each have produced something different again.
 *
 * Shipping the audio makes the narration identical everywhere, offline
 * included, and let the voice be chosen by listening to it.
 */

export function Narration({ narrationKey }: { narrationKey: TranslationKey }) {
  const t = useT()
  const { locale, soundEnabled } = useSettings()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const text = t(narrationKey)

  /*
   * The live region has to exist *before* it has anything to say.
   *
   * Navigating remounts the whole chapter, so the region and its first
   * sentence would otherwise enter the DOM in the same commit — and a live
   * region inserted already full is not announced by any screen reader. The
   * app's central promise would break at exactly the moment it matters, the
   * change of chapter. Rendering empty for one commit and filling it in an
   * effect is what makes the change a *change*.
   */
  const [announced, setAnnounced] = useState('')
  useEffect(() => setAnnounced(text), [text])

  const play = useCallback(() => {
    const audio = (audioRef.current ??= new Audio())
    audio.pause()
    audio.src = narrationUrl(locale, narrationKey)
    // Rejects when the browser blocks audio before any user gesture. Sound is
    // opt-in here, so that only happens on the very first line, and silence is
    // the correct outcome then.
    void audio.play().catch(() => {})
  }, [locale, narrationKey])

  useEffect(() => {
    if (!soundEnabled) return
    play()
    return () => audioRef.current?.pause()
  }, [soundEnabled, play])

  useEffect(() => () => audioRef.current?.pause(), [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <div className="flex items-center gap-3">
        <p
          aria-live="polite"
          className="flex-1 text-balance text-center text-xl font-semibold text-ink sm:text-2xl"
        >
          {announced}
        </p>
        <button
          type="button"
          onClick={play}
          className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-edge bg-chamber text-ray transition-colors hover:border-ray"
          aria-label={t('sound.replay')}
        >
          <SpeakerIcon />
        </button>
      </div>
    </div>
  )
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
      <path
        d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
