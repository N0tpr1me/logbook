import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

// Chapter addresses in book order (plan: Launch). Mirrors src/content/content.ts;
// the "chapter bar matches sections" test checks the two agree.
const CHAPTERS = [
  { path: '/', id: 'contents', title: /Zain Ali/ },
  { path: '/dronemedic', id: 'dronemedic', title: /^DroneMedic · Zain Ali$/ },
  { path: '/imc', id: 'imc', title: /^IMC Prosperity · Zain Ali$/ },
  { path: '/ams', id: 'ams', title: /^AMS AI for Inclusive Recruitment · Zain Ali$/ },
  { path: '/about', id: 'about', title: /^About · Zain Ali$/ },
  { path: '/contact', id: 'contact', title: /^Let's talk · Zain Ali$/ },
]

/** Media files are added later; a missing clip or photo is a 404 the page handles, not an error. */
function isMissingAsset(message: ConsoleMessage): boolean {
  const url = message.location().url ?? ''
  return /Failed to load resource/.test(message.text()) && url.includes('/assets/')
}

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !isMissingAsset(message)) errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test.describe('paper version', () => {
  for (const chapter of CHAPTERS) {
    test(`${chapter.path} opens the ${chapter.id} chapter`, async ({ page }) => {
      const errors = collectErrors(page)
      await page.goto(`${chapter.path}?simple=1`)
      await expect(page.locator('[data-paper-site]')).toBeVisible()
      await expect(page).toHaveTitle(chapter.title)

      const current = page.locator('.chapter-bar a[aria-current="page"]')
      await expect(current).toHaveAttribute('href', chapter.path)

      const section = page.locator(`section#${chapter.id}`)
      await expect(section).toBeVisible()
      await expect
        .poll(async () => {
          const box = await section.boundingBox()
          return box ? box.y : Number.NaN
        })
        .toBeLessThan(120)

      expect(errors).toEqual([])
    })
  }

  test('the chapter bar lists every chapter section', async ({ page }) => {
    await page.goto('/?simple=1')
    const links = await page.locator('.chapter-bar a[data-chapter]').evaluateAll((els) => els.map((el) => el.getAttribute('data-chapter')))
    const sections = await page.locator('[data-chapter-section]').evaluateAll((els) => els.map((el) => el.getAttribute('data-chapter-section')))
    expect(links).toEqual(sections)
    expect(links).toEqual(CHAPTERS.map((c) => c.id))
  })

  test('clicking a chapter in the bar updates the address and scrolls there', async ({ page }) => {
    await page.goto('/?simple=1')
    await page.locator('.chapter-bar a[data-chapter="about"]').click()
    await expect(page).toHaveURL(/\/about\?simple=1$/)
    await expect(page).toHaveTitle(/^About · Zain Ali$/)
    await expect
      .poll(async () => {
        const box = await page.locator('section#about').boundingBox()
        return box ? box.y : Number.NaN
      })
      .toBeLessThan(120)
  })

  test('Back returns to the previous chapter and Forward goes on again', async ({ page }) => {
    await page.goto('/contact?simple=1')
    await page.locator('.chapter-bar a[data-chapter="about"]').click()
    await expect(page).toHaveURL(/\/about\?simple=1$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/contact\?simple=1$/)
    await expect(page).toHaveTitle(/^Let's talk · Zain Ali$/)
    await expect(page.locator('.chapter-bar a[aria-current="page"]')).toHaveAttribute('href', '/contact')
    await expect
      .poll(async () => {
        const box = await page.locator('section#contact').boundingBox()
        return box ? box.y : Number.NaN
      })
      .toBeLessThan(120)
    await page.goForward()
    await expect(page).toHaveURL(/\/about\?simple=1$/)
    await expect(page).toHaveTitle(/^About · Zain Ali$/)
  })

  test('the contact block has every action and Copy email confirms', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/contact?simple=1')
    const contact = page.locator('section#contact')
    await expect(contact.getByRole('button', { name: 'Copy email' })).toBeVisible()
    await expect(contact.getByRole('button', { name: 'Copy number' })).toBeVisible()
    await expect(contact.getByRole('button', { name: 'Save contact' })).toBeVisible()
    await expect(contact.getByRole('link', { name: 'Download CV' })).toHaveAttribute('download', '')
    await expect(contact.getByRole('link', { name: 'Open LinkedIn' })).toHaveAttribute('target', '_blank')
    await expect(contact.getByRole('link', { name: 'Open GitHub' })).toHaveAttribute('rel', /noopener/)
    await expect(contact.locator('a[href^="mailto:"]')).toBeVisible()
    await expect(contact.locator('a[href^="tel:"]')).toBeVisible()

    await contact.getByRole('button', { name: 'Copy email' }).click()
    await expect(contact.getByTestId('contact-status')).toHaveText('Email copied')
    expect(errors).toEqual([])
  })

  test('the interactive parts work without console errors', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/dronemedic?simple=1')
    const replay = page.locator('#dronemedic-replay')
    await replay.getByRole('button', { name: /Royal London Hospital/ }).click()
    await expect(replay.getByRole('button', { name: 'Pause' })).toBeVisible()
    await replay.getByRole('button', { name: 'Zoom in' }).click()
    await expect(replay.getByRole('button', { name: 'Zoom out' })).toBeEnabled()

    await page.goto('/imc?simple=1')
    const imc = page.locator('#imc-replay')
    await imc.getByRole('slider', { name: 'Timestamp' }).fill('200')
    await expect(imc.getByRole('slider', { name: 'Timestamp' })).toHaveValue('200')
    await imc.getByRole('button', { name: 'Intarian pepper root' }).click()
    await expect(imc.getByRole('button', { name: 'Intarian pepper root' })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/ams?simple=1')
    await page.locator('section#ams').getByRole('button', { name: /Interview/ }).click()
    await expect(page.locator('#pipeline-detail')).toContainText('Interview')

    await page.goto('/about?simple=1')
    await page.locator('section#about').getByRole('button', { name: 'Python' }).click()
    await expect(page.locator('section#about .skill-project-list')).toContainText('DroneMedic')

    expect(errors).toEqual([])
  })
})
