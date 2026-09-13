import { expect, test } from '@playwright/test'
import { QA } from '../qa'

test('login de la pareja seed llega al ritual', async ({ page }) => {
  await page.goto('/auth')
  await page.getByPlaceholder('tu@email.com').fill(QA.emailA)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(QA.passwordA)
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByText('Email o contraseña incorrectos')).toHaveCount(0)
  await page.waitForURL(url => url.pathname === '/ritual', { timeout: 15_000 })
  await expect(
    page.locator('.animate-spin')
      .or(page.getByRole('link', { name: 'Hoy' }))
      .or(page.getByPlaceholder('Escribí tu respuesta...'))
  ).toBeVisible({ timeout: 15_000 })
})
