import { expect, test } from '@playwright/test'

test('la landing pública se ve sin sesión', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Un momento cada noche, solo para ustedes/ })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Empezar gratis' })).toBeVisible()
})
