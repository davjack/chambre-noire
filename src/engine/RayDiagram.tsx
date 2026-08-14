import { useId, type ReactNode } from 'react'

import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  imagePlacement,
  pictureFade,
  type SceneGeometry,
} from './geometry'

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
 * How far the chamber runs past the back wall, once a picture is painted on it.
 *
 * A `ProjectedFigure` is a figure, and its outstretched arms reach `0.19` of its
 * height either side of the wall — up to 38 units on the longest box chapter 6
 * offers. Anything less cuts one arm off flush and leaves a straight edge where
 * the other one is.
 */
export const BOX_BACK_MARGIN = 40

/**
 * The same, for a chamber with nothing on its wall but bands: the sixteen units
 * of wall, and two to spare.
 *
 * Kept separate because the margin does two jobs — how much room the picture
 * needs, and how far past the wall the chamber is drawn — and only one chapter
 * has a reason to care about the second. *Comment marche ta boîte* sets its
 * face-on panel 16 units past the box; widening every chamber for a picture
 * that chapter does not draw slid the two views into each other.
 */
export const BOX_BACK_MARGIN_BARE = 18

/** Width of the chamber a `Box` draws, from the hole to past the back wall. */
export function boxInnerWidth(
  geometry: SceneGeometry,
  backMargin: number = BOX_BACK_MARGIN,
): number {
  return geometry.wallX - geometry.holeX + backMargin
}

export function Box({
  geometry,
  apertureHeight,
  halfHeight = 210,
  backMargin = BOX_BACK_MARGIN,
  children,
}: {
  geometry: SceneGeometry
  /** Visual height of the opening, in scene units. */
  apertureHeight: number
  halfHeight?: number
  /** `BOX_BACK_MARGIN_BARE` for a chamber with no picture painted on its wall. */
  backMargin?: number
  children?: ReactNode
}) {
  const clipId = useSafeId()
  const { holeX, axisY } = geometry
  const half = apertureHeight / 2
  const top = axisY - halfHeight
  const bottom = axisY + halfHeight
  const innerWidth = boxInnerWidth(geometry, backMargin)

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
 * `Box` clips its children to `BOX_BACK_MARGIN` units past `wallX`. Raise this
 * past that and the picture painted on the wall loses its right edge, silently.
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

/**
 * The picture the box makes of the figure: the same little person, upside down,
 * on the back wall.
 *
 * Every chapter that puts a figure in front of a box draws this. Only one of
 * them used to, and everywhere else a child was left to work out that three
 * coloured shapes on the wall were the bonhomme — the exact inference this app
 * exists to spare them.
 *
 * Both numbers come from `imagePlacement`, so the drawn image and the rays
 * reaching it are the same claim about the same box rather than two.
 *
 * `blur` is the height of the band one point of the object paints — the
 * geometric blur. Pass `geometry.band(0).height` on the chapters where the
 * aperture is what the child is moving, and nothing where it is fixed and
 * small; the band is the same height for every point of the object, so which
 * one it is asked about does not matter.
 *
 * It spreads the picture **vertically only**, and that is not an economy. The
 * hole paints a disc on the wall, and these are side views: a disc on a wall
 * seen edge on is a vertical segment, exactly as chapter 3 draws its bands and
 * chapter 8 its lit strip. Blurring sideways would be spreading the picture
 * through the thickness of the wall. A uniform disc of that diameter has a
 * standard deviation of a quarter of it, which is the honest way to spell a
 * disc as a Gaussian and the same approximation the 2D canvas fallback
 * documents.
 */
export function ProjectedFigure({
  geometry,
  centreY = 0,
  height,
  blur = 0,
  opacity = 1,
  sceneX,
}: {
  geometry: SceneGeometry
  /** Height of the middle of the OBJECT; the image is placed from it. */
  centreY?: number
  /** Height of the OBJECT, in scene units. */
  height: number
  /** Geometric blur on the wall, in scene units. */
  blur?: number
  opacity?: number
  /** Defaults to the face of the back wall the light actually lands on. */
  sceneX?: number
}) {
  const filterId = useSafeId()
  const image = imagePlacement(geometry, centreY, height)

  const fade = pictureFade(blur, image.height)
  if (fade <= 0) return null

  const figure = (
    <Figure
      geometry={geometry}
      sceneX={sceneX ?? geometry.boxLength}
      centreY={image.centreY}
      height={image.height}
      flipped
      opacity={opacity * fade}
    />
  )

  if (blur <= 0) return figure

  return (
    <>
      <defs>
        {/*
          The region has to be given, and given generously downwards and
          upwards. The default is 120 % of the bounding box, and a filter is
          cropped to its region: a smear that should fade out would end in a
          straight edge instead.

          Sideways the default would do, since nothing spreads there. Vertically
          the blur reaches about 2.8 standard deviations, i.e. 0.7 of `blur`,
          and `blur` is never more than the picture is tall — the fade above
          sees to that — so one whole bounding box of margin, itself slightly
          taller than the picture, always covers it.
        */}
        <filter id={filterId} x="-10%" y="-100%" width="120%" height="300%">
          <feGaussianBlur stdDeviation={`0 ${blur / 4}`} />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>{figure}</g>
    </>
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
