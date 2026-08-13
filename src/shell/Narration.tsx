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

interface Speech {
  speak: (text: string) => void
  cancel: () => void
  /** A voice is installed and usable right now. */
  hasVoice: boolean
}

export function useSpeech(): Speech {
  const { locale } = useSettings()
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

  return { speak, cancel, hasVoice: voiceCount > 0 }
}

export function Narration({ text }: { text: string }) {
  const t = useT()
  const { soundEnabled } = useSettings()
  const { speak, cancel, hasVoice } = useSpeech()

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
          {text}
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
      {soundEnabled && !hasVoice ? (
        <p className="mt-1 text-center text-sm text-muted">{t('sound.unavailable')}</p>
      ) : null}
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
