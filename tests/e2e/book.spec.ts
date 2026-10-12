// The 3D book in test mode: animations off, camera fixed, fallback disabled
// (plan: Testing and QA checklist, automated).
import { expect, test, type Page } from '@playwright/test'

const BOOK = '/?3d=1&test=1'

async function openDesk(page: Page, url = BOOK) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/\/assets\//.test(m.text())) errors.push(m.text())
  })
  await page.goto(url)
  await expect(page.getByTestId('ctl-simple')).toBeVisible({ timeout: 60_000 })
  return errors
}

test.describe('3D book', () => {
  // One software-rendered WebGL tab at a time: several in parallel starve the page's main thread.
  test.describe.configure({ mode: 'serial', timeout: 60_000 })
  // Phones get the paper version; the device flag survives the viewport override below.
  test.skip(({ isMobile }) => isMobile === true, 'the 3D book is for desktop windows')
  test.use({ viewport: { width: 1440, height: 790 } })

  test('loads to the desk with no errors', async ({ page }) => {
    const errors = await openDesk(page)
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.getByText('Scroll or click the book to open it')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('a click on the closed book opens it', async ({ page }) => {
    await openDesk(page)
    // The book's cover at the fixed test-mode camera, 1440 × 790.
    await page.mouse.click(790, 440)
    await expect(page.getByTestId('ctl-next')).toBeVisible()
  })

  test('the keyboard button for the logbook opens it', async ({ page }) => {
    await openDesk(page)
    await page.getByTestId('obj-book').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('ctl-next')).toBeVisible()
  })

  test('opens by Enter, turns by arrow keys and updates the address', async ({ page }) => {
    await openDesk(page)
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('ctl-next')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/\/dronemedic/)
    await expect(page).toHaveTitle(/DroneMedic/)
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/\/imc/)
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/\/dronemedic/)
  })

  test('a chapter address opens the book at that chapter', async ({ page }) => {
    await openDesk(page, '/about?3d=1&test=1')
    await expect(page.getByTestId('ctl-next')).toBeVisible()
    await expect(page).toHaveTitle(/About/)
    await expect(page.getByRole('status')).toContainText('About, spread')
  })

  test('the reading sheet opens with R and Esc closes only the sheet', async ({ page }) => {
    await openDesk(page, '/imc?3d=1&test=1')
    await expect(page.getByTestId('ctl-read')).toBeVisible()
    await page.keyboard.press('r')
    const sheet = page.getByTestId('reading-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'IMC Prosperity' }).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(page.getByTestId('ctl-read')).toBeVisible() // the book is still open
  })

  test('ribbons jump to chapters and Back returns', async ({ page }) => {
    await openDesk(page)
    await page.keyboard.press('Enter')
    await page.getByRole('navigation', { name: 'Bookmarks' }).getByRole('button', { name: 'Contact', exact: true }).click()
    await expect(page).toHaveURL(/\/contact/)
    await page.goBack()
    await expect(page).not.toHaveURL(/\/contact/)
  })

  test('Simple version switches to the paper version at the same chapter', async ({ page }) => {
    await openDesk(page, '/ams?3d=1&test=1')
    await page.getByTestId('ctl-simple').click()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.locator('#ams')).toBeVisible()
  })

  test('desk objects are keyboard buttons that lead to chapters', async ({ page }) => {
    await openDesk(page)
    const pencil = page.getByRole('button', { name: /Pencil: contact/ })
    await pencil.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/contact/)
  })
})
