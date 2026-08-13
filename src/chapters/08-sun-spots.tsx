import { useState } from 'react'

import { Scene, SceneLabel } from '../engine/RayDiagram'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * Where this happens without anybody building anything.
 *
 * The first version of this chapter asserted that the bright patches under a
 * tree are pictures of the Sun, and drew eight tidy circles on a lawn. It
 * convinced nobody, for two good reasons: the mechanism was never shown, and
 * real dappled light does not look like eight tidy circles.
 *
 * So it is built twice over now. One gap in the canopy is singled out and the
 * two rays leaving the top and bottom edges of the Sun are drawn through it,
 * crossing on the way exactly as they cross in every other chapter — and they
 * terminate on the two edges of the patch they create. That construction IS the
 * answer to "why is the patch round". The rest of the canopy then does the same
 * thing a dozen times over, irregularly, the way it looks in life.
 *
 * The eclipse slider is what proves it: the patches are not round because holes
 * are round, they are round because the SUN is. Bite the Sun and every patch
 * turns into a crescent.
 */

const SUN = { x: 150, y: 96, r: 42 }
const GAP = { x: 380, y: 280 }
const GROUND_Y = 356
/** The featured patch sits well inside the grass, with room for its label. */
const SPOT_Y = 438
const SKY = '#123049'
const SHADOW = '#2f5d33'
const SUNLIT = '#ffe89a'

/** Where a ray leaving the Sun at `sourceY` and passing the gap meets the patch. */
function landOnGround(sourceY: number): number {
  return SUN.x + ((GAP.x - SUN.x) * (SPOT_Y - sourceY)) / (GAP.y - sourceY)
}

/** The other gaps: irregular on purpose, because real dapple is. */
const OTHER_SPOTS = [
  { x: 96, y: 404, r: 19, dim: 0.84 },
  { x: 166, y: 462, r: 12, dim: 0.68 },
  { x: 240, y: 398, r: 23, dim: 0.9 },
  { x: 300, y: 470, r: 15, dim: 0.76 },
  { x: 372, y: 412, r: 11, dim: 0.64 },
  { x: 434, y: 486, r: 14, dim: 0.72 },
  { x: 726, y: 400, r: 18, dim: 0.82 },
  { x: 790, y: 468, r: 13, dim: 0.7 },
  { x: 852, y: 406, r: 22, dim: 0.88 },
  { x: 916, y: 464, r: 12, dim: 0.66 },
  { x: 690, y: 478, r: 10, dim: 0.6 },
]

/** Gaps punched through the canopy, so the leaves read as leaves with holes. */
const CANOPY_GAPS = [
  { x: 232, y: 240, r: 10 },
  { x: 296, y: 214, r: 7 },
  { x: 470, y: 232, r: 11 },
  { x: 536, y: 262, r: 8 },
  { x: 612, y: 224, r: 12 },
  { x: 686, y: 256, r: 7 },
  { x: 760, y: 232, r: 10 },
  { x: 836, y: 264, r: 8 },
  { x: 900, y: 236, r: 9 },
]

const LEAVES = [
  { x: 250, y: 236, r: 76 },
  { x: 372, y: 206, r: 84 },
  { x: 500, y: 232, r: 80 },
  { x: 624, y: 204, r: 84 },
  { x: 748, y: 236, r: 78 },
  { x: 866, y: 250, r: 68 },
]

export function SunSpotsChapter() {
  const t = useT()
  const [phase, setPhase] = useState(0)

  // Distance between the Sun's centre and the Moon's, in Sun radii: fully
  // clear at phase 0, deeply bitten at phase 1.
  const separation = 2.2 - 1.85 * phase
  const moonRadiusRatio = 1.02

  // The featured patch is not placed by hand: it is bracketed by the two rays
  // leaving the top and bottom edges of the Sun.
  const fromTop = landOnGround(SUN.y - SUN.r)
  const fromBottom = landOnGround(SUN.y + SUN.r)
  const spot = { x: (fromTop + fromBottom) / 2, r: Math.abs(fromBottom - fromTop) / 2 }

  return (
    <ChapterShell
      slug="sun-spots"
      narrationKey={phase > 0.1 ? 'chapter.sun-spots.say.eclipse' : 'chapter.sun-spots.say'}
      controls={
        <BigSlider
          label={t('chapter.sun-spots.eclipse')}
          value={phase}
          min={0}
          max={1}
          step={0.01}
          onChange={setPhase}
        />
      }
    >
      <Scene>
        <defs>
          <radialGradient id="sun-halo">
            <stop offset="0%" stopColor={SUNLIT} stopOpacity="0.45" />
            <stop offset="100%" stopColor={SUNLIT} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x={0} y={0} width={1000} height={GROUND_Y} fill={SKY} />
        <rect x={0} y={GROUND_Y} width={1000} height={520 - GROUND_Y} fill={SHADOW} />

        {/* Canopy first; the construction rays are drawn over it, because those
            two rays are precisely the ones the leaves do not stop. */}
        {LEAVES.map((leaf) => (
          <circle key={leaf.x} cx={leaf.x} cy={leaf.y} r={leaf.r} fill="#1f4a2a" />
        ))}
        {CANOPY_GAPS.map((gap) => (
          <circle key={gap.x} cx={gap.x} cy={gap.y} r={gap.r} fill={SKY} />
        ))}
        <rect x={806} y={250} width={30} height={GROUND_Y - 250} fill="#4a3218" />

        {/* The other patches, each one its own little picture of the Sun. */}
        {OTHER_SPOTS.map((other) => (
          <g key={other.x} opacity={other.dim}>
            <circle cx={other.x} cy={other.y} r={other.r} fill={SUNLIT} />
            <circle
              cx={other.x - other.r * separation}
              cy={other.y}
              r={other.r * moonRadiusRatio}
              fill={SHADOW}
            />
          </g>
        ))}

        {/* The construction: Sun edge → gap → patch edge, both rays. */}
        <g stroke={SUNLIT} strokeWidth={2.5} opacity={0.85}>
          <line x1={SUN.x} y1={SUN.y - SUN.r} x2={fromTop} y2={SPOT_Y} />
          <line x1={SUN.x} y1={SUN.y + SUN.r} x2={fromBottom} y2={SPOT_Y} />
        </g>

        {/* The Sun, and the Moon crossing it. */}
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 2.4} fill="url(#sun-halo)" />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={SUNLIT} />
        <circle
          cx={SUN.x + SUN.r * separation}
          cy={SUN.y}
          r={SUN.r * moonRadiusRatio}
          fill={SKY}
          stroke="#20415d"
          strokeWidth={2}
        />

        {/* The one gap the construction goes through, ringed to tie it to the
            patch below. */}
        <circle cx={GAP.x} cy={GAP.y} r={15} fill={SKY} />
        <circle
          cx={GAP.x}
          cy={GAP.y}
          r={15}
          fill="none"
          stroke={SUNLIT}
          strokeWidth={3}
          strokeDasharray="5 4"
        />

        {/* The patch those two rays land on — upside down, so the Moon bites it
            from the side opposite to the sky. */}
        <circle cx={spot.x} cy={SPOT_Y} r={spot.r} fill={SUNLIT} />
        <circle
          cx={spot.x - spot.r * separation}
          cy={SPOT_Y}
          r={spot.r * moonRadiusRatio}
          fill={SHADOW}
        />
        <circle
          cx={spot.x}
          cy={SPOT_Y}
          r={spot.r + 6}
          fill="none"
          stroke={SUNLIT}
          strokeWidth={3}
          strokeDasharray="5 4"
        />

        {/* Above the patch rather than below it: the viewBox ends 520 units
            down and the descenders were being clipped. */}
        <SceneLabel x={spot.x} y={SPOT_Y - spot.r - 16} tone="ink">
          {t('chapter.sun-spots.oneHole')}
        </SceneLabel>
        <SceneLabel x={22} y={508} anchor="start" tone="ink">
          {t('chapter.sun-spots.leaves')}
        </SceneLabel>
      </Scene>
    </ChapterShell>
  )
}
