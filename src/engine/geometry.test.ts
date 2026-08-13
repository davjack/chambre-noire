import { describe, expect, it } from 'vitest'

import { geometricBlur } from '../physics/optics'
import { AXIS_Y, HOLE_X, bandHeightMatchesBlur, createGeometry } from './geometry'

const geometry = createGeometry({
  objectDistance: 440,
  boxLength: 300,
  apertureDiameter: 24,
})

describe('scene geometry', () => {
  it('places the hole, the object and the wall where the numbers say', () => {
    expect(geometry.holeX).toBe(HOLE_X)
    expect(geometry.objectX).toBe(HOLE_X - 440)
    expect(geometry.wallX).toBe(HOLE_X + 300)
  })

  it('flips y when converting to SVG, and only there', () => {
    expect(geometry.toSvg({ x: 0, y: 0 })).toEqual({ x: HOLE_X, y: AXIS_Y })
    expect(geometry.toSvg({ x: -440, y: 100 })).toEqual({ x: HOLE_X - 440, y: AXIS_Y - 100 })
  })

  it('sends a ray through the centre of the hole to the inverted image point', () => {
    expect(geometry.landing(100, 0)).toBeCloseTo((-100 * 300) / 440, 10)
  })

  it('draws a lit band exactly as tall as the geometric blur', () => {
    for (const sourceY of [-150, -40, 0, 40, 150]) {
      expect(bandHeightMatchesBlur(geometry, sourceY)).toBe(true)
    }
    expect(geometry.band(0).height).toBeCloseTo(geometricBlur(24, 300, 440), 10)
  })

  it('shrinks the band to a point as the hole closes', () => {
    const pinhole = createGeometry({ objectDistance: 440, boxLength: 300, apertureDiameter: 0.01 })
    const { height, centre, top } = pinhole.band(120)
    expect(height).toBeLessThan(0.05)
    expect(Math.abs(centre - top)).toBeLessThan(height)
  })

  it('centres the band on the image point whatever the hole size', () => {
    const wide = createGeometry({ objectDistance: 440, boxLength: 300, apertureDiameter: 90 })
    const { top, bottom, centre } = wide.band(-80)
    expect((top + bottom) / 2).toBeCloseTo(centre, 10)
  })

  it('grows the image with the box length', () => {
    const short = createGeometry({ objectDistance: 440, boxLength: 150, apertureDiameter: 10 })
    const long = createGeometry({ objectDistance: 440, boxLength: 450, apertureDiameter: 10 })
    expect(long.imageHeight(100)).toBeCloseTo(3 * short.imageHeight(100), 10)
  })
})
