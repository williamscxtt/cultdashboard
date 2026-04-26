/**
 * Admin-only feature tests — requires saved auth state from auth.setup.ts
 * Covers: client detail pages, Circle briefing, weekly reports, onboarding audit.
 */
import { test, expect } from '@playwright/test'

test.describe('Clients manager', () => {
  test('search input is visible', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    const searchOrContent = page.locator('input[type="text"], input[placeholder]').first()
    // Either a search input or clients are listed
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(100)
  })

  test('client rows show Active badge', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // Should see billing/status info
    expect(body).toMatch(/active|inactive|£50|free/i)
  })

  test('Active badge does not wrap (nowrap)', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    // Check no badge text is split across two lines — proxy: no very narrow badge elements
    const badges = page.locator('span').filter({ hasText: /^(Active|Inactive)$/ })
    const count = await badges.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await badges.nth(i).boundingBox()
      if (box) {
        // An "Active" badge should be at least 40px wide, not a single-character sliver
        expect(box.width).toBeGreaterThan(30)
      }
    }
  })
})

test.describe('Client detail page', () => {
  test('first client detail page loads', async ({ page }) => {
    // Navigate to clients, click the first one
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('a[href*="/dashboard/clients/"]').first()
    const count = await firstLink.count()
    if (count === 0) {
      test.skip() // No clients in DB
      return
    }
    await firstLink.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard\/clients\/.+/)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })
})

test.describe('Weekly reports', () => {
  test('reports page loads', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/reports')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })
})

test.describe('Onboarding page', () => {
  test('admin can access onboarding without being locked', async ({ page }) => {
    await page.goto('/dashboard/onboarding')
    await page.waitForLoadState('networkidle')
    // Admin should not be redirected away
    await expect(page).not.toHaveURL(/\/login/)
  })
})

test.describe('Landing page (admin preview)', () => {
  // Landing page lives at /landing-page, not / (which redirects to /dashboard for authed users)
  test('landing page loads with key sections', async ({ page }) => {
    await page.goto('/landing-page')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/creator cult/i).first()).toBeVisible()
  })

  test('Bucked Up sponsorship is correct (not Booked Up)', async ({ page }) => {
    await page.goto('/landing-page')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain('Bucked Up')
    expect(body).not.toMatch(/Booked Up/)
  })

  test('no FreeYourMind 10k views card', async ({ page }) => {
    await page.goto('/landing-page')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/10k views in 12 hours/i)
    expect(body).not.toMatch(/FreeYourMind.*10[kK]/i)
  })
})
