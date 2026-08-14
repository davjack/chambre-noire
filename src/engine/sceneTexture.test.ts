import { describe, expect, it } from 'vitest'

import { worldTextureWidth } from './sceneTexture'

/**
 * The picture is magnified to fill the wall, so the texture has to hold at
 * least a texel per pixel the canvas shows. Getting this wrong does not throw:
 * it softens every edge in the picture by exactly as much as a wider hole
 * would, on the two chapters whose subject is how sharp a pinhole can be.
 */
describe('world texture width', () => {
  it('never asks for more than WebGL2 guarantees on every device', () => {
    for (const canvasWidth of [2048, 4096, 10_000]) {
      expect(worldTextureWidth(canvasWidth)).toBeLessThanOrEqual(2048)
    }
  })

  it('gives a desktop canvas more texels than it has pixels', () => {
    // 1244 is the picture on a 2560-wide screen — the case that was soft.
    expect(worldTextureWidth(1244)).toBeGreaterThan(1244)
  })

  it('does not make a phone carry texels it cannot show', () => {
    expect(worldTextureWidth(800)).toBe(1024)
  })

  it('falls back to the floor for a canvas measured before layout', () => {
    expect(worldTextureWidth(0)).toBe(1024)
  })
})
