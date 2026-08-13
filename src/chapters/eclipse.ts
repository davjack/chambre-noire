import type { SceneGeometry } from '../engine/geometry'

export interface EclipseImage {
  /** Radius of the Sun's picture, in scene units. */
  imageRadius: number
  /** Radius of the Moon's picture, in scene units. */
  moonImageRadius: number
  /** Centre of the Moon's picture, in scene y — negative when the Moon is above. */
  moonImageCentre: number
  /** The lit strip on the back wall, in SVG y. */
  litTop: number
  litBottom: number
  /** The part of that strip the Moon has taken away, in SVG y. */
  shadowTop: number
  shadowHeight: number
}

/**
 * What an eclipsed Sun puts on the back wall of the box.
 *
 * Pure, and separate from the chapter that draws it, for the same reason
 * `bandHeightMatchesBlur` is exposed by the engine: this is where a picture can
 * quietly stop agreeing with the physics, so it is the part a test has to be
 * able to hold. Two things it guarantees, both of which were wrong at some
 * point while the chapter was being built:
 *
 *  - the shadow never extends past the picture. The Moon darkens the Sun's
 *    image, not the wall around it — beyond the edge of the picture there was
 *    no light to take away.
 *  - the shadow is on the opposite side from the sky. A Moon above the axis
 *    covers the top of the Sun and the bottom of its picture, because the rays
 *    crossed at the hole; that inversion comes from `geometry`, never from a
 *    negated offset written by hand.
 */
export function eclipseImage(
  geometry: SceneGeometry,
  { sunRadius, moonRadius, moonCentreY }: { sunRadius: number; moonRadius: number; moonCentreY: number },
): EclipseImage {
  const imageRadius = geometry.imageHeight(sunRadius)
  const moonImageRadius = geometry.imageHeight(moonRadius)
  const moonImageCentre = geometry.landing(moonCentreY, 0)

  const onWall = (sceneY: number) => geometry.toSvg({ x: geometry.boxLength, y: sceneY }).y
  const litTop = onWall(imageRadius)
  const litBottom = onWall(-imageRadius)

  // Both ends are clamped into the lit strip, not just the one that overlaps
  // it. Clamping a single end leaves the other outside the picture whenever
  // the Moon has not reached the Sun yet: the height comes out zero, so
  // nothing is drawn and the scene looks right, but the position handed back
  // is meaningless — and the next caller to place something at `shadowTop`
  // would put it on bare wall.
  const clamp = (value: number) => Math.min(Math.max(value, litTop), litBottom)
  const shadowTop = clamp(onWall(moonImageCentre + moonImageRadius))
  const shadowBottom = clamp(onWall(moonImageCentre - moonImageRadius))

  return {
    imageRadius,
    moonImageRadius,
    moonImageCentre,
    litTop,
    litBottom,
    shadowTop,
    shadowHeight: Math.max(0, shadowBottom - shadowTop),
  }
}
