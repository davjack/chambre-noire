import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { SLUGS } from './chapters'

/**
 * Every chapter, against WCAG 2.2 AA.
 *
 * The audience makes this non-negotiable rather than a checkbox: six-year-olds
 * include six-year-olds who use a switch, a screen reader, or a screen at 200 %
 * — and the diagrams are the part of this app most likely to leave them out.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const slug of SLUGS) {
  test(`${slug} has no accessibility violation`, async ({ page }) => {
    await page.goto(`/#/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()

    expect(
      violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target.join(' ')),
      })),
    ).toEqual([])
  })
}

test('the narration is announced, not just displayed', async ({ page }) => {
  await page.goto('/#/upside-down')
  const live = page.locator('[aria-live="polite"]')
  await expect(live).toHaveCount(1)
  await expect(live).not.toBeEmpty()
})

test('the keyboard alone can drive a chapter', async ({ page }) => {
  await page.goto('/#/box-length')

  const slider = page.getByRole('slider').first()
  await slider.focus()
  const before = await slider.inputValue()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')

  expect(await slider.inputValue()).not.toBe(before)
})

test('a skip link reaches the scene', async ({ page }) => {
  await page.goto('/#/wow')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link')).toBeFocused()
})
