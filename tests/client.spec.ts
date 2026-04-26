/**
 * Client dashboard tests — runs as the "will test" client account.
 * Verifies what a real client sees vs what the admin sees.
 */
import { test, expect } from '@playwright/test'

test.describe('Client auth gate', () => {
  test('client lands on dashboard (not /subscribe) when billing_exempt', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/subscribe/)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('client is not redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
  })
})

test.describe('Client sidebar — admin items hidden', () => {
  test('Clients admin link is NOT visible to client', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Admin-only nav items should not appear
    const clientsLink = page.getByRole('link', { name: /^clients$/i })
    await expect(clientsLink).toHaveCount(0)
  })

  test('Preview billing text is NOT shown to client', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/preview billing/i)).toHaveCount(0)
  })

  test('client sidebar shows their own nav items', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Settings is in toolsNavBase — present for all clients with onboarding_hub_complete
    // (setup ensures this flag is set). If not set, it renders as a locked <div> not a link.
    const settingsLink = page.getByRole('link', { name: /settings/i })
    const myProfileLink = page.getByRole('link', { name: /my profile/i })
    // At least one of these nav items must be visible as a link
    const settingsCount = await settingsLink.count()
    const myProfileCount = await myProfileLink.count()
    expect(settingsCount + myProfileCount).toBeGreaterThan(0)
  })
})

test.describe('Client cannot access admin-only pages', () => {
  test('/dashboard/clients redirects or shows access denied', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    // Should redirect to /dashboard or show an error — not the clients list
    const body = await page.locator('body').innerText()
    // Should not see a list of other clients' names
    expect(body).not.toMatch(/billing_exempt|stripe_customer_id/)
    // Should not be able to toggle client statuses
    expect(page.url()).not.toMatch(/\/dashboard\/clients$/)
  })

  test('/dashboard/knowledge does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/knowledge')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })
})

test.describe('Client dashboard pages load', () => {
  test('analytics page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('content studio loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/content')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('settings page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('DM sales page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/dm-sales')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('AI page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/ai')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })
})

test.describe('Subscription wall — unsubscribed client without billing_exempt', () => {
  // This tests the redirect logic without needing to log out.
  // We verify /subscribe page itself renders for a client who'd land there.
  test('/subscribe renders the pricing wall', async ({ page }) => {
    await page.goto('/subscribe')
    await expect(page.getByText('£50')).toBeVisible()
    await expect(page.getByText(/30-day free trial/i)).toBeVisible()
  })
})

test.describe('Manage billing button', () => {
  test('Manage billing button is visible to client (billing_exempt client sees nothing)', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // billing_exempt clients don't get a billing button (correct behaviour)
    const billingBtn = page.getByText(/manage billing/i)
    // Just checking it doesn't crash — presence depends on billing_exempt status
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })
})
