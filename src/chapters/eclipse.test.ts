import { describe, expect, it } from 'vitest'

import { createGeometry } from '../engine/geometry'
import { eclipseImage } from './eclipse'

const SUN_RADIUS = 78
const MOON_RADIUS = SUN_RADIUS * 1.02

const geometry = createGeometry({
  objectDistance: 300,
  boxLength: 210,
  apertureDiameter: 8,
  holeX: 470,
})

/** The slider sweep the chapter offers, from clear Sun to deep bite. */
const separations = [2.05, 1.8, 1.5, 1.2, 0.9, 0.6, 0.35]
const image = (separation: number) =>
  eclipseImage(geometry, {
    sunRadius: SUN_RADIUS,
    moonRadius: MOON_RADIUS,
    moonCentreY: SUN_RADIUS * separation,
  })

describe('the picture of an eclipse on the back wall', () => {
  it('is the projected Sun, exactly', () => {
    expect(image(2.05).imageRadius).toBeCloseTo(geometry.imageHeight(SUN_RADIUS), 10)
    const { litTop, litBottom } = image(2.05)
    expect(litBottom - litTop).toBeCloseTo(2 * geometry.imageHeight(SUN_RADIUS), 10)
  })

  /*
   * This one is the reason the file exists. The shadow was drawn at the full
   * height of the Moon's projected disc, so with the Sun still clear it sat
   * below the picture entirely — a dull block on a wall that no light had
   * reached. Nothing physical happens outside the picture.
   */
  it('never darkens wall the Sun was not lighting', () => {
    for (const separation of separations) {
      const { litTop, litBottom, shadowTop, shadowHeight } = image(separation)
      expect(shadowTop).toBeGreaterThanOrEqual(litTop)
      expect(shadowTop + shadowHeight).toBeLessThanOrEqual(litBottom + 1e-9)
      expect(shadowHeight).toBeGreaterThanOrEqual(0)
    }
  })

  it('leaves the picture whole while the discs are still apart', () => {
    expect(image(2.05).shadowHeight).toBe(0)
  })

  it('eats more of it the further the Moon comes over', () => {
    const heights = separations.map((separation) => image(separation).shadowHeight)
    for (let i = 1; i < heights.length; i += 1) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1] ?? 0)
    }
    expect(heights.at(-1)).toBeGreaterThan(0)
  })

  /*
   * The chapter's whole claim: the Moon bites the top of the Sun, and the
   * picture is bitten at the bottom, because the rays crossed at the hole. If
   * this ever passes with both on the same side, the diagram is teaching the
   * opposite of chapter 4.
   */
  it('bites the picture on the side opposite the sky', () => {
    const { moonImageCentre, shadowTop, shadowHeight, litTop, litBottom } = image(0.6)

    // The Moon is above the axis in scene coordinates; its picture is below.
    expect(moonImageCentre).toBeLessThan(0)

    // And on screen, where y grows downwards, the dark part sits in the lower
    // half of the lit strip.
    const shadowMiddle = shadowTop + shadowHeight / 2
    expect(shadowMiddle).toBeGreaterThan((litTop + litBottom) / 2)
  })

  it('mirrors itself when the Moon passes on the other side', () => {
    const above = image(0.6)
    const below = eclipseImage(geometry, {
      sunRadius: SUN_RADIUS,
      moonRadius: MOON_RADIUS,
      moonCentreY: -SUN_RADIUS * 0.6,
    })
    expect(below.shadowHeight).toBeCloseTo(above.shadowHeight, 10)
    expect(below.shadowTop).toBeCloseTo(above.litTop + (above.litBottom - (above.shadowTop + above.shadowHeight)), 10)
  })
})
