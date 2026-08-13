import { describe, expect, it } from 'vitest'

import { logScale } from './logScale'

const hole = logScale(0.05, 5)

describe('logScale', () => {
  it('pins both ends of the track', () => {
    expect(hole.toSlider(0.05)).toBeCloseTo(0, 12)
    expect(hole.toSlider(5)).toBeCloseTo(1, 12)
    expect(hole.toValue(0)).toBeCloseTo(0.05, 12)
    expect(hole.toValue(1)).toBeCloseTo(5, 12)
  })

  it('round-trips', () => {
    for (const value of [0.05, 0.1, 0.36, 1, 2.5, 5]) {
      expect(hole.toValue(hole.toSlider(value))).toBeCloseTo(value, 10)
    }
  })

  it('puts the geometric mean in the middle, which is the whole point', () => {
    expect(hole.toValue(0.5)).toBeCloseTo(Math.sqrt(0.05 * 5), 10)
  })

  it('lands the sharpest hole near the centre of the track', () => {
    // 0.0366·√100 mm, the optimum this slider exists to make findable.
    const position = hole.toSlider(0.366)
    expect(position).toBeGreaterThan(0.35)
    expect(position).toBeLessThan(0.65)
  })

  it('rises monotonically', () => {
    let previous = -Infinity
    for (let slider = 0; slider <= 1; slider += 0.01) {
      const value = hole.toValue(slider)
      expect(value).toBeGreaterThan(previous)
      previous = value
    }
  })

  it('clamps a value below the floor instead of returning -Infinity', () => {
    expect(hole.toSlider(0)).toBe(0)
    expect(Number.isFinite(hole.toSlider(-1))).toBe(true)
  })

  it('refuses a range it cannot represent', () => {
    expect(() => logScale(0, 5)).toThrow(RangeError)
    expect(() => logScale(-1, 5)).toThrow(RangeError)
    expect(() => logScale(5, 5)).toThrow(RangeError)
  })
})
