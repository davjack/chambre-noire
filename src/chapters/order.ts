import type { TranslationKey } from '../i18n'

export interface ChapterMeta {
  /** Stable across languages: a deep link keeps working when the locale changes. */
  slug: string
  titleKey: TranslationKey
}

/**
 * The order of the story. Kept apart from the component registry so that
 * `ChapterShell` can know where it stands without importing every chapter,
 * which would close an import cycle.
 */
export const chapterOrder: readonly ChapterMeta[] = [
  { slug: 'wow', titleKey: 'chapter.wow.title' },
  { slug: 'straight-light', titleKey: 'chapter.straight-light.title' },
  { slug: 'no-hole', titleKey: 'chapter.no-hole.title' },
  { slug: 'the-hole', titleKey: 'chapter.the-hole.title' },
  { slug: 'upside-down', titleKey: 'chapter.upside-down.title' },
  { slug: 'hole-size', titleKey: 'chapter.hole-size.title' },
  { slug: 'box-length', titleKey: 'chapter.box-length.title' },
  { slug: 'your-eye', titleKey: 'chapter.your-eye.title' },
  { slug: 'your-box', titleKey: 'chapter.your-box.title' },
  { slug: 'build-it', titleKey: 'chapter.build-it.title' },
] as const

export const FIRST_SLUG = chapterOrder[0].slug

export function chapterIndex(slug: string): number {
  return chapterOrder.findIndex((chapter) => chapter.slug === slug)
}
