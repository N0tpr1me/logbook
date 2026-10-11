// Who sees which version (plan: Who sees which version; Safety nets).
import { expect, test } from '@playwright/test'

test.describe('version decision', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'desktop-only checks')

  test('a small window gets the paper version', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 600 })
    await page.goto('/dronemedic')
    await expect(page.locator('[data-paper-site]')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.locator('#dronemedic')).toBeVisible()
  })

  test('the automatic fallback lands on the paper version at the same chapter', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 790 })
    await page.goto('/imc?fallback=1')
    await expect(page.getByText('Switched to the simple version')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Try the 3D book again' })).toBeVisible()
    await expect(page.locator('#imc')).toBeVisible()
  })

  test('reduced motion gets the paper version with a way into the 3D book', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 790 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('[data-paper-site]')).toBeVisible()
    const anyway = page.getByRole('button', { name: 'Open the 3D book anyway' })
    await expect(anyway).toBeVisible()
    await anyway.click()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 })
  })
})
