import { useId, type ReactNode } from 'react'

import { VIEW_HEIGHT, VIEW_WIDTH, type SceneGeometry } from './geometry'

/**
 * The drawing kit every chapter shares.
 *
 * Nothing here positions anything by hand: every coordinate comes from
 * `SceneGeometry`, which comes from `optics.ts`. That is the point — a diagram
 * that disagrees with the physics teaches the wrong thing very convincingly.
 *
 * Accessibility: the scenes are `aria-hidden`. They are not decorative, but
 * everything they show is stated in the live narration line, which updates as
 * the child manipulates the controls. A duplicated `aria-label` on the SVG
 * would make a screen reader say the same sentence twice; a generic one
 * ("diagram of a pinhole camera") would say less than the narration already
 * does.
 */

export function Scene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={`h-full w-full ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** `useId` output is not safe inside `url(#…)`; the delimiters go, uniqueness stays. */
function useSafeId(): string {
  return useId().replaceAll(/[^\dA-Za-z-]/g, '')
}

/**
 * The dark chamber.
 *
 * Everything the box contains — the back wall, the beams, the image — is passed
 * as children so it is drawn *between* the chamber floor and the walls.
 * Painting the chamber over the beams instead was the obvious mistake, and it
 * hid the very crossing this app exists to show.
 *
 * The children are clipped to "anywhere left of the front wall, or inside the
 * chamber": light approaching the box travels freely, light past the aperture
 * is confined, exactly as a real box confines it.
 */
/**
 * How far the chamber runs past the back wall. Exported with `boxInnerWidth`
 * so a chapter filling the chamber — a light leak, a wash — covers exactly what
 * `Box` clips to, instead of recopying the number and quietly falling short of
 * it later.
 */
export const BOX_BACK_MARGIN = 18

/** Width of the chamber a `Box` draws, from the hole to past the back wall. */
export function boxInnerWidth(geometry: SceneGeometry): number {
  return geometry.wallX - geometry.holeX + BOX_BACK_MARGIN
}

export function Box({
  geometry,
  apertureHeight,
  halfHeight = 210,
  children,
}: {
  geometry: SceneGeometry
  /** Visual height of the opening, in scene units. */
  apertureHeight: number
  halfHeight?: number
  children?: ReactNode
}) {
  const clipId = useSafeId()
  const { holeX, axisY } = geometry
  const half = apertureHeight / 2
  const top = axisY - halfHeight
  const bottom = axisY + halfHeight
  const innerWidth = boxInnerWidth(geometry)

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={holeX} height={VIEW_HEIGHT} />
          <rect x={holeX} y={top} width={innerWidth} height={halfHeight * 2} />
        </clipPath>
      </defs>

      <rect x={holeX} y={top} width={innerWidth} height={halfHeight * 2} className="fill-chamber" />

      <g clipPath={`url(#${clipId})`}>{children}</g>

      {/* Front wall, in two pieces: the gap between them is the aperture.
          Clamped, because chapter 2 opens the window wider than the wall. */}
      <rect
        x={holeX - 7}
        y={top}
        width={14}
        height={Math.max(0, axisY - half - top)}
        className="fill-edge"
      />
      <rect
        x={holeX - 7}
        y={Math.min(bottom, axisY + half)}
        width={14}
        height={Math.max(0, bottom - (axisY + half))}
        className="fill-edge"
      />

      {/* Top and bottom of the box. */}
      <rect x={holeX} y={top - 7} width={innerWidth} height={7} className="fill-edge" />
      <rect x={holeX} y={bottom} width={innerWidth} height={7} className="fill-edge" />
    </g>
  )
}

/**
 * How thick the back wall is drawn. Exported because a chapter that paints the
 * picture *on* the wall has to cover exactly it — recopying the number leaves
 * the paint hanging in the air the day this changes, and no test would see it.
 *
 * `Box` clips its children to 18 units past `wallX`, so there are two units of
 * margin here. Raise this past 18 and the picture painted on the wall loses
 * its right edge, silently.
 */
export const WALL_THICKNESS = 16

/** The back wall, where the image lands. `glow` is 0–1. */
export function BackWall({
  geometry,
  glow = 0.12,
  halfHeight = 210,
}: {
  geometry: SceneGeometry
  glow?: number
  halfHeight?: number
}) {
  const { wallX, axisY } = geometry
  return (
    <rect
      x={wallX}
      y={axisY - halfHeight}
      width={WALL_THICKNESS}
      height={halfHeight * 2}
      className="fill-wall"
      style={{ filter: `brightness(${1 + glow * 2})` }}
    />
  )
}

export interface BeamProps {
  geometry: SceneGeometry
  /** Height of the emitting point of the object, in scene units. */
  sourceY: number
  colour: string
  /** 0–1; beams are translucent so overlapping light adds up, as it does. */
  opacity?: number
}

/**
 * All the light one point of the object sends through the aperture.
 *
 * Drawn as the real solid: two edge rays from the source to the rim of the
 * hole, continuing to the wall. Its height on the wall *is* the geometric
 * blur, which is why closing the hole visibly sharpens the picture instead of
 * merely being said to.
 */
export function Beam({ geometry, sourceY, colour, opacity = 0.22 }: BeamProps) {
  const { toSvg, apertureDiameter, band } = geometry
  const half = apertureDiameter / 2
  const source = toSvg({ x: -geometry.objectDistance, y: sourceY })
  const rimTop = toSvg({ x: 0, y: half })
  const rimBottom = toSvg({ x: 0, y: -half })
  const { top, bottom } = band(sourceY)
  const hitTop = toSvg({ x: geometry.boxLength, y: top })
  const hitBottom = toSvg({ x: geometry.boxLength, y: bottom })

  const points = [source, rimTop, hitTop, hitBottom, rimBottom]
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  return <polygon points={points} fill={colour} opacity={opacity} />
}

/** The single ray through the centre of the hole — the one that draws the image. */
export function CentreRay({
  geometry,
  sourceY,
  colour,
  dashed = false,
  width = 2.5,
}: {
  geometry: SceneGeometry
  sourceY: number
  colour: string
  dashed?: boolean
  width?: number
}) {
  const { toSvg, landing } = geometry
  const source = toSvg({ x: -geometry.objectDistance, y: sourceY })
  const hole = toSvg({ x: 0, y: 0 })
  const hit = toSvg({ x: geometry.boxLength, y: landing(sourceY, 0) })

  return (
    <polyline
      points={`${source.x},${source.y} ${hole.x},${hole.y} ${hit.x},${hit.y}`}
      fill="none"
      stroke={colour}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '7 9' : undefined}
    />
  )
}

export type MarkShape = 'triangle' | 'circle' | 'square'

/**
 * A landmark on the object, and its counterpart on the wall.
 *
 * Colour and shape both carry the identity: the Okabe–Ito hues survive every
 * common colour blindness, and the shape survives a black-and-white printout
 * or a washed-out projector.
 */
export function Mark({
  x,
  y,
  colour,
  shape,
  size = 13,
}: {
  x: number
  y: number
  colour: string
  shape: MarkShape
  size?: number
}) {
  if (shape === 'circle') return <circle cx={x} cy={y} r={size} fill={colour} />
  if (shape === 'square') {
    return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx={3} fill={colour} />
  }
  const h = size * 1.15
  return (
    <polygon points={`${x},${y - h} ${x + h},${y + h * 0.72} ${x - h},${y + h * 0.72}`} fill={colour} />
  )
}

export const MARK_COLOURS = {
  a: 'var(--color-mark-a)',
  b: 'var(--color-mark-b)',
  c: 'var(--color-mark-c)',
} as const

export interface Landmark {
  key: 'a' | 'b' | 'c'
  /** Offset from the centre of the figure, as a fraction of its height. */
  offset: number
  shape: MarkShape
}

/** Hat, tummy, feet — the three points every chapter follows through the hole. */
export const LANDMARKS: readonly Landmark[] = [
  { key: 'a', offset: 0.45, shape: 'triangle' },
  { key: 'b', offset: 0.08, shape: 'circle' },
  { key: 'c', offset: -0.45, shape: 'square' },
]

/**
 * The little person on the object side. Flat, geometric, built from the same
 * shapes as the marks — a drawing style a developer can execute cleanly,
 * chosen deliberately over illustration that would only look half-finished.
 */
export function Figure({
  geometry,
  centreY,
  height,
  flipped = false,
  opacity = 1,
  sceneX,
}: {
  geometry: SceneGeometry
  centreY: number
  height: number
  /** Drawn upside down — used for the image on the back wall. */
  flipped?: boolean
  opacity?: number
  /** Scene x; defaults to the object's position, but the image lives at +f. */
  sceneX?: number
}) {
  const { toSvg } = geometry
  const sign = flipped ? -1 : 1
  const x = sceneX ?? -geometry.objectDistance
  const at = (offset: number) => toSvg({ x, y: centreY + sign * offset * height })

  const head = at(0.32)
  const hips = at(-0.1)
  const feetLeft = at(-0.45)
  const shoulders = at(0.15)
  const headRadius = height * 0.1

  return (
    <g opacity={opacity}>
      <line
        x1={head.x}
        y1={head.y}
        x2={hips.x}
        y2={hips.y}
        stroke="var(--color-ray)"
        strokeWidth={height * 0.09}
        strokeLinecap="round"
      />
      <line
        x1={shoulders.x - height * 0.16}
        y1={shoulders.y}
        x2={shoulders.x + height * 0.16}
        y2={shoulders.y}
        stroke="var(--color-ray)"
        strokeWidth={height * 0.06}
        strokeLinecap="round"
      />
      <line
        x1={hips.x}
        y1={hips.y}
        x2={feetLeft.x - height * 0.12}
        y2={feetLeft.y}
        stroke="var(--color-ray)"
        strokeWidth={height * 0.06}
        strokeLinecap="round"
      />
      <line
        x1={hips.x}
        y1={hips.y}
        x2={feetLeft.x + height * 0.12}
        y2={feetLeft.y}
        stroke="var(--color-ray)"
        strokeWidth={height * 0.06}
        strokeLinecap="round"
      />
      <circle cx={head.x} cy={head.y} r={headRadius} fill="var(--color-ray)" />

      {LANDMARKS.map((landmark) => {
        const point = at(landmark.offset)
        return (
          <Mark
            key={landmark.key}
            x={point.x}
            y={point.y}
            colour={MARK_COLOURS[landmark.key]}
            shape={landmark.shape}
            size={Math.max(7, height * 0.075)}
          />
        )
      })}
    </g>
  )
}

/** A caption pinned inside the scene, for the two or three labels a diagram needs. */
export function SceneLabel({
  x,
  y,
  children,
  anchor = 'middle',
  tone = 'muted',
}: {
  x: number
  y: number
  children: ReactNode
  anchor?: 'start' | 'middle' | 'end'
  tone?: 'muted' | 'ray' | 'ink'
}) {
  const fill =
    tone === 'ray' ? 'var(--color-ray)' : tone === 'ink' ? 'var(--color-ink)' : 'var(--color-muted)'
  return (
    <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={22} fontWeight={600}>
      {children}
    </text>
  )
}
