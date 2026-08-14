import { expect, test, type ConsoleMessage, type Locator, type Page } from '@playwright/test'

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

/** Geometry read back off an SVG circle, so a sign error has somewhere to fail. */
const centreY = async (target: Locator) => Number(await target.getAttribute('cy'))
const radius = async (target: Locator) => Number(await target.getAttribute('r'))

/*
 * The two mechanisms chapter 8 exists for.
 *
 * Everything else in this file would pass with the scene frozen: the chapter
 * opens, the heading is there, axe is happy. Both defects found while building
 * it were of exactly that kind — a picture that did not answer the control.
 *
 * The picture on the paper is asserted on the DOM rather than on the pixels,
 * and that is not a shortcut. Every colour inside the box sits on the same
 * side of the lit/unlit threshold in every state, so a screenshot of the scene
 * cannot see the crescent at all — and it certainly cannot tell a bite at the
 * bottom from a bite at the top, which is the whole claim of the chapter. The
 * sky and the flooding chamber are what the pixels do measure.
 */
test('the box chapter bites the picture, and the leak drowns it', async ({ page }) => {
  await page.goto('/#/your-box')
  const scene = page.locator('#scene')
  const narration = page.locator('[aria-live="polite"]')
  const slider = page.getByRole('slider').first()
  const paperSun = page.getByTestId('paper-sun')
  const paperMoon = page.getByTestId('paper-moon')

  await slider.fill('0')
  const clear = await litFraction(scene)
  const clearLine = await narration.textContent()

  // Sun still clear: the Moon's picture is off the paper entirely, so no bite.
  expect(await centreY(paperMoon)).toBeGreaterThan(
    (await centreY(paperSun)) + (await radius(paperSun)) + (await radius(paperMoon)) - 1,
  )

  // The Moon comes over: less light in the sky…
  await slider.fill('1')
  expect(await litFraction(scene)).toBeLessThan(clear)
  expect(await narration.textContent()).not.toBe(clearLine)

  // …and on the paper the bite is at the BOTTOM while the sky is bitten at the
  // top, because the rays crossed at the hole. Invert that sign and the chapter
  // teaches the opposite of chapter 4 while every other assertion still passes.
  expect(await centreY(paperMoon)).toBeGreaterThan(await centreY(paperSun))
  expect(await centreY(paperMoon)).toBeLessThan(
    (await centreY(paperSun)) + (await radius(paperSun)) + (await radius(paperMoon)),
  )

  // A seam comes open: the chamber floods, so more of the scene is lit — and
  // the line being read says the picture is gone.
  const eclipsed = await litFraction(scene)
  await page.getByRole('button', { name: /Faire une fuite|Make a leak/ }).click()
  expect(await litFraction(scene)).toBeGreaterThan(eclipsed)
  expect(await narration.textContent()).toMatch(/disparu|gone/)
})

/*
 * The eye chapter's slider, and the one thing on that screen it is about.
 *
 * The pupil and the beams answered it from the first day; the picture at the
 * back of the eye did not, and nothing in this file said so — the chapter
 * opened, the heading was there, axe was happy. The same shape of defect as the
 * two chapter 8 caught above.
 *
 * Read off the filter rather than off the pixels, and that is not a shortcut
 * either: the pupil and the beams change with the same slider, so a screenshot
 * of the scene cannot tell a picture that answers from a picture that is
 * frozen beside things that move. The colour is the half asserted here; the
 * dimming rides on the same slider and the same `light`.
 */
test('the eye chapter drains the colour from the picture as the room goes dark', async ({
  page,
}) => {
  await page.goto('/#/your-eye')
  const slider = page.getByRole('slider').first()
  // Scoped to the scene: the assertions below are counts, and the day anything
  // else on the page grows a colour filter this test should still be talking
  // about the retina rather than failing with its name on someone else's bug.
  const drain = page.locator('#scene feColorMatrix')
  const picture = page.locator('#scene g[filter] > g')

  // Lit room: cones, full colour, and so no colour filter is built at all.
  await slider.fill('100')
  await expect(drain).toHaveCount(0)

  // Dark room: rods, one pigment, no colour left to report.
  await slider.fill('0')
  await expect(drain).toHaveCount(1)
  await expect(drain).toHaveAttribute('values', '0')
  const darkest = Number(await picture.getAttribute('opacity'))

  // And in between it is in between, rather than a switch thrown at a threshold.
  // `toHaveAttribute` rather than a bare read: the count does not change here,
  // so nothing else in this block would retry, and a value read a frame early
  // would fail as if the physics had moved.
  await slider.fill('50')
  // The count first: a negative assertion is also satisfied by a locator that
  // matches nothing, so on its own it would let the filter vanish here and push
  // the failure onto the read below, as a bare thirty-second timeout.
  await expect(drain).toHaveCount(1)
  await expect(drain).not.toHaveAttribute('values', '0')
  const dusk = Number(await drain.getAttribute('values'))
  expect(dusk).toBeGreaterThan(0)
  expect(dusk).toBeLessThan(1)

  // The other half of the same answer: it is dimmer in the dark. Asserted
  // because deleting the opacity alone left every line above green.
  expect(Number(await picture.getAttribute('opacity'))).toBeGreaterThan(darkest)
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
