import { describe, expect, it } from 'vitest'

import {
  diffractionBlur,
  geometricBlur,
  optimalHoleDiameterFor,
  totalBlur,
} from '../physics/optics'
import { blurRadii, type PinholeParams } from './blurScale'

/** Chapter 5's own geometry: the shoebox it models, not a copy that drifts. */
const chapterFive: PinholeParams = {
  holeDiameter: 0.63,
  boxLength: 300,
  objectDistance: 30_000,
  wallHeight: 240,
  exposure: 1,
}

describe('blurRadii', () => {
  it('is exactly half the physical blur, divided by the wall height', () => {
    const { geometric, diffraction } = blurRadii(chapterFive)
    expect(geometric).toBeCloseTo(geometricBlur(0.63, 300, 30_000) / 2 / 240, 12)
    expect(diffraction).toBeCloseTo(diffractionBlur(0.63, 300) / 2 / 240, 12)
  })

  it('keeps both radii small enough to sample inside the texture', () => {
    for (const holeDiameter of [0.05, 0.63, 1, 8]) {
      const { geometric, diffraction } = blurRadii({ ...chapterFive, holeDiameter })
      expect(geometric).toBeGreaterThan(0)
      expect(geometric).toBeLessThan(0.5)
      expect(diffraction).toBeGreaterThan(0)
      expect(diffraction).toBeLessThan(0.5)
    }
  })

  it('swaps which term dominates on either side of the sweet spot', () => {
    const optimum = optimalHoleDiameterFor(chapterFive)

    const wide = blurRadii({ ...chapterFive, holeDiameter: optimum * 6 })
    expect(wide.geometric).toBeGreaterThan(wide.diffraction)

    const shut = blurRadii({ ...chapterFive, holeDiameter: optimum / 6 })
    expect(shut.diffraction).toBeGreaterThan(shut.geometric)
  })

  it('is minimal at the diameter optics.ts calls optimal', () => {
    const combined = (holeDiameter: number) => {
      const { geometric, diffraction } = blurRadii({ ...chapterFive, holeDiameter })
      return Math.hypot(geometric, diffraction)
    }
    const optimum = optimalHoleDiameterFor(chapterFive)
    expect(combined(optimum)).toBeLessThan(combined(optimum * 2))
    expect(combined(optimum)).toBeLessThan(combined(optimum / 2))
  })

  it('scales inversely with the wall it is projected onto', () => {
    const small = blurRadii({ ...chapterFive, wallHeight: 40 })
    const large = blurRadii({ ...chapterFive, wallHeight: 80 })
    expect(small.geometric).toBeCloseTo(large.geometric * 2, 12)
  })

  it('agrees with totalBlur once the halving and the wall are undone', () => {
    const { geometric, diffraction } = blurRadii(chapterFive)
    expect(Math.hypot(geometric, diffraction) * 2 * chapterFive.wallHeight).toBeCloseTo(
      totalBlur(chapterFive),
      10,
    )
  })
})
