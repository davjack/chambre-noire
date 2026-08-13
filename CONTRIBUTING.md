# Contributing to La Chambre Noire

An interactive explanation of the camera obscura (pinhole camera) for children
from age 6. Static site, no backend.

Before changing anything, please read *The rules that are not style
preferences* below. They are short, and each one exists because breaking it
once cost something.

## Verification

```
npm run verify
```

= `typecheck` + `lint` + `test` + `build` + `size`
(`tsc --noEmit`, `oxlint`, `vitest run`, `vite build`, gzip budget assertion).

End-to-end and accessibility run separately, because they need a browser:

```
npm run e2e        # Playwright: smoke, axe WCAG 2.2 AA, canvas pixels, layout
```

If the browser is missing: `npx playwright install chromium`.

Three projects: `desktop`, `tablet-portrait` and `dev-strict-mode`. The last one
runs `e2e/canvas.spec.ts` against `npm run dev`, where React StrictMode mounts
every effect twice. That is not belt-and-braces — a real bug lived only there,
invisible to every test run against the production build.

## Branching

Work lands directly on `main`. There is no release branch and no pull-request
requirement; keep `main` green instead.

## Stack

Vite 8 (Rolldown) · React 19 · TypeScript 7 · Tailwind CSS 4 · oxlint · Vitest 4
· Playwright 1.62.

**ESLint is not an option here**: `typescript-eslint` declares
`"typescript": ">=4.8.4 <6.1.0"`, so it cannot run against TypeScript 7. oxlint
is used instead, and its type-aware rules are built on the same Go port of the
compiler. If oxlint ever blocks the work, the documented fallback is to pin
TypeScript 6 and switch back.

## The rules that are not style preferences

- **The physics lives in `src/physics/optics.ts`.** Pure functions, unit-tested,
  no React. Every diagram and the shader read their numbers from it. A picture
  that disagrees with the physics teaches the wrong thing very convincingly, so
  never hard-code a coordinate that `optics.ts` could produce.
- **`src/engine/geometry.ts` is the only place scene coordinates are computed.**
  It flips y and shifts the origin; nothing else may.
- **No user-facing string outside `src/i18n/*.json`.** French is the reference
  dictionary and the `TranslationKey` type is derived from it, so a missing
  English key fails the build. A unit test also fails on any key the app no
  longer renders.
- **Whatever is spoken is also on screen.** Narration is an enhancement over
  text, never a replacement.
- **The narration is a shipped recording, not `speechSynthesis`.** Browser
  voices are a lottery — measured on one machine: Firefox offered 14 805 eSpeak
  variants no child can follow, Brave offered none at all.
  `scripts/generate-narration.py` writes the clips, and a unit test fails when a
  narrated line has no audio, so the two cannot drift apart.
- **Do not explain a limitation to someone who cannot act on it.** The app once
  told the child "no voice on this device", which a six-year-old cannot fix and
  an adult was not reading. Absent controls degrade silently; the instructions
  for restoring them belong in the README. Anything addressed to a grown-up
  belongs in the documentation, not on the screen.
- **Verify in a browser the audience uses.** Two of the worst defects in this
  project's history were invisible to a green test suite: one appeared only
  under `npm run dev`, the other only in a screenshot. Read the pixels.
- **Accessibility is verified, not intended.** `npm run e2e` runs axe against
  WCAG 2.2 AA on every chapter, and a layout suite checks that the navigation
  and the narrated line stay on screen across eight viewports without scrolling.
  Keep both at zero failures.
- **The gzip budget is enforced by the build.** 200 KB, asserted in
  `npm run verify`. School tablets on shared wifi are the target.

## Writing for six-year-olds

Twelve words per sentence, present tense, `tutoiement`, CE1 vocabulary. A unit
test caps spoken lines at 90 characters. No timer, no failure state, no score.

Changing a narrated line means regenerating its audio clip — see
[the README](README.md#the-narration).

## Where the reasoning lives

[`docs/decisions.md`](docs/decisions.md) records why the stack looks the way it
does: what was weighed, what was rejected, and which objections to the current
design are still open. Read it before proposing a structural change — the
answer may already be there, with its reasons.
