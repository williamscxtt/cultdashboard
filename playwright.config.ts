import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { config as dotenv } from 'dotenv'

// Load .env.local so TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD are available in tests
dotenv({ path: path.join(__dirname, '.env.local') })

export const ADMIN_AUTH = path.join(__dirname, 'playwright/.auth/admin.json')

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup: log in once and save auth state
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Tests that need admin auth
    {
      name: 'admin',
      testMatch: /dashboard\.spec\.ts|admin\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_AUTH,
      },
    },
    // Setup: log in as test client via Supabase magic link
    {
      name: 'client-setup',
      testMatch: /client\.setup\.ts/,
    },
    // Tests running as a real client user
    {
      name: 'client',
      testMatch: /client\.spec\.ts/,
      dependencies: ['client-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/client.json'),
      },
    },
    // Tests that run without auth (public pages)
    {
      name: 'public',
      testMatch: /public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
