import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

import { SLUGS } from './chapters'

/** Collects anything the browser complains about while a test runs. */
function watchForErrors(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  return problems
}

test.describe('every chapter opens', () => {
  for (const [index, slug] of SLUGS.entries()) {
    test(`${index + 1}. ${slug}`, async ({ page }) => {
      const problems = watchForErrors(page)

      await page.goto(`/#/${slug}`)

      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()
      await expect(heading).not.toBeEmpty()

      // The narration line is the app's promise: whatever is said is also read.
      await expect(page.locator('[aria-live="polite"]')).not.toBeEmpty()

      // The story is ten steps long, and the progress bar is how a child knows.
      await expect(page.getByRole('listitem').filter({ has: page.getByRole('button') })).toHaveCount(
        SLUGS.length,
      )

      expect(problems).toEqual([])
    })
  }
})

test('the story can be walked from end to end with the Next button', async ({ page }) => {
  const problems = watchForErrors(page)
  await page.goto('/')

  for (const slug of SLUGS.slice(1)) {
    await page.getByRole('button', { name: /Suite|Next/ }).click()
    await expect(page).toHaveURL(new RegExp(`#/${slug}$`))
  }

  expect(problems).toEqual([])
})

test('sliders move and the narration follows', async ({ page }) => {
  await page.goto('/#/hole-size')

  const slider = page.getByRole('slider').first()
  const narration = page.locator('[aria-live="polite"]')

  await slider.fill('1')
  const wideOpen = await narration.textContent()

  await slider.fill('0.43')
  const sweetSpot = await narration.textContent()

  expect(wideOpen).not.toBe(sweetSpot)
  expect(sweetSpot).toBeTruthy()
})

test('progress survives a reload', async ({ page }) => {
  await page.goto('/#/the-hole')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/#\/the-hole$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('an unknown chapter falls back to the beginning instead of a blank screen', async ({
  page,
}) => {
  await page.goto('/#/not-a-chapter')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the whole app switches language', async ({ page }) => {
  await page.goto('/#/the-hole')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/trou/i)

  // The toggle is labelled with what it does, not with what it currently is,
  // so the accessible name is the French sentence while the app is French.
  await page.getByRole('button', { name: /anglais/i }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/hole/i)
})
