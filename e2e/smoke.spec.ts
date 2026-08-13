import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

import { SLUGS } from './chapters'
import { litFraction } from './pixels'

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

/*
 * The two mechanisms chapter 8 exists for, asserted on the pixels.
 *
 * Everything else in this file would pass with the scene frozen: the chapter
 * opens, the heading is there, axe is happy. Both defects found while building
 * it were of exactly that kind — a picture that did not answer the control —
 * so what is checked here is that acting on it changes what is on screen, in
 * the direction the physics requires.
 */
test('the box chapter bites the picture, and the leak drowns it', async ({ page }) => {
  await page.goto('/#/your-box')
  const scene = page.locator('#scene')
  const narration = page.locator('[aria-live="polite"]')
  const slider = page.getByRole('slider').first()

  await slider.fill('0')
  const clear = await litFraction(scene)
  const clearLine = await narration.textContent()

  // The Moon takes a bite: less light in the sky and less on the paper.
  await slider.fill('1')
  const eclipsed = await litFraction(scene)
  expect(eclipsed).toBeLessThan(clear)
  expect(await narration.textContent()).not.toBe(clearLine)

  // A seam comes open: the chamber floods, so more of the scene is lit — and
  // the line being read says the picture is gone.
  await page.getByRole('button', { name: /Faire une fuite|Make a leak/ }).click()
  expect(await litFraction(scene)).toBeGreaterThan(eclipsed)
  expect(await narration.textContent()).toMatch(/disparu|gone/)
})

test('progress survives a reload', async ({ page }) => {
  await page.goto('/#/the-hole')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Assert the stored progress, not just that the page came back: the first
  // version of this test would have passed with `writeStored` completely
  // broken.
  const visited = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('chambre-noire:visited') ?? '[]') as string[])
  expect(await visited()).toContain('the-hole')

  await page.reload()
  await expect(page).toHaveURL(/#\/the-hole$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await visited()).toContain('the-hole')
})

test('turning the sound on fetches and plays the clip for the line on screen', async ({ page }) => {
  await page.goto('/#/the-hole')

  // The clip is a real file shipped with the app, so this asserts the whole
  // chain: key → URL → 200. It is the check that would have caught the
  // narration silently pointing at a path the generator never wrote.
  const [response] = await Promise.all([
    page.waitForResponse((r) => /audio\/fr\/chapter-the-hole-say.*\.mp3$/.test(r.url())),
    page.getByRole('button', { name: 'Écouter', exact: true }).click(),
  ])

  // 206, not 200: a media element asks for a byte range, which is itself proof
  // the browser accepted the file as playable audio rather than a 404 page.
  expect(response.ok()).toBe(true)

  const whole = await page.request.get(response.url())
  expect((await whole.body()).byteLength).toBeGreaterThan(4096)
})

test('the replay button works even with the sound left off', async ({ page }) => {
  await page.goto('/#/wow')
  const [response] = await Promise.all([
    page.waitForResponse((r) => /audio\/fr\/chapter-wow-say.*\.mp3$/.test(r.url())),
    page.getByRole('button', { name: 'Réécouter', exact: true }).click(),
  ])
  expect(response.ok()).toBe(true)
})

test('navigating moves focus into the new chapter', async ({ page }) => {
  await page.goto('/#/wow')
  await page.getByRole('button', { name: /Suite/ }).click()
  await expect(page).toHaveURL(/#\/straight-light$/)
  // Otherwise the keyboard lands back on <body> and has to cross thirteen
  // controls to reach the content again.
  await expect(page.locator('#scene')).toBeFocused()
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

  // Located by the word a child (or a voice-control user) actually sees —
  // which is the whole point of dropping the mismatched aria-label.
  await page.getByRole('button', { name: 'English' }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/hole/i)
})
