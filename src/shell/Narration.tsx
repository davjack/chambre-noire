import { useCallback, useEffect, useState } from 'react'

import { bcp47 } from '../i18n'
import { useT } from '../i18n/useT'
import { useSettings } from './SettingsContext'

/**
 * Narration, and the promise that goes with it: the spoken line is *always*
 * also on screen, in large type, inside a live region.
 *
 * Six-year-olds are the target audience and many of them barely read, so the
 * voice matters. But voices are the least reliable thing on the web platform —
 * absent in kiosk browsers, unusable in some Android French packs, silenced by
 * a school mute switch. Text is the channel that never fails; speech is the
 * enhancement on top. Everything below is written in that order.
 *
 * Swapping `speechSynthesis` for recorded audio later means rewriting `speak`
 * and nothing else.
 */

function pickVoice(languageTag: string): SpeechSynthesisVoice | undefined {
  const voices = globalThis.speechSynthesis?.getVoices() ?? []
  const primary = languageTag.slice(0, 2)
  return (
    voices.find((voice) => voice.lang.replace('_', '-') === languageTag) ??
    voices.find((voice) => voice.lang.slice(0, 2) === primary)
  )
}

/**
 * Whether this browser can actually speak, right now.
 *
 * Not a formality: on Linux, Firefox exposes the system voices through
 * speech-dispatcher while Chromium-based browsers commonly expose none at all,
 * on the very same machine. Every control that promises sound is gated on this,
 * because a button that does nothing is worse than a button that is not there.
 */
export function useHasVoice(): boolean {
  const [voiceCount, setVoiceCount] = useState(
    () => globalThis.speechSynthesis?.getVoices().length ?? 0,
  )

  // Chrome populates the voice list asynchronously, and it can arrive after
  // the first render — so the button state has to follow it.
  useEffect(() => {
    const synth = globalThis.speechSynthesis
    if (!synth) return
    const update = () => setVoiceCount(synth.getVoices().length)
    update()
    synth.addEventListener('voiceschanged', update)
    return () => synth.removeEventListener('voiceschanged', update)
  }, [])

  return voiceCount > 0
}

interface Speech {
  speak: (text: string) => void
  cancel: () => void
  /** A voice is installed and usable right now. */
  hasVoice: boolean
}

export function useSpeech(): Speech {
  const { locale } = useSettings()
  const hasVoice = useHasVoice()

  const cancel = useCallback(() => {
    globalThis.speechSynthesis?.cancel()
  }, [])

  const speak = useCallback(
    (text: string) => {
      const synth = globalThis.speechSynthesis
      if (!synth || !text) return
      // Never queue: the previous sentence is always stale by now.
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const languageTag = bcp47(locale)
      utterance.lang = languageTag
      const voice = pickVoice(languageTag)
      if (voice) utterance.voice = voice
      // Slightly slow and slightly bright: read to a child, not to a commuter.
      utterance.rate = 0.92
      utterance.pitch = 1.05
      synth.speak(utterance)
    },
    [locale],
  )

  return { speak, cancel, hasVoice }
}

export function Narration({ text }: { text: string }) {
  const t = useT()
  const { soundEnabled } = useSettings()
  const { speak, cancel, hasVoice } = useSpeech()

  /*
   * The live region has to exist *before* it has anything to say.
   *
   * Navigating remounts the whole chapter, so the region and its first
   * sentence would otherwise enter the DOM in the same commit — and a live
   * region inserted already full is not announced by any screen reader. The
   * app's central promise would then break at exactly the moment it matters,
   * the change of chapter. Rendering empty for one commit and filling it in an
   * effect is what makes the change a *change*.
   */
  const [announced, setAnnounced] = useState('')
  useEffect(() => setAnnounced(text), [text])

  useEffect(() => {
    if (!soundEnabled || !hasVoice) return
    speak(text)
    return cancel
  }, [text, soundEnabled, hasVoice, speak, cancel])

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <div className="flex items-center gap-3">
        <p
          aria-live="polite"
          className="flex-1 text-balance text-center text-xl font-semibold text-ink sm:text-2xl"
        >
          {announced}
        </p>
        {hasVoice ? (
          <button
            type="button"
            onClick={() => speak(text)}
            className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-edge bg-chamber text-ray transition-colors hover:border-ray"
            aria-label={t('sound.replay')}
          >
            <SpeakerIcon />
          </button>
        ) : null}
      </div>
      {/*
       * Nothing is said about a missing voice.
       *
       * A six-year-old cannot act on "no voice on this device", and the adult
       * who could is not reading the bottom of the screen — so the line was
       * addressed to nobody while taking up room in a child's field of view.
       * The sound button is simply absent where no voice exists, and the
       * instructions for installing one live in the README, where someone can
       * actually follow them.
       */}
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
