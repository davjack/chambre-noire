import { describe, expect, it } from 'vitest'

import {
  diffractionBlur,
  geometricBlur,
  optimalHoleDiameterFor,
  totalBlur,
} from '../physics/optics'
import { blurRadii, type PinholeParams } from './blurScale'

const chapterFive: PinholeParams = {
  holeDiameter: 0.4,
  boxLength: 100,
  objectDistance: 4000,
  wallHeight: 80,
  exposure: 1,
}

describe('blurRadii', () => {
  it('is exactly half the physical blur, divided by the wall height', () => {
    const { geometric, diffraction } = blurRadii(chapterFive)
    expect(geometric).toBeCloseTo(geometricBlur(0.4, 100, 4000) / 2 / 80, 12)
    expect(diffraction).toBeCloseTo(diffractionBlur(0.4, 100) / 2 / 80, 12)
  })

  it('keeps both radii small enough to sample inside the texture', () => {
    for (const holeDiameter of [0.05, 0.36, 1, 5]) {
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
    expect(Math.hypot(geometric, diffraction) * 2 * 80).toBeCloseTo(totalBlur(chapterFive), 10)
  })
})
