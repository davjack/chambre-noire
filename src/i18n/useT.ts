import { useCallback } from 'react'

import { useSettings } from '../shell/SettingsContext'
import { translate, type TranslationKey, type TranslationVars } from './index'

export type Translator = (key: TranslationKey, vars?: TranslationVars) => string

/** The only way a component is allowed to produce text a child will read. */
export function useT(): Translator {
  const { locale } = useSettings()
  return useCallback(
    (key: TranslationKey, vars?: TranslationVars) => translate(locale, key, vars),
    [locale],
  )
}
