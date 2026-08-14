import { brightnessRatio, type PinholeSetup } from '../physics/optics'

/** Below this the room counts as dark, and the picture has finished going grey. */
export const DARK_BELOW = 35
/** How much further up the slider the colour takes to come back in full. */
const COLOUR_SPREAD = 30

export interface EyeLight {
  /** Opacity for the room, and everything standing in it to be looked at. */
  room: number
  /** Opacity for the picture at the back of the eye. */
  retina: number
  /** Opacity for the light in flight between the two. */
  beams: number
  /** How much of the picture's colour survives, 0 to 1. */
  saturation: number
}

/**
 * What the room's light leaves for each part of *Ton œil est une boîte noire*.
 *
 * Pure, and separate from the chapter that draws it, for the same reason
 * `eclipseImage` is: this is where the picture can quietly stop telling the
 * truth, so it is the part a test has to be able to hold. The scale is a
 * rendering choice — a real retina answers light over about six orders of
 * magnitude and a pupil recovers barely one of them, which no slider running 0
 * to 100 can spell — but the *shape* is not, and three of these were wrong at
 * some point while the chapter was being built:
 *
 *  - `retina` rises with the light, everywhere. It carries the pupil's own
 *    contribution, which goes as the square of its diameter because that is how
 *    the area of a hole goes — so it is read from `optics.ts` rather than
 *    written out again — and that term pulls the other way as the room darkens.
 *    Written carelessly the curve turns over, and the picture brightens as the
 *    child turns the light off.
 *  - `retina` stays under `room`, everywhere. Opacity is how much light there
 *    is, in every chapter of this app; a picture drawn brighter than the object
 *    it is a picture of makes a claim none of them means to make. The two
 *    crossed at light 31 once.
 *  - the colour has *finished* draining by `DARK_BELOW`, which is where the
 *    narration switches to the line about everything turning grey. Anchored the
 *    other way round the drain merely starts there, and the line is spoken over
 *    a picture still 97 % coloured.
 *
 * The floors are not taste either: below them the object and the picture fall
 * under the 3:1 this project holds itself to, measured on rendered pixels, and
 * nothing in the test suite can see that.
 *
 * `beams` is a fixed share of `room` and never a curve of its own. It was one
 * briefly, falling faster, to darken the background the picture is read
 * against — and that put the light travelling through the pupil dropping faster
 * than the room it crosses, on the screen whose narrated line says the pupil is
 * opening to catch more of it. The floor belongs under the picture, where it is,
 * not under the light.
 *
 * `pupil` is a `PinholeSetup` because `brightnessRatio` takes one, but only its
 * `holeDiameter` reaches the result: the `1/f²` in the ratio cancels against its
 * own reference. So the scene units passed here rather than the millimetres
 * `optics.ts` documents are harmless — the quantity is scale-free — and changing
 * `EYE_DEPTH` will not move this number.
 */
export function eyeLight(light: number, pupil: PinholeSetup, widestPupil: number): EyeLight {
  const lit = Math.max(0, Math.min(1, light / 100))
  const room = 0.56 + 0.44 * lit

  return {
    room,
    retina: 0.3 + 0.468 * lit + 0.22 * brightnessRatio(pupil, widestPupil),
    beams: 0.28 * room,
    saturation: Math.max(0, Math.min(1, (light - DARK_BELOW) / COLOUR_SPREAD)),
  }
}

/** The light at which the colour is fully back. Exposed for the test that pins it. */
export const COLOUR_BACK_AT = DARK_BELOW + COLOUR_SPREAD
