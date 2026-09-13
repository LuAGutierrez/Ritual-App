import { expect, test } from '@playwright/test'

test('/ritual sin cookie redirige a /auth', async ({ page }) => {
  await page.goto('/ritual')
  await expect(page).toHaveURL(/\/auth(\?|$)/)
  await expect(page.getByRole('button', { name: 'Entrar' }).first()).toBeVisible()
})
