import { describe, expect, it } from 'vitest'

import { COLOUR_BACK_AT, DARK_BELOW, eyeLight } from './eyeLight'

/** The chapter's own numbers, so the test holds what actually ships. */
const EYE_DEPTH = 250
const OBJECT_DISTANCE = 340
const NARROWEST_PUPIL = 14
const PUPIL_RANGE = 46
const WIDEST_PUPIL = NARROWEST_PUPIL + PUPIL_RANGE

/** The slider runs 0 to 100 in steps of 1; this walks every position it offers. */
const SETTINGS = Array.from({ length: 101 }, (_, light) => light)

function at(light: number) {
  const holeDiameter = NARROWEST_PUPIL + (1 - light / 100) * PUPIL_RANGE
  return eyeLight(light, { boxLength: EYE_DEPTH, objectDistance: OBJECT_DISTANCE, holeDiameter }, WIDEST_PUPIL)
}

describe('what the room light leaves for the eye', () => {
  it('never asks for an opacity outside the range that means anything', () => {
    for (const light of SETTINGS) {
      const { room, retina, beams, saturation } = at(light)
      for (const value of [room, retina, beams, saturation]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('brightens the picture on the retina as the room brightens, at every step', () => {
    /*
     * The pupil's own term pulls the other way — it is widest when the room is
     * darkest — so this is not automatic. Get the balance wrong and the picture
     * gets brighter as the child turns the light off, which is what an honest
     * retinal-illuminance curve does against this chapter's linear pupil.
     */
    for (const light of SETTINGS.slice(1)) {
      expect(at(light).retina).toBeGreaterThan(at(light - 1).retina)
    }
  })

  it('never draws the picture brighter than the object it is a picture of', () => {
    // Opacity is how much light there is, in every chapter of this app. These
    // two curves crossed at light 31 once, and nothing failed.
    for (const light of SETTINGS) {
      const { room, retina } = at(light)
      expect(retina).toBeLessThan(room)
    }
  })

  it('never dims the light crossing the room faster than the room itself', () => {
    /*
     * The beams pass through a pupil that is opening. Whatever else they do,
     * they cannot fall away faster than the room they cross — that would draw
     * the least light passing at the moment the narration says the pupil has
     * opened to catch more of it. They did, briefly, to darken the background
     * the picture is read against; the floor belongs under the picture instead.
     */
    for (const light of SETTINGS) {
      const { room, beams } = at(light)
      expect(beams / room).toBeCloseTo(at(100).beams / at(100).room, 12)
    }
  })

  it('closes the gap between the two as the room darkens, which is the pupil catching up', () => {
    const dark = at(0)
    const bright = at(100)

    expect(dark.room - dark.retina).toBeLessThan(bright.room - bright.retina)
  })

  it('has finished draining the colour by the time the narration says it has', () => {
    /*
     * The line read aloud below `DARK_BELOW` says everything turns grey. Anchor
     * the drain so that it *starts* there instead and the sentence is spoken
     * over a picture still all but fully coloured — the same defect chapter 2
     * carried for as long as it had a round number for a threshold.
     */
    expect(at(DARK_BELOW).saturation).toBe(0)
    expect(at(DARK_BELOW - 1).saturation).toBe(0)
    expect(at(0).saturation).toBe(0)

    expect(at(COLOUR_BACK_AT).saturation).toBe(1)
    expect(at(100).saturation).toBe(1)

    // And in between it is in between, rather than a switch thrown at a point.
    const dusk = at(Math.round((DARK_BELOW + COLOUR_BACK_AT) / 2)).saturation
    expect(dusk).toBeGreaterThan(0)
    expect(dusk).toBeLessThan(1)
  })

  it('holds the light between 0 and 100 rather than trusting it', () => {
    expect(at(-40).saturation).toBe(0)
    expect(at(400).saturation).toBe(1)
    expect(at(400).room).toBeLessThanOrEqual(1)
  })
})
