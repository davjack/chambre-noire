import { describe, expect, it } from 'vitest'

import {
  GREEN_LIGHT_MM,
  brightnessRatio,
  diffractionBlur,
  fNumber,
  geometricBlur,
  imageHeight,
  magnification,
  optimalHoleDiameter,
  optimalHoleDiameterFor,
  projectPoint,
  relativeBrightness,
  relativeSharpness,
  totalBlur,
  type PinholeSetup,
} from './optics'

/** Brute-force the hole diameter that actually minimises the blur curve. */
function scanForSharpestHole(setup: PinholeSetup): number {
  let best = Number.POSITIVE_INFINITY
  let bestDiameter = 0
  for (let d = 0.02; d <= 3; d += 0.0001) {
    const blur = totalBlur({ ...setup, holeDiameter: d })
    if (blur < best) {
      best = blur
      bestDiameter = d
    }
  }
  return bestDiameter
}

describe('magnification and projection', () => {
  it('is linear in the box length', () => {
    expect(magnification(100, 1000)).toBeCloseTo(0.1, 10)
    expect(magnification(200, 1000)).toBeCloseTo(0.2, 10)
    expect(magnification(400, 1000)).toBeCloseTo(0.4, 10)
  })

  it('scales the image with the box length', () => {
    expect(imageHeight(500, 100, 1000)).toBeCloseTo(50, 10)
    expect(imageHeight(500, 300, 1000)).toBeCloseTo(150, 10)
  })

  it('flips the image: a point above the axis lands below it', () => {
    const image = projectPoint({ x: -1000, y: 500 }, 100)
    expect(image.x).toBeCloseTo(100, 10)
    expect(image.y).toBeCloseTo(-50, 10)
  })

  it('flips symmetrically, so the whole scene is turned around, not skewed', () => {
    const up = projectPoint({ x: -800, y: 200 }, 160)
    const down = projectPoint({ x: -800, y: -200 }, 160)
    expect(up.y).toBeCloseTo(-down.y, 10)
  })

  it('places a distant point almost on the axis', () => {
    expect(projectPoint({ x: -100_000, y: 1000 }, 100).y).toBeCloseTo(-1, 6)
  })
})

describe('the two blurs pull in opposite directions', () => {
  it('grows the geometric blur with the hole', () => {
    expect(geometricBlur(0.2, 100, 1000)).toBeLessThan(geometricBlur(0.8, 100, 1000))
  })

  it('grows the diffraction blur as the hole shrinks', () => {
    expect(diffractionBlur(0.8, 100)).toBeLessThan(diffractionBlur(0.2, 100))
  })

  it('matches the Airy diameter 2.44·λ·f/d', () => {
    expect(diffractionBlur(0.5, 100, GREEN_LIGHT_MM)).toBeCloseTo(
      (2.44 * GREEN_LIGHT_MM * 100) / 0.5,
      12,
    )
  })

  it('never returns less than either term alone', () => {
    const setup: PinholeSetup = { boxLength: 100, objectDistance: 2000, holeDiameter: 0.4 }
    const blur = totalBlur(setup)
    expect(blur).toBeGreaterThanOrEqual(geometricBlur(0.4, 100, 2000))
    expect(blur).toBeGreaterThanOrEqual(diffractionBlur(0.4, 100))
  })
})

describe('the sweet spot', () => {
  it('gives 0.366 mm for a 100 mm box — Young, 0.0366·√f', () => {
    expect(optimalHoleDiameter(100)).toBeCloseTo(0.366, 3)
    expect(optimalHoleDiameter(100)).toBeCloseTo(0.0366 * Math.sqrt(100), 3)
  })

  it('follows the square root of the box length', () => {
    expect(optimalHoleDiameter(400) / optimalHoleDiameter(100)).toBeCloseTo(2, 6)
  })

  it('really is where the blur curve bottoms out, within 5 % (distant object)', () => {
    const setup: PinholeSetup = { boxLength: 100, objectDistance: 100_000, holeDiameter: 0.5 }
    const predicted = optimalHoleDiameterFor(setup)
    const scanned = scanForSharpestHole(setup)
    expect(Math.abs(scanned - predicted) / predicted).toBeLessThan(0.05)
  })

  it('really is where the blur curve bottoms out, within 5 % (nearby object)', () => {
    const setup: PinholeSetup = { boxLength: 200, objectDistance: 1000, holeDiameter: 0.5 }
    const predicted = optimalHoleDiameterFor(setup)
    const scanned = scanForSharpestHole(setup)
    expect(Math.abs(scanned - predicted) / predicted).toBeLessThan(0.05)
  })

  it('collapses to the distant-object formula as the object recedes', () => {
    const far: PinholeSetup = { boxLength: 150, objectDistance: 1e9, holeDiameter: 0.4 }
    expect(optimalHoleDiameterFor(far)).toBeCloseTo(optimalHoleDiameter(150), 6)
  })

  it('needs a smaller hole when the object is close', () => {
    const near: PinholeSetup = { boxLength: 200, objectDistance: 400, holeDiameter: 0.4 }
    expect(optimalHoleDiameterFor(near)).toBeLessThan(optimalHoleDiameter(200))
  })
})

describe('brightness', () => {
  it('reports the f-number as f/d', () => {
    expect(fNumber(0.5, 100)).toBeCloseTo(200, 10)
  })

  it('quarters the light when the hole is halved', () => {
    expect(relativeBrightness(0.5, 100) / relativeBrightness(0.25, 100)).toBeCloseTo(4, 6)
  })

  it('reports a ratio of 1 at the widest hole and less below it', () => {
    const setup: PinholeSetup = { boxLength: 100, objectDistance: 2000, holeDiameter: 2 }
    expect(brightnessRatio(setup, 2)).toBeCloseTo(1, 10)
    expect(brightnessRatio({ ...setup, holeDiameter: 1 }, 2)).toBeCloseTo(0.25, 6)
  })
})

describe('sharpness meter', () => {
  it('peaks at 1 exactly at the optimal hole', () => {
    const setup: PinholeSetup = { boxLength: 120, objectDistance: 3000, holeDiameter: 0.4 }
    const best = { ...setup, holeDiameter: optimalHoleDiameterFor(setup) }
    expect(relativeSharpness(best)).toBeCloseTo(1, 6)
  })

  it('falls off on both sides of the optimum', () => {
    const setup: PinholeSetup = { boxLength: 120, objectDistance: 3000, holeDiameter: 0.4 }
    const optimum = optimalHoleDiameterFor(setup)
    expect(relativeSharpness({ ...setup, holeDiameter: optimum * 0.25 })).toBeLessThan(0.9)
    expect(relativeSharpness({ ...setup, holeDiameter: optimum * 4 })).toBeLessThan(0.9)
  })

  it('stays inside 0–1 across the whole slider range', () => {
    for (let d = 0.02; d <= 3; d += 0.01) {
      const value = relativeSharpness({ boxLength: 150, objectDistance: 2500, holeDiameter: d })
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})

describe('degenerate input never produces NaN', () => {
  const nonsense = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]

  it('survives every bad length', () => {
    for (const bad of nonsense) {
      expect(Number.isFinite(magnification(bad, 1000))).toBe(true)
      expect(Number.isFinite(geometricBlur(bad, 100, 1000))).toBe(true)
      expect(Number.isFinite(diffractionBlur(bad, 100))).toBe(true)
      expect(Number.isFinite(relativeBrightness(bad, 100))).toBe(true)
      expect(
        Number.isFinite(totalBlur({ boxLength: bad, objectDistance: bad, holeDiameter: bad })),
      ).toBe(true)
    }
  })

  it('keeps a projected point finite', () => {
    const image = projectPoint({ x: 0, y: 100 }, 0)
    expect(Number.isFinite(image.x)).toBe(true)
    expect(Number.isFinite(image.y)).toBe(true)
  })
})
