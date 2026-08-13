import { useState } from 'react'

import { Scene, SceneLabel } from '../engine/RayDiagram'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * Where this happens without anybody building anything.
 *
 * The gaps between leaves are pinholes, and the bright patches under a tree
 * are images of the sun — which is why they turn into crescents during an
 * eclipse. The trick of this scene is that nothing here is drawn as a
 * "crescent": each ground spot is a disc of sun with a disc of moon over it,
 * offset the other way round from the sky, because the image is inverted like
 * every other image in this app.
 *
 * It is also the closing wink at eclipse.anisayari.com, the project that set
 * the tone for this one.
 */

const SUN = { x: 215, y: 105, r: 54 }
const GROUND_Y = 372
const SHADOW = '#2f5d33'
const SUNLIT = '#ffe89a'

const SPOTS = [
  { x: 150, y: 424, r: 27 },
  { x: 268, y: 468, r: 20 },
  { x: 372, y: 412, r: 31 },
  { x: 486, y: 470, r: 23 },
  { x: 590, y: 420, r: 26 },
  { x: 706, y: 466, r: 18 },
  { x: 806, y: 424, r: 29 },
  { x: 902, y: 470, r: 22 },
]

const LEAVES = [
  { x: 250, y: 232, r: 84 },
  { x: 372, y: 196, r: 96 },
  { x: 500, y: 224, r: 88 },
  { x: 624, y: 194, r: 94 },
  { x: 748, y: 228, r: 86 },
  { x: 862, y: 244, r: 74 },
]

export function SunSpotsChapter() {
  const t = useT()
  const [phase, setPhase] = useState(0)

  // How far the Moon's centre sits from the Sun's, in Sun radii. Fully clear at
  // phase 0, deeply bitten at phase 1.
  const separation = 2.2 - 1.85 * phase
  const moonRadiusRatio = 1.02

  return (
    <ChapterShell
      slug="sun-spots"
      narration={t(phase > 0.15 ? 'chapter.sun-spots.say.eclipse' : 'chapter.sun-spots.say')}
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
        <rect x={0} y={0} width={1000} height={GROUND_Y} fill="#123049" />

        {/* Sun, then Moon on top of it. The Moon comes in from the right. */}
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 1.6} fill={SUNLIT} opacity={0.16} />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={SUNLIT} />
        <circle
          cx={SUN.x + SUN.r * separation}
          cy={SUN.y}
          r={SUN.r * moonRadiusRatio}
          fill="#123049"
        />

        {/* Canopy: the leaves matter less than the gaps between them. */}
        {LEAVES.map((leaf) => (
          <circle key={`${leaf.x}`} cx={leaf.x} cy={leaf.y} r={leaf.r} fill="#1f4a2a" />
        ))}
        <rect x={596} y={250} width={34} height={GROUND_Y - 250} fill="#4a3218" />

        {/* Ground in shadow. */}
        <rect x={0} y={GROUND_Y} width={1000} height={520 - GROUND_Y} fill={SHADOW} />

        {/* Every bright patch is a picture of the Sun, upside down — so the
            Moon bites it from the opposite side. */}
        {SPOTS.map((spot) => (
          <g key={`${spot.x}`}>
            <circle cx={spot.x} cy={spot.y} r={spot.r} fill={SUNLIT} opacity={0.92} />
            <circle
              cx={spot.x - spot.r * separation}
              cy={spot.y}
              r={spot.r * moonRadiusRatio}
              fill={SHADOW}
            />
          </g>
        ))}

        <SceneLabel x={20} y={300} anchor="start" tone="ink">
          {t('chapter.sun-spots.leaves')}
        </SceneLabel>
        <SceneLabel x={20} y={508} anchor="start">
          {t('chapter.sun-spots.ground')}
        </SceneLabel>
      </Scene>
    </ChapterShell>
  )
}
