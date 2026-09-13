import { defineConfig } from '@playwright/test'
import { localSupabaseEnv } from './tests/local-env'

const localEnv = localSupabaseEnv()

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:3005',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx next dev -p 3005',
    url: 'http://127.0.0.1:3005',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, ...localEnv },
  },
})
