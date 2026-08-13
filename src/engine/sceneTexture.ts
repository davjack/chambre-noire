/**
 * The world outside the box, drawn on the fly into an offscreen canvas.
 *
 * No image file: an asset would have to be authored, optimised, cached and
 * kept visually consistent with the SVG chapters. Drawing it in code costs a
 * few dozen lines, weighs nothing, and stays sharp at any resolution.
 *
 * The composition is deliberately lopsided — sun top-left, tree far right, a
 * red roof above a brown door. Every axis of the picture is asymmetric, so
 * "the image is upside down AND mirrored" is visible at a glance rather than
 * something a child has to take on trust.
 */
export function drawWorld(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const x = (fraction: number) => fraction * width
  const y = (fraction: number) => fraction * height

  const sky = context.createLinearGradient(0, 0, 0, y(0.74))
  sky.addColorStop(0, '#4aa3e0')
  sky.addColorStop(1, '#cfe9f7')
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)

  // Sun, top left — the brightest thing in the frame, and the easiest landmark
  // to follow through the hole.
  const glow = context.createRadialGradient(x(0.17), y(0.17), 0, x(0.17), y(0.17), y(0.28))
  glow.addColorStop(0, 'rgba(255, 244, 190, 0.95)')
  glow.addColorStop(1, 'rgba(255, 244, 190, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, y(0.6))
  context.fillStyle = '#fff3b0'
  context.beginPath()
  context.arc(x(0.17), y(0.17), y(0.085), 0, Math.PI * 2)
  context.fill()

  // Ground.
  context.fillStyle = '#5aa64f'
  context.fillRect(0, y(0.74), width, height - y(0.74))
  context.fillStyle = '#4a8f42'
  context.fillRect(0, y(0.74), width, y(0.02))

  // House: light walls, red roof, brown door, two lit windows.
  context.fillStyle = '#f2ece0'
  context.fillRect(x(0.3), y(0.46), x(0.3), y(0.28))

  context.fillStyle = '#c0392b'
  context.beginPath()
  context.moveTo(x(0.26), y(0.46))
  context.lineTo(x(0.45), y(0.28))
  context.lineTo(x(0.64), y(0.46))
  context.closePath()
  context.fill()

  context.fillStyle = '#6b4423'
  context.fillRect(x(0.41), y(0.6), x(0.08), y(0.14))

  context.fillStyle = '#ffd166'
  context.fillRect(x(0.33), y(0.52), x(0.06), y(0.06))
  context.fillRect(x(0.51), y(0.52), x(0.06), y(0.06))

  // Tree, far right and taller than the house.
  context.fillStyle = '#6b4423'
  context.fillRect(x(0.805), y(0.52), x(0.035), y(0.22))
  context.fillStyle = '#2e7d32'
  for (const [cx, cy, r] of [
    [0.822, 0.36, 0.11],
    [0.762, 0.44, 0.085],
    [0.882, 0.44, 0.085],
  ] as const) {
    context.beginPath()
    context.arc(x(cx), y(cy), y(r) * (width / height) * 0.62 + y(r) * 0.38, 0, Math.PI * 2)
    context.fill()
  }
}

/**
 * Renders the world once into an offscreen canvas, ready to be uploaded as a
 * texture or blitted by the 2D fallback.
 */
export function createWorldCanvas(width = 640, height = 480): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context) drawWorld(context, width, height)
  return canvas
}
