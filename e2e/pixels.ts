import type { Locator } from '@playwright/test'
import { PNG } from 'pngjs'

/**
 * Fraction of an element that is not background, measured from a screenshot.
 *
 * Reading a canvas back in the page does not work: a WebGL context without
 * `preserveDrawingBuffer` has an empty drawing buffer by the time any script
 * can look at it, and turning that flag on would cost every visitor
 * performance to satisfy a test. A screenshot measures what the child sees,
 * and it works identically for the WebGL path, the 2D fallback and the SVG
 * scenes — which is why this lives here rather than inside one spec.
 *
 * Sampled every 97th pixel: prime, so it never lines up with a repeating
 * pattern, and fast enough to run on every assertion.
 *
 * The threshold of 60 is closer to the palette than it looks: `--color-chamber`
 * sums to exactly 60 and so counts as unlit, which is what lets a caller see a
 * light leak flooding a box. Darken or lighten that token by one on any channel
 * and this stops discriminating — the failure will show up as an assertion
 * about a fraction, saying nothing about colour, so start here.
 */
export async function litFraction(target: Locator): Promise<number> {
  const shot = await target.screenshot()
  const { data } = PNG.sync.read(shot)
  let lit = 0
  let counted = 0
  for (let i = 0; i < data.length; i += 4 * 97) {
    counted += 1
    if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 60) lit += 1
  }
  return counted ? lit / counted : 0
}
