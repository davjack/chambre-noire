import { useEffect, useRef, useState } from 'react'

import { diffractionBlur, geometricBlur } from '../physics/optics'
import { createWorldCanvas } from './sceneTexture'
import fragmentSource from './shaders/pinhole.frag.glsl?raw'
import vertexSource from './shaders/quad.vert.glsl?raw'

export interface PinholeParams {
  /** d, millimetres. */
  holeDiameter: number
  /** f, millimetres. */
  boxLength: number
  /** u, millimetres. */
  objectDistance: number
  /** Height of the back wall in millimetres — sets the scale of the blur. */
  wallHeight: number
  /** 0–1. The honest value is (d/d_max)²; 1 once the eye has adapted. */
  exposure: number
}

interface Renderer {
  render: (params: PinholeParams) => void
  dispose: () => void
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/** Physical blur radii expressed as a fraction of the wall — what the shader wants. */
function radii(params: PinholeParams) {
  const geometric =
    geometricBlur(params.holeDiameter, params.boxLength, params.objectDistance) /
    2 /
    params.wallHeight
  const diffraction = diffractionBlur(params.holeDiameter, params.boxLength) / 2 / params.wallHeight
  return { geometric, diffraction }
}

function sizeCanvas(canvas: HTMLCanvasElement): { width: number; height: number } {
  // Capped at 2× so an old tablet with a 3× screen does not render nine times
  // the pixels it can afford.
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio))
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  return { width, height }
}

function createWebglRenderer(canvas: HTMLCanvasElement, world: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null

  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!vertex || !fragment || !program) return null

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  // Without this the texture arrives upside down relative to the clip space,
  // and the shader's `1.0 - vUv` — the half-turn that IS the lesson — would
  // silently cancel out into a left-right mirror. The picture would still look
  // plausible, which is exactly what makes the bug worth a comment.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, world)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const vao = gl.createVertexArray()

  const uniforms = {
    scene: gl.getUniformLocation(program, 'uScene'),
    geo: gl.getUniformLocation(program, 'uGeoRadius'),
    diff: gl.getUniformLocation(program, 'uDiffRadius'),
    exposure: gl.getUniformLocation(program, 'uExposure'),
    aspect: gl.getUniformLocation(program, 'uAspect'),
    samples: gl.getUniformLocation(program, 'uSamples'),
  }

  return {
    render(params) {
      const { width, height } = sizeCanvas(canvas)
      const { geometric, diffraction } = radii(params)

      // Enough samples to cover the blur disc without banding, never more than
      // the shader's ceiling. A sharp image costs almost nothing.
      const spreadInPixels = Math.max(geometric, diffraction) * height
      const samples = Math.min(64, Math.max(12, Math.round(spreadInPixels * 1.6)))

      gl.viewport(0, 0, width, height)
      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.uniform1i(uniforms.scene, 0)
      gl.uniform1f(uniforms.geo, geometric)
      gl.uniform1f(uniforms.diff, diffraction)
      gl.uniform1f(uniforms.exposure, params.exposure)
      gl.uniform1f(uniforms.aspect, width / height)
      gl.uniform1i(uniforms.samples, samples)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.deleteProgram(program)
      gl.deleteTexture(texture)
      gl.deleteVertexArray(vao)
    },
  }
}

/**
 * The documented fallback for devices without WebGL2.
 *
 * It rotates the world through half a turn — the part that carries the lesson
 * — and approximates the blur with the canvas filter. The approximation is
 * real: a Gaussian is not a disc, and it cannot show diffraction and geometry
 * pulling in opposite directions with the same fidelity. The sweet spot still
 * appears, because the radius it is given is still `sqrt(geo² + diff²)` from
 * `optics.ts`.
 */
function createCanvas2dRenderer(
  canvas: HTMLCanvasElement,
  world: HTMLCanvasElement,
): Renderer | null {
  const context = canvas.getContext('2d')
  if (!context) return null

  return {
    render(params) {
      const { width, height } = sizeCanvas(canvas)
      const { geometric, diffraction } = radii(params)
      const blurPixels = Math.hypot(geometric, diffraction) * height

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, width, height)
      context.fillStyle = '#06080c'
      context.fillRect(0, 0, width, height)

      context.save()
      // Same gamma as the shader, so the two paths dim identically.
      context.filter = `blur(${blurPixels.toFixed(2)}px) brightness(${Math.pow(
        Math.max(params.exposure, 0),
        1 / 2.2,
      ).toFixed(3)})`
      context.translate(width, height)
      context.rotate(Math.PI)
      context.drawImage(world, 0, 0, width, height)
      context.restore()
      context.filter = 'none'
    },
    dispose() {
      // Nothing retained.
    },
  }
}

export interface PinholeCanvasProps extends PinholeParams {
  className?: string
  /** Called when the WebGL2 path is unavailable, so the chapter can say so. */
  onFallback?: (usingFallback: boolean) => void
}

export function PinholeCanvas({ className, onFallback, ...params }: PinholeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const [, forceRender] = useState(0)

  const { holeDiameter, boxLength, objectDistance, wallHeight, exposure } = params

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const world = createWorldCanvas()
    let renderer = createWebglRenderer(canvas, world)
    onFallback?.(renderer === null)
    if (!renderer) renderer = createCanvas2dRenderer(canvas, world)
    rendererRef.current = renderer

    // A lost context is common on tablets that sleep mid-lesson. Re-render on
    // the next frame rather than leaving a black rectangle on screen.
    const onLost = (event: Event) => {
      event.preventDefault()
      rendererRef.current = null
      onFallback?.(true)
    }
    canvas.addEventListener('webglcontextlost', onLost)

    const observer = new ResizeObserver(() => forceRender((n) => n + 1))
    observer.observe(canvas)

    forceRender((n) => n + 1)

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      observer.disconnect()
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [onFallback])

  useEffect(() => {
    rendererRef.current?.render({
      holeDiameter,
      boxLength,
      objectDistance,
      wallHeight,
      exposure,
    })
  })

  return <canvas ref={canvasRef} className={className} />
}
