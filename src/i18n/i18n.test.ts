import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import en from './en.json'
import fr from './fr.json'
import { bcp47, isLocale, locales, resolveLocale, translate } from './index'

type Key = keyof typeof fr

/**
 * These tests collect the offending keys and assert the list is empty, rather
 * than failing on the first one: a translation pass wants the whole list, not
 * one key at a time.
 */
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).toSorted()

describe('dictionaries', () => {
  it('carries the same keys in both languages', () => {
    expect(Object.keys(en).toSorted()).toEqual(Object.keys(fr).toSorted())
  })

  it('never leaves a translation empty', () => {
    const empty = [
      ...Object.entries(fr).map(([key, value]) => ['fr', key, value] as const),
      ...Object.entries(en).map(([key, value]) => ['en', key, value] as const),
    ]
      .filter(([, , value]) => value.trim() === '')
      .map(([locale, key]) => `${locale}:${key}`)

    expect(empty).toEqual([])
  })

  it('keeps the same placeholders in both languages', () => {
    const mismatched = (Object.keys(fr) as Key[]).filter(
      (key) => placeholders(en[key]).join() !== placeholders(fr[key]).join(),
    )
    expect(mismatched).toEqual([])
  })

  it('stays within a sentence a six-year-old can hold — 90 characters', () => {
    const spoken = (Object.keys(fr) as Key[]).filter((key) => key.includes('.say'))
    expect(spoken.length).toBeGreaterThan(0)

    const tooLong = spoken.filter((key) => fr[key].length > 90 || en[key].length > 90)
    expect(tooLong).toEqual([])
  })

  it('keeps every other string short too — the cap was escaping non-.say keys', () => {
    const tooLong = (Object.keys(fr) as Key[]).filter(
      (key) => fr[key].length > 100 || en[key].length > 100,
    )
    expect(tooLong).toEqual([])
  })
})

/** All application source, tests excluded so they cannot vouch for a key. */
function readSource(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return readSource(path)
      if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) return []
      return [readFileSync(path, 'utf8')]
    })
    .join('\n')
}

describe('every key earns its place', () => {
  it('is referenced somewhere in the app', () => {
    const source = readSource('src')
    const unused = (Object.keys(fr) as Key[]).filter((key) => {
      if (source.includes(`'${key}'`) || source.includes(`"${key}"`)) return false
      // Families addressed through a template literal, e.g. `…mark.${landmark}`.
      const stem = key.slice(0, key.lastIndexOf('.'))
      return !source.includes(`\`${stem}.\${`)
    })

    // A dictionary entry nobody reads is either dead weight or a feature that
    // silently stopped being rendered. This test exists because both happened.
    expect(unused).toEqual([])
  })
})

describe('translate', () => {
  it('returns the string for the locale', () => {
    expect(translate('fr', 'nav.next')).toBe('Suite')
    expect(translate('en', 'nav.next')).toBe('Next')
  })

  it('fills placeholders', () => {
    expect(translate('fr', 'nav.step', { current: 3, total: 10 })).toBe('Étape 3 sur 10')
  })

  it('leaves an unknown placeholder visible rather than blank', () => {
    expect(translate('fr', 'nav.step', { current: 3 })).toContain('{total}')
  })
})

describe('locale resolution', () => {
  it('accepts the supported locales only', () => {
    for (const locale of locales) expect(isLocale(locale)).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('reads a browser language tag', () => {
    expect(resolveLocale('fr-CH')).toBe('fr')
    expect(resolveLocale('en-US')).toBe('en')
    expect(resolveLocale('de-DE')).toBe('fr')
    expect(resolveLocale(undefined)).toBe('fr')
  })

  it('maps to a speech-synthesis tag', () => {
    expect(bcp47('fr')).toBe('fr-FR')
    expect(bcp47('en')).toBe('en-GB')
  })
})
