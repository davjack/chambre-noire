import { useState } from 'react'

import { Scene, SceneLabel } from '../engine/RayDiagram'
import { AXIS_Y, VIEW_HEIGHT } from '../engine/geometry'
import { useT } from '../i18n/useT'
import { BigSlider } from '../shell/BigSlider'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * Idea one: light travels in straight lines.
 *
 * Nothing here is about pinholes yet. The child moves a lamp and every ray
 * stays a straight line; a hand in the way makes a shadow with sharp edges
 * that move with the lamp. Both facts are needed before the hole can mean
 * anything, and both are visible without a word of explanation.
 */

const LAMP_X = 140
const WALL_X = 890
const HAND_X = 520
const HAND_HALF_HEIGHT = 72
const RAY_TARGETS = [-200, -155, -110, -65, -20, 25, 70, 115, 160, 205]

export function StraightLightChapter() {
  const t = useT()
  const [lampY, setLampY] = useState(60)
  const [handIn, setHandIn] = useState(false)

  const toHand = (HAND_X - LAMP_X) / (WALL_X - LAMP_X)
  const toWall = (WALL_X - LAMP_X) / (HAND_X - LAMP_X)

  const shadowEdges = [HAND_HALF_HEIGHT, -HAND_HALF_HEIGHT].map(
    (edge) => lampY + (edge - lampY) * toWall,
  )
  const shadowTop = Math.min(...shadowEdges)
  const shadowBottom = Math.max(...shadowEdges)

  return (
    <ChapterShell
      slug="straight-light"
      narration={t(handIn ? 'chapter.straight-light.say.blocked' : 'chapter.straight-light.say')}
      controls={
        <div className="flex flex-col gap-3">
          <BigSlider
            label={t('chapter.straight-light.lamp')}
            value={lampY}
            min={-170}
            max={170}
            step={1}
            onChange={setLampY}
          />
          <button
            type="button"
            className="pill self-center"
            data-variant={handIn ? 'primary' : undefined}
            onClick={() => setHandIn((current) => !current)}
            aria-pressed={handIn}
          >
            {t(handIn ? 'chapter.straight-light.handOff' : 'chapter.straight-light.hand')}
          </button>
        </div>
      }
    >
      <Scene>
        {/* The wall the light lands on. */}
        <rect x={WALL_X} y={20} width={18} height={VIEW_HEIGHT - 40} className="fill-wall" />

        {RAY_TARGETS.map((target) => {
          const heightAtHand = lampY + (target - lampY) * toHand
          const blocked = handIn && Math.abs(heightAtHand) <= HAND_HALF_HEIGHT
          const endX = blocked ? HAND_X : WALL_X
          const endY = blocked ? AXIS_Y - heightAtHand : AXIS_Y - target
          return (
            <line
              key={target}
              x1={LAMP_X}
              y1={AXIS_Y - lampY}
              x2={endX}
              y2={endY}
              stroke="var(--color-ray)"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={blocked ? 0.55 : 0.85}
            />
          )
        })}

        {handIn ? (
          <>
            <rect
              x={WALL_X}
              y={AXIS_Y - shadowBottom}
              width={18}
              height={shadowBottom - shadowTop}
              className="fill-night"
            />
            <SceneLabel x={WALL_X - 16} y={AXIS_Y - (shadowTop + shadowBottom) / 2 + 8} anchor="end">
              {t('chapter.straight-light.shadow')}
            </SceneLabel>
            <rect
              x={HAND_X - 16}
              y={AXIS_Y - HAND_HALF_HEIGHT}
              width={32}
              height={HAND_HALF_HEIGHT * 2}
              rx={16}
              className="fill-edge"
              stroke="var(--color-muted)"
              strokeWidth={3}
            />
          </>
        ) : null}

        {/* The lamp: a warm disc with a halo, so it reads as a source. */}
        <circle cx={LAMP_X} cy={AXIS_Y - lampY} r={46} fill="var(--color-glow)" opacity={0.18} />
        <circle cx={LAMP_X} cy={AXIS_Y - lampY} r={24} fill="var(--color-ray)" />
      </Scene>
    </ChapterShell>
  )
}
