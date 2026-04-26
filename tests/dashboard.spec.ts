/**
 * Admin dashboard tests — requires saved auth state from auth.setup.ts
 * Covers: sidebar nav, overview, analytics, settings, billing button.
 */
import { test, expect } from '@playwright/test'

test.describe('Sidebar', () => {
  test('renders admin nav links', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Sidebar labels as defined in Sidebar.tsx
    await expect(page.getByRole('link', { name: /clients/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible()
  })

  test('shows Preview billing button for admin', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Two buttons exist (expanded + collapsed sidebar states) — either is fine
    await expect(page.getByText(/preview billing/i).first()).toBeVisible()
  })

  test('admin is NOT redirected to /subscribe', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/subscribe/)
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('Overview page', () => {
  test('loads without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('page title or heading is visible', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Should have some content — not a blank page
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })
})

test.describe('Analytics page', () => {
  test('loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('shows stat cards', async ({ page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')
    // Should have Total Views or similar stat
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/views|followers|engagements/i)
  })

  test('stat definition note is visible', async ({ page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/what these numbers mean/i)).toBeVisible()
  })
})

test.describe('Clients page', () => {
  test('loads without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('shows client list or empty state', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })
})

test.describe('Settings page', () => {
  test('loads without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })
})

test.describe('API routes', () => {
  test('POST /api/stripe/portal requires auth (returns non-401 for logged-in admin)', async ({ page }) => {
    const res = await page.request.post('/api/stripe/portal')
    // Should not be unauthorized — we are logged in
    expect(res.status()).not.toBe(401)
  })

  test('POST /api/stripe/checkout requires auth (returns non-401 for logged-in admin)', async ({ page }) => {
    const res = await page.request.post('/api/stripe/checkout')
    // Should not be unauthorized — we are logged in
    expect(res.status()).not.toBe(401)
  })
})
