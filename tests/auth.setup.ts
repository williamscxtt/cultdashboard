/**
 * Auth setup — runs once before admin tests.
 * Logs in as the admin user via the UI and saves the session to disk.
 * Requires TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD in .env.local
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const ADMIN_AUTH = path.join(__dirname, '../playwright/.auth/admin.json')

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL
  const password = process.env.TEST_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in .env.local to run dashboard tests'
    )
  }

  // Ensure auth dir exists
  fs.mkdirSync(path.dirname(ADMIN_AUTH), { recursive: true })

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /sign in/i }).first().click()

  // Wait until we're past the login page
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page).not.toHaveURL(/\/login/)

  await page.context().storageState({ path: ADMIN_AUTH })
  console.log('✓ Admin auth state saved')
})
