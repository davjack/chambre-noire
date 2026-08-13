import { diffractionBlur, geometricBlur } from '../physics/optics'

export interface PinholeParams {
  /** d, millimetres. */
  holeDiameter: number
  /** f, millimetres. */
  boxLength: number
  /** u, millimetres. */
  objectDistance: number
  /** Height of the back wall in millimetres — sets the scale of the blur. */
  wallHeight: number
  /** 0–1. The honest value is (d/d_max)²; 1 once the eye has adapted. */
  exposure: number
}

export interface BlurRadii {
  /** Half the geometric blur, as a fraction of the wall's height. */
  geometric: number
  /** Half the Airy diameter, in the same units. */
  diffraction: number
}

/**
 * The single conversion between the physics and the shader: millimetres of blur
 * on a wall of a given height, expressed as a fraction of that height, which is
 * the only unit a fragment shader can sample in.
 *
 * It lives apart from the canvas component so it can be tested without a GPU.
 * Getting it wrong does not throw — it silently renders a picture that is
 * blurrier or crisper than the optics say, which is the failure this app can
 * least afford.
 */
export function blurRadii(params: PinholeParams): BlurRadii {
  const wall = params.wallHeight
  return {
    geometric:
      geometricBlur(params.holeDiameter, params.boxLength, params.objectDistance) / 2 / wall,
    diffraction: diffractionBlur(params.holeDiameter, params.boxLength) / 2 / wall,
  }
}
