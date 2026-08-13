import { useCallback, useEffect, useRef, useState } from 'react'

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

/**
 * Can this device run the real simulation?
 *
 * Asked on a throwaway canvas, and that is the whole point: a canvas that has
 * once handed out a WebGL context can never hand out a 2D one, so probing on
 * the canvas we intend to draw into would burn the fallback whenever the
 * context exists but the program fails to compile — a black rectangle, and no
 * way back.
 */
function webgl2CanRunTheShader(): boolean {
  const probe = document.createElement('canvas')
  const gl = probe.getContext('webgl2')
  if (!gl) return false

  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = vertex && fragment ? gl.createProgram() : null

  let linked = false
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    linked = Boolean(gl.getProgramParameter(program, gl.LINK_STATUS))
  }

  if (vertex) gl.deleteShader(vertex)
  if (fragment) gl.deleteShader(fragment)
  if (program) gl.deleteProgram(program)
  gl.getExtension('WEBGL_lose_context')?.loseContext()

  return linked
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
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    if (program) gl.deleteProgram(program)
    return null
  }

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  // Without this the texture arrives upside down relative to the clip space,
  // and the shader's `1.0 - vUv` — the half-turn that IS the lesson — would
  // silently cancel out into a left-right mirror. The picture would still look
  // plausible, which is exactly what makes the bug worth a comment.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, world)
  // Mip levels are what let 64 samples cover a wide aperture disc without
  // leaving visible copies of the house behind.
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const vao = gl.createVertexArray()

  const uniforms = {
    scene: gl.getUniformLocation(program, 'uScene'),
    geo: gl.getUniformLocation(program, 'uGeoRadius'),
    diff: gl.getUniformLocation(program, 'uDiffRadius'),
    exposure: gl.getUniformLocation(program, 'uExposure'),
    aspect: gl.getUniformLocation(program, 'uAspect'),
    texSize: gl.getUniformLocation(program, 'uTexSize'),
    samples: gl.getUniformLocation(program, 'uSamples'),
  }

  return {
    render(params) {
      if (gl.isContextLost()) return
      const { width, height } = sizeCanvas(canvas)
      const { geometric, diffraction } = radii(params)

      // Enough samples to cover the blur disc without banding, never more than
      // the shader's ceiling. Beyond that the mip level takes over.
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
      gl.uniform2f(uniforms.texSize, world.width, world.height)
      gl.uniform1i(uniforms.samples, samples)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.deleteProgram(program)
      gl.deleteTexture(texture)
      gl.deleteVertexArray(vao)
      // Browsers cap live WebGL contexts (Chrome at 16) and evict the oldest
      // when the cap is hit. Every chapter change remounts this component, so
      // letting contexts linger until GC would eventually cost another chapter
      // its picture.
      gl.getExtension('WEBGL_lose_context')?.loseContext()
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
  /** Bumped to rebuild the renderer — only when the context itself changed. */
  const [generation, setGeneration] = useState(0)
  /** Bumped to redraw with the existing renderer, which is much cheaper. */
  const [, redraw] = useState(0)
  const rebuild = useCallback(() => setGeneration((current) => current + 1), [])
  const requestRedraw = useCallback(() => redraw((current) => current + 1), [])

  const { holeDiameter, boxLength, objectDistance, wallHeight, exposure } = params

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const world = createWorldCanvas()
    const canUseShader = webgl2CanRunTheShader()
    const renderer = canUseShader
      ? createWebglRenderer(canvas, world)
      : createCanvas2dRenderer(canvas, world)
    rendererRef.current = renderer
    onFallback?.(!canUseShader || renderer === null)

    /*
     * A tablet that sleeps mid-lesson comes back with a lost context. The two
     * halves of the protocol have to be here together: `preventDefault` on the
     * loss is what makes the browser promise a restore, and the restore
     * handler is what turns that promise into a picture again. Only one of
     * them, and the canvas stays black for good.
     */
    const onLost = (event: Event) => {
      event.preventDefault()
      rendererRef.current = null
    }
    const onRestored = () => rebuild()
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    // A resize only needs a redraw: rebuilding would throw away a perfectly
    // good context and its texture every time the window moves a pixel.
    const observer = new ResizeObserver(requestRedraw)
    observer.observe(canvas)
    requestRedraw()

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      observer.disconnect()
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
    // `generation` is the rebuild trigger, not a value this effect reads.
  }, [onFallback, rebuild, requestRedraw, generation])

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
