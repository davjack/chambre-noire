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

/** Where the image of an object lands on the wall: its centre and its height. */
export interface ImagePlacement {
  /** Scene y of the middle of the image — on the far side of the axis. */
  centreY: number
  /** Its height, in scene units. */
  height: number
}

/**
 * The picture the box makes of an object `height` tall centred at `centreY`.
 *
 * Two lines of arithmetic, named, because a chapter that draws the image has to
 * derive both numbers from the same projection the rays are drawn with. Written
 * out at each call site, the day one of them keeps the sign of `centreY` the
 * diagram still looks entirely plausible — and teaches the opposite of the
 * chapter it is on.
 */
export function imagePlacement(
  geometry: SceneGeometry,
  centreY: number,
  height: number,
): ImagePlacement {
  return {
    centreY: geometry.landing(centreY, 0),
    height: geometry.imageHeight(height),
  }
}

/**
 * How much of the picture is worth drawing at all, 0 to 1.
 *
 * One at a pinhole, and zero once a single point of the object smears across
 * the whole picture: past there nothing is left to recognise, and drawing a
 * smear anyway would claim otherwise on the chapter whose thesis is that a wide
 * window gives no picture.
 *
 * Exported because that chapter reads the same number to choose which line to
 * say. Written out twice it was written out differently, and the app spent
 * fifty units of its slider promising a picture the wall was not showing.
 */
export function pictureFade(blur: number, imageHeight: number): number {
  if (imageHeight <= 0) return 0
  return Math.max(0, Math.min(1, 1 - blur / imageHeight))
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
