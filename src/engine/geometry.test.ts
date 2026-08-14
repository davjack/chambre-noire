import { describe, expect, it } from 'vitest'

import { geometricBlur, imageHeight, projectPoint } from '../physics/optics'
import {
  AXIS_Y,
  HOLE_X,
  bandHeightMatchesBlur,
  createGeometry,
  imagePlacement,
  pictureFade,
} from './geometry'

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

  it('projects the image to the other side of the axis, at the magnified size', () => {
    const placement = imagePlacement(geometry, 100, 200)

    expect(placement.centreY).toBeCloseTo(projectPoint({ x: -440, y: 100 }, 300).y, 10)
    expect(placement.centreY).toBeLessThan(0)
    expect(placement.height).toBeCloseTo(imageHeight(200, 300, 440), 10)
  })

  it('sends every point of a figure to the mirrored point of its image', () => {
    // A chapter draws the image from its centre and its height alone. That has
    // to land each part of the figure exactly where projecting it on its own
    // would — otherwise the picture on the wall and the rays reaching it are
    // two different claims about the same box.
    const placement = imagePlacement(geometry, 40, 250)

    for (const offset of [-0.45, -0.1, 0, 0.32, 0.45]) {
      const drawnFromTheCentre = placement.centreY - offset * placement.height
      expect(drawnFromTheCentre).toBeCloseTo(geometry.landing(40 + offset * 250, 0), 10)
    }
  })

  it('draws the whole picture through a pinhole and none of it through a window', () => {
    /*
     * Zero exactly where one point of the object covers the whole picture — not
     * near it. Chapter 2 reads this number to choose which line to say, so a
     * threshold that drifted would have the app promising a picture the wall is
     * not showing, which is what it used to do.
     */
    for (const apertureDiameter of [0.01, 1, 10, 50, 100, 102, 103, 150, 300, 400]) {
      const scene = createGeometry({ objectDistance: 430, boxLength: 300, apertureDiameter })
      const surviving = pictureFade(scene.band(0).height, scene.imageHeight(250))
      const nothingLeft = scene.band(0).height >= scene.imageHeight(250)

      expect(surviving === 0).toBe(nothingLeft)
    }

    const pinhole = createGeometry({ objectDistance: 430, boxLength: 300, apertureDiameter: 0.01 })
    expect(pictureFade(pinhole.band(0).height, pinhole.imageHeight(250))).toBeCloseTo(1, 3)
  })

  it('grows the image with the box length', () => {
    const short = createGeometry({ objectDistance: 440, boxLength: 150, apertureDiameter: 10 })
    const long = createGeometry({ objectDistance: 440, boxLength: 450, apertureDiameter: 10 })
    expect(long.imageHeight(100)).toBeCloseTo(3 * short.imageHeight(100), 10)
  })
})
