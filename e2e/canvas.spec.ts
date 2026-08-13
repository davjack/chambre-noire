import { expect, test, type Page } from '@playwright/test'

import { litFraction as litPixels } from './pixels'

/**
 * The two chapters that draw on a canvas, checked for the one failure the rest
 * of the suite is blind to: a picture that is simply not there.
 *
 * This file runs under the `dev-strict-mode` project as well as the production
 * ones, because the bug that prompted it only existed in development. React
 * StrictMode mounts every effect twice — setup, cleanup, setup — and the
 * cleanup used to destroy the WebGL context the second setup then inherited.
 * Chapters 0 and 5 were black for an entire dev session while every test here
 * passed against the build.
 */

/** The canvas of the chapter under test, measured the way the child sees it. */
async function litFraction(page: Page): Promise<number> {
  return litPixels(page.locator('canvas').first())
}

async function contextIsAlive(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return false
    const gl = canvas.getContext('webgl2')
    // No WebGL2 at all is a legitimate state — the 2D fallback takes over.
    return gl === null ? true : !gl.isContextLost()
  })
}

test('the hole-size chapter actually paints a picture', async ({ page }) => {
  await page.goto('/#/hole-size')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(400)

  expect(await contextIsAlive(page)).toBe(true)
  // Dark adaptation is on by default, so most of the frame is daylight.
  expect(await litFraction(page)).toBeGreaterThan(0.5)
})

test('the opening chapter paints once the hole is opened', async ({ page }) => {
  await page.goto('/#/wow')
  await page.getByRole('button', { name: /Ouvrir le trou|Open the hole/ }).click()
  await page.waitForTimeout(600)

  expect(await contextIsAlive(page)).toBe(true)
  expect(await litFraction(page)).toBeGreaterThan(0.5)
})

test('the picture survives leaving the chapter and coming back', async ({ page }) => {
  await page.goto('/#/hole-size')
  await page.waitForTimeout(300)
  const before = await litFraction(page)

  await page.goto('/#/your-eye')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/#/hole-size')
  await page.waitForTimeout(400)

  expect(await contextIsAlive(page)).toBe(true)
  expect(await litFraction(page)).toBeGreaterThan(before * 0.8)
})

test('shrinking the hole really does darken the picture', async ({ page }) => {
  await page.goto('/#/hole-size')
  // Turn dark adaptation off so the exposure is the honest one.
  await page.getByRole('button', { name: /Yeux habitués au noir|Eyes used to the dark/ }).click()
  await page.waitForTimeout(300)

  const slider = page.getByRole('slider').first()
  await slider.fill('1')
  await page.waitForTimeout(300)
  const wideOpen = await litFraction(page)

  await slider.fill('0.1')
  await page.waitForTimeout(300)
  const nearlyShut = await litFraction(page)

  expect(wideOpen).toBeGreaterThan(nearlyShut)
})
