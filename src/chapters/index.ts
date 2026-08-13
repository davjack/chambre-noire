import type { ComponentType } from 'react'

import { WowChapter } from './00-wow'
import { StraightLightChapter } from './01-straight-light'
import { NoHoleChapter } from './02-no-hole'
import { TheHoleChapter } from './03-the-hole'
import { UpsideDownChapter } from './04-upside-down'
import { HoleSizeChapter } from './05-hole-size'
import { BoxLengthChapter } from './06-box-length'
import { YourEyeChapter } from './07-your-eye'
import { YourBoxChapter } from './08-your-box'
import { BuildItChapter } from './09-build-it'

/**
 * Slug → component. The order lives in `order.ts`, which this file must not be
 * merged into: `ChapterShell` needs the order and would drag every chapter into
 * its own import graph.
 */
export const chapterComponents: Record<string, ComponentType> = {
  wow: WowChapter,
  'straight-light': StraightLightChapter,
  'no-hole': NoHoleChapter,
  'the-hole': TheHoleChapter,
  'upside-down': UpsideDownChapter,
  'hole-size': HoleSizeChapter,
  'box-length': BoxLengthChapter,
  'your-eye': YourEyeChapter,
  'your-box': YourBoxChapter,
  'build-it': BuildItChapter,
}
