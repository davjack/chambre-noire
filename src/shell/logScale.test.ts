import { describe, expect, it } from 'vitest'

import { MAX_HOLE_MM, MIN_HOLE_MM } from '../chapters/05-hole-size'
import { logScale } from './logScale'

/*
 * The track chapter 5 actually renders, not a copy of it. Copied, the fixture
 * stayed at 0.05–5 while the chapter moved to 0.05–8, and the assertion below
 * went on passing against a scale nothing draws.
 */
const hole = logScale(MIN_HOLE_MM, MAX_HOLE_MM)

describe('logScale', () => {
  it('pins both ends of the track', () => {
    expect(hole.toSlider(MIN_HOLE_MM)).toBeCloseTo(0, 12)
    expect(hole.toSlider(MAX_HOLE_MM)).toBeCloseTo(1, 12)
    expect(hole.toValue(0)).toBeCloseTo(MIN_HOLE_MM, 12)
    expect(hole.toValue(1)).toBeCloseTo(MAX_HOLE_MM, 12)
  })

  it('round-trips', () => {
    for (const value of [MIN_HOLE_MM, 0.1, 0.63, 1, 2.5, MAX_HOLE_MM]) {
      expect(hole.toValue(hole.toSlider(value))).toBeCloseTo(value, 10)
    }
  })

  it('puts the geometric mean in the middle, which is the whole point', () => {
    expect(hole.toValue(0.5)).toBeCloseTo(Math.sqrt(MIN_HOLE_MM * MAX_HOLE_MM), 10)
  })

  it('lands the sharpest hole near the centre of the track', () => {
    // The optimum for chapter 5's 300 mm box — the hole this slider exists to
    // make findable, and the one it opens on.
    const position = hole.toSlider(0.63)
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
