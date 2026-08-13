/**
 * Deliberately a second copy of the chapter list rather than an import from
 * `src/`: the point of the smoke test is to fail if the app stops serving a
 * chapter the story promises. Reading the list from the app itself would make
 * that test agree with any regression.
 */
export const SLUGS = [
  'wow',
  'straight-light',
  'no-hole',
  'the-hole',
  'upside-down',
  'hole-size',
  'box-length',
  'your-eye',
  'your-box',
  'build-it',
] as const
