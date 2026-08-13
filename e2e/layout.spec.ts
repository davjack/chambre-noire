import { expect, test, type Page } from '@playwright/test'

import { SLUGS } from './chapters'

/**
 * The way forward must be on screen without scrolling, everywhere.
 *
 * This file exists because the test it replaces was too kind: it called
 * `scrollIntoViewIfNeeded()` and *then* asserted the button was in view, which
 * proves the button is reachable — not that it is visible. It passed while
 * "Suite" sat below the fold on all ten chapters in landscape and at 200 %
 * zoom, which is how the defect reached a user.
 *
 * Nothing here scrolls before asserting. That is the whole point.
 */

/** Browser zoom: the page is small, the device is still a desktop. */
const ZOOMED_AND_SMALL = [
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'laptop 200% zoom', width: 640, height: 400 },
  { name: 'laptop 400% zoom', width: 320, height: 300 },
  { name: 'phone landscape', width: 844, height: 390 },
  { name: 'iPad portrait', width: 820, height: 1180 },
]

/** Real handsets, under real mobile viewport semantics. */
const HANDSETS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Pixel 7', width: 412, height: 915 },
]

/**
 * How far outside the viewport an element sits, in pixels. 0 means fully
 * visible.
 *
 * Both edges count. Measuring only the bottom would score a button scrolled
 * clean off the top as perfect, which is a different way to lose it.
 */
async function pixelsOutOfView(page: Page, pattern: string): Promise<number> {
  return page.evaluate((source) => {
    const matcher = new RegExp(source)
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      matcher.test(candidate.textContent ?? ''),
    )
    if (!button) return Number.NaN
    const box = button.getBoundingClientRect()
    const below = box.bottom - document.documentElement.clientHeight
    return Math.max(0, Math.round(below), Math.round(-box.top))
  }, pattern)
}

/** Height of the scene, as a fraction of the viewport. */
async function sceneShare(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = document.querySelector('#scene')
    if (!scene) return 0
    return scene.getBoundingClientRect().height / document.documentElement.clientHeight
  })
}

/** Whether the live narration line is fully on screen and not painted over. */
async function narrationIsVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const line = document.querySelector('[aria-live="polite"]')
    if (!line) return false
    const box = line.getBoundingClientRect()
    const painted = document.elementFromPoint(
      Math.round(box.left + box.width / 2),
      Math.round(box.top + box.height / 2),
    )
    return (
      box.bottom <= document.documentElement.clientHeight + 1 &&
      box.top >= -1 &&
      (painted === line || line.contains(painted))
    )
  })
}

/** Whether something else is painted over the button's centre. */
async function isCovered(page: Page, pattern: string): Promise<boolean> {
  return page.evaluate((source) => {
    const matcher = new RegExp(source)
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      matcher.test(candidate.textContent ?? ''),
    )
    if (!button) return true
    const box = button.getBoundingClientRect()
    const painted = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return painted !== button && !button.contains(painted)
  }, pattern)
}

async function expectNavigationVisible(page: Page, slug: string) {
  await page.goto(`/#/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect(await pixelsOutOfView(page, 'Suite|Recommencer')).toBe(0)
  expect(await pixelsOutOfView(page, 'Retour')).toBe(0)
  expect(await isCovered(page, 'Suite|Recommencer')).toBe(false)
  expect(await isCovered(page, 'Retour')).toBe(false)

  // The order of what survives a short screen is not negotiable: the way
  // forward first, then the sentence being taught. An earlier fix kept the
  // buttons and let the narration scroll away, which traded one silent failure
  // for another.
  expect(await narrationIsVisible(page)).toBe(true)

  // And the picture is not free to vanish either. The scene is what this shell
  // sacrifices under pressure, so it needs a floor here — otherwise the next
  // layout rework can squeeze it to nothing and every test still passes, which
  // is precisely how the three previous attempts each broke something the
  // suite was not watching.
  expect(await sceneShare(page)).toBeGreaterThan(0.15)
}

for (const viewport of ZOOMED_AND_SMALL) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    for (const slug of SLUGS) {
      test(`${slug} keeps the navigation on screen`, async ({ page }) => {
        await expectNavigationVisible(page, slug)
      })
    }
  })
}

for (const handset of HANDSETS) {
  test.describe(`${handset.name} (mobile viewport)`, () => {
    test.use({
      viewport: { width: handset.width, height: handset.height },
      isMobile: true,
      hasTouch: true,
    })
    for (const slug of SLUGS) {
      test(`${slug} keeps the navigation on screen`, async ({ page }) => {
        await expectNavigationVisible(page, slug)
      })
    }
  })
}

test.describe('a short screen trims the furniture without breaking it', () => {
  test.use({ viewport: { width: 844, height: 390 } })

  test('keeps the buttons hittable — WCAG 2.5.8 asks for 24 px', async ({ page }) => {
    await page.goto('/#/hole-size')
    for (const name of [/Suite/, /Retour/]) {
      const box = await page.getByRole('button', { name }).boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
    }
  })

  test('the story can still be walked forward', async ({ page }) => {
    // Visibility is not usability: nothing else in the suite clicks through on
    // a viewport this small, and the tests this file replaced did.
    await page.goto('/#/hole-size')
    await page.getByRole('button', { name: /Suite/ }).click()
    await expect(page).toHaveURL(/#\/box-length$/)
    await page.getByRole('button', { name: /Retour/ }).click()
    await expect(page).toHaveURL(/#\/hole-size$/)
  })

  test('scrolling a long chapter never takes Suite away', async ({ page }) => {
    await page.goto('/#/build-it')
    await page.mouse.wheel(0, 2000)
    await page.waitForTimeout(200)
    expect(await pixelsOutOfView(page, 'Suite|Recommencer')).toBe(0)
  })
})

/*
 * One case is deliberately not covered: a handset viewport ALSO at 400 % zoom
 * (320×300 with mobile semantics). Chromium then reports a layout viewport of
 * 346 against a visual viewport of 300, and the document scrolls a few pixels
 * on the longest chapter. Navigation, narration and target sizes all still
 * hold there — it is pinch-zoom, which every website answers with panning.
 * Every real handset size above passes; the synthetic combination is left out
 * rather than papered over.
 */
