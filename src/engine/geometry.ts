import { geometricBlur, projectPoint, type Point2D } from '../physics/optics'

/**
 * The bridge between the physics and the picture.
 *
 * Scene coordinates put the hole at the origin, the object side at x < 0 and
 * the back wall at x = +boxLength, with y positive upwards — exactly the frame
 * `optics.ts` works in. `toSvg` is the only place that flips y and shifts the
 * origin, so every diagram in the app is drawn from the same geometry rather
 * than from a hand-placed approximation of it.
 *
 * Diagram units are SVG user units. A schematic scale is unavoidable: a real
 * shoebox pinhole is 0.4 mm across next to a two-metre subject, and drawn to
 * scale the hole would be invisible and the object off-screen. What is *not*
 * negotiable is internal consistency — a ray drawn through the hole lands
 * where `optics.ts` says it lands, and the lit band on the wall is exactly
 * `geometricBlur` tall.
 */

export const VIEW_WIDTH = 1000
export const VIEW_HEIGHT = 520
export const AXIS_Y = 260
export const HOLE_X = 580

export interface SceneGeometry {
  objectDistance: number
  boxLength: number
  apertureDiameter: number
  holeX: number
  axisY: number
  objectX: number
  wallX: number
  toSvg: (point: Point2D) => Point2D
  /** Where a ray leaving `sourceY` and passing the aperture at `apertureY` lands. */
  landing: (sourceY: number, apertureY: number) => number
  /** The strip of wall lit by one point of the object. */
  band: (sourceY: number) => { top: number; bottom: number; height: number; centre: number }
  /** Height of the projected image of an object `height` tall. */
  imageHeight: (height: number) => number
}

export interface SceneGeometryInput {
  objectDistance: number
  boxLength: number
  apertureDiameter: number
  holeX?: number
  axisY?: number
}

export function createGeometry({
  objectDistance,
  boxLength,
  apertureDiameter,
  holeX = HOLE_X,
  axisY = AXIS_Y,
}: SceneGeometryInput): SceneGeometry {
  const toSvg = (point: Point2D): Point2D => ({
    x: holeX + point.x,
    y: axisY - point.y,
  })

  /*
   * A ray from (-u, sourceY) through (0, apertureY) reaches the wall at
   *   apertureY · (1 + f/u) − sourceY · f/u
   * which collapses to the familiar −sourceY·f/u through the centre of the
   * hole, and spans exactly `geometricBlur` when apertureY sweeps the aperture.
   */
  const landing = (sourceY: number, apertureY: number): number => {
    const scale = boxLength / objectDistance
    return apertureY * (1 + scale) - sourceY * scale
  }

  const band = (sourceY: number) => {
    const half = apertureDiameter / 2
    const top = landing(sourceY, half)
    const bottom = landing(sourceY, -half)
    return {
      top,
      bottom,
      height: Math.abs(top - bottom),
      centre: projectPoint({ x: -objectDistance, y: sourceY }, boxLength).y,
    }
  }

  return {
    objectDistance,
    boxLength,
    apertureDiameter,
    holeX,
    axisY,
    objectX: holeX - objectDistance,
    wallX: holeX + boxLength,
    toSvg,
    landing,
    band,
    imageHeight: (height: number) => height * (boxLength / objectDistance),
  }
}

/**
 * The lit band and the geometric blur are the same quantity seen twice. Exposed
 * so the unit tests can hold the drawing to the physics.
 */
export function bandHeightMatchesBlur(geometry: SceneGeometry, sourceY: number): boolean {
  const drawn = geometry.band(sourceY).height
  const physical = geometricBlur(
    geometry.apertureDiameter,
    geometry.boxLength,
    geometry.objectDistance,
  )
  return Math.abs(drawn - physical) < 1e-9
}
