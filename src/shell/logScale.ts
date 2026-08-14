/**
 * A slider that moves in ratios rather than in steps.
 *
 * The sharpest pinhole for the 300 mm box chapter 5 models is 0.63 mm out of a
 * 0.05–5 mm range. On a linear track that sweet spot sits at 12 % of the width
 * and a child sweeps straight past it; on this one it lands near the middle.
 * Every scale in the app where the interesting value is orders of magnitude from
 * the ends should use it.
 */
export interface LogScale {
  /** Slider position (0–1) → real value. */
  toValue: (slider: number) => number
  /** Real value → slider position (0–1). */
  toSlider: (value: number) => number
  min: number
  max: number
}

export function logScale(min: number, max: number): LogScale {
  if (!(min > 0) || !(max > min)) {
    throw new RangeError(`logScale needs 0 < min < max, got ${min}–${max}`)
  }
  const span = Math.log(max / min)
  return {
    min,
    max,
    toValue: (slider) => min * Math.exp(span * slider),
    toSlider: (value) => Math.log(Math.max(value, min) / min) / span,
  }
}
