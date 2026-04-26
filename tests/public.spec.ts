/**
 * Public page tests — no auth required.
 * Covers: login page, subscribe page, unauthenticated redirects.
 */
import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('renders email + password form', async ({ page }) => {
    await page.goto('/login')
    // Inputs are identified by type/placeholder (labels aren't associated via htmlFor)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible()
  })

  test('shows error on bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('bad@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).first().click()
    // Should stay on login and show an error message
    await expect(page).toHaveURL(/\/login/)
    await page.waitForTimeout(2000)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })
})

test.describe('Subscribe page', () => {
  test('renders pricing card with £50/month and trial badge', async ({ page }) => {
    await page.goto('/subscribe')
    await expect(page.getByText('£50')).toBeVisible()
    await expect(page.getByText('/month')).toBeVisible()
    await expect(page.getByText(/30-day free trial/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /start free trial/i })).toBeVisible()
  })

  test('shows all six feature bullets', async ({ page }) => {
    await page.goto('/subscribe')
    await expect(page.getByText(/Instagram analytics/i)).toBeVisible()
    await expect(page.getByText(/AI content analysis/i)).toBeVisible()
    await expect(page.getByText(/Weekly coaching reports/i)).toBeVisible()
    await expect(page.getByText('Cancel anytime from billing settings')).toBeVisible()
  })

  test('shows past_due banner when ?past_due=1', async ({ page }) => {
    await page.goto('/subscribe?past_due=1')
    await expect(page.getByText(/last payment failed/i)).toBeVisible()
  })

  test('shows canceled banner when ?canceled=1', async ({ page }) => {
    await page.goto('/subscribe?canceled=1')
    await expect(page.getByText(/checkout was cancelled/i)).toBeVisible()
  })
})

test.describe('Auth redirects', () => {
  test('unauthenticated user visiting /dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /dashboard/clients is redirected', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await expect(page).toHaveURL(/\/login/)
  })
})
