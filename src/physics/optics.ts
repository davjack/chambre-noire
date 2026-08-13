/**
 * Pinhole (camera obscura) optics.
 *
 * Pure functions: no React, no DOM, no side effects. Every visual in the app —
 * the SVG ray diagrams and the WebGL aperture simulation alike — reads its
 * numbers from here, so the pictures cannot drift away from the physics.
 *
 * Units: millimetres everywhere, wavelength included. Keeping one unit system
 * is what makes the formulas below readable as written.
 *
 * Formulas: https://en.wikipedia.org/wiki/Pinhole_camera
 */

/** 550 nm, near the peak of daylight sensitivity — the conventional reference. */
export const GREEN_LIGHT_MM = 550e-6

/** Smallest value any length is allowed to take, to keep divisions finite. */
const EPSILON_MM = 1e-6

export interface PinholeSetup {
  /** f — distance from the hole to the back wall of the box. */
  boxLength: number
  /** u — distance from the object to the hole. */
  objectDistance: number
  /** d — diameter of the hole. */
  holeDiameter: number
  /** λ — defaults to green light. */
  wavelength?: number
}

export interface Point2D {
  x: number
  y: number
}

/**
 * Clamps rather than throws.
 *
 * Sliders in the UI never produce a non-positive length, but a NaN escaping
 * into an SVG path silently blanks a whole scene, whereas an exception during
 * render blanks the app in front of a six-year-old. Clamping fails visibly and
 * harmlessly instead.
 */
function positive(value: number): number {
  return Number.isFinite(value) && value > EPSILON_MM ? value : EPSILON_MM
}

/**
 * Magnification m = f / u.
 *
 * The image is inverted, which the sign does not carry here: inversion is a
 * geometric fact expressed by `projectPoint`, and a negative magnification
 * would only make the diagram code fight it.
 */
export function magnification(boxLength: number, objectDistance: number): number {
  return positive(boxLength) / positive(objectDistance)
}

/** Height of the projected image of an object of height `objectHeight`. */
export function imageHeight(
  objectHeight: number,
  boxLength: number,
  objectDistance: number,
): number {
  return objectHeight * magnification(boxLength, objectDistance)
}

/**
 * Where a point of the scene lands on the back wall.
 *
 * The hole sits at the origin, the object side is x < 0, the wall is at x = +f.
 * Both coordinates flip sign, which is the whole reason the image is upside
 * down *and* mirrored left-to-right.
 */
export function projectPoint(source: Point2D, boxLength: number): Point2D {
  const f = positive(boxLength)
  const u = positive(-source.x)
  const scale = f / u
  return { x: f, y: -source.y * scale }
}

/**
 * Geometric blur: the hole is not a point, so every scene point paints a small
 * disc on the wall. b = d · (f + u) / u.
 *
 * Bigger hole → bigger disc → blurrier. This is the term a child controls
 * directly, and the one that dominates for large holes.
 */
export function geometricBlur(
  holeDiameter: number,
  boxLength: number,
  objectDistance: number,
): number {
  const u = positive(objectDistance)
  return positive(holeDiameter) * ((positive(boxLength) + u) / u)
}

/**
 * Diffraction blur: below a certain size the hole stops behaving like a hole
 * and light spreads out on its way through. b = 2.44 · λ · f / d (the Airy
 * disc diameter).
 *
 * Smaller hole → *more* blur. This is the term that makes "smaller is always
 * sharper" false, and it is why the app can show a genuine sweet spot.
 */
export function diffractionBlur(
  holeDiameter: number,
  boxLength: number,
  wavelength: number = GREEN_LIGHT_MM,
): number {
  return (2.44 * positive(wavelength) * positive(boxLength)) / positive(holeDiameter)
}

/**
 * The two blurs combined in quadrature — the standard approximation, and the
 * curve whose minimum is the sweet spot.
 */
export function totalBlur(setup: PinholeSetup): number {
  const geometric = geometricBlur(setup.holeDiameter, setup.boxLength, setup.objectDistance)
  const diffraction = diffractionBlur(setup.holeDiameter, setup.boxLength, setup.wavelength)
  return Math.hypot(geometric, diffraction)
}

/**
 * The hole diameter that minimises `totalBlur` for a distant object —
 * Young's formula, d = √(2.44 · λ · f) ≈ 1.562 · √(λf), i.e. 0.0366 · √f mm
 * for green light.
 */
export function optimalHoleDiameter(
  boxLength: number,
  wavelength: number = GREEN_LIGHT_MM,
): number {
  return Math.sqrt(2.44 * positive(wavelength) * positive(boxLength))
}

/**
 * Same optimum, but honest about a nearby object.
 *
 * Setting d/dd of (d·k)² + (2.44λf/d)² to zero, with k = (f + u) / u, gives
 * d = √(2.44 · λ · f / k). It collapses to `optimalHoleDiameter` as u grows,
 * which is exactly what the unit tests check.
 */
export function optimalHoleDiameterFor(setup: PinholeSetup): number {
  const f = positive(setup.boxLength)
  const u = positive(setup.objectDistance)
  const k = (f + u) / u
  return Math.sqrt((2.44 * positive(setup.wavelength ?? GREEN_LIGHT_MM) * f) / k)
}

/**
 * f-number N = f / d. The photographer's name for "how dim this is".
 * A shoebox pinhole typically lands around f/200 — a thousand times dimmer
 * than a phone camera, which is why the chapter on hole size has to show the
 * darkness rather than hide it.
 */
export function fNumber(holeDiameter: number, boxLength: number): number {
  return positive(boxLength) / positive(holeDiameter)
}

/**
 * Illuminance on the wall, relative and unnormalised: proportional to (d / f)².
 * Halving the hole quarters the light — the trade the child is being shown.
 */
export function relativeBrightness(holeDiameter: number, boxLength: number): number {
  const n = fNumber(holeDiameter, boxLength)
  return 1 / (n * n)
}

/**
 * Sharpness on a 0–1 scale, where 1 is the best this box can possibly do.
 *
 * Defined as bestBlur / actualBlur so the meter in the UI is a ratio to the
 * achievable optimum rather than an arbitrary curve.
 */
export function relativeSharpness(setup: PinholeSetup): number {
  const best = totalBlur({ ...setup, holeDiameter: optimalHoleDiameterFor(setup) })
  const actual = totalBlur(setup)
  return actual > 0 ? Math.min(1, best / actual) : 0
}

/**
 * Brightness on a 0–1 scale, relative to the widest hole a scene offers.
 * Kept separate from `relativeBrightness` so the raw physics stays raw.
 */
export function brightnessRatio(setup: PinholeSetup, widestHoleDiameter: number): number {
  const reference = relativeBrightness(widestHoleDiameter, setup.boxLength)
  if (reference <= 0) return 0
  return Math.min(1, relativeBrightness(setup.holeDiameter, setup.boxLength) / reference)
}
