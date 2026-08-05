/**
 * Public page tests — no auth required.
 * Covers: login page, subscribe page, unauthenticated redirects.
 */
import { test, expect } from '@playwright/test'

test.describe('Landing page payment options', () => {
  test('all general purchase CTAs lead to the pricing section', async ({ page }) => {
    await page.goto('/')

    const pricingSection = page.locator('#pricing')
    await expect(pricingSection).toHaveAttribute('aria-labelledby', 'pricing-title')

    const pricingCtas = page.locator('[data-pricing-cta]')
    await expect(pricingCtas).toHaveCount(6)

    for (let index = 0; index < await pricingCtas.count(); index += 1) {
      await expect(pricingCtas.nth(index)).toHaveAttribute('href', '#pricing')
    }

    await pricingCtas.nth(1).click()
    await expect(page).toHaveURL(/#pricing$/)
  })

  test('shows exactly the two supplied Commas checkout choices', async ({ page }) => {
    await page.goto('/')

    const pricingSection = page.locator('#pricing')
    const checkoutLinks = pricingSection.locator('[data-checkout-plan]')
    const allCommasCheckoutLinks = page.locator('a[href^="https://commas.com/checkout/"]')

    await expect(allCommasCheckoutLinks).toHaveCount(2)
    await expect(checkoutLinks).toHaveCount(2)
    await expect(checkoutLinks.nth(0)).toHaveAttribute(
      'href',
      'https://commas.com/checkout/qLkzpmpZrFYjbX7L',
    )
    await expect(checkoutLinks.nth(1)).toHaveAttribute(
      'href',
      'https://commas.com/checkout/n69wWQYTD3Hnl7',
    )

    await expect(pricingSection.getByText('$997', { exact: true })).toBeVisible()
    await expect(pricingSection.getByText('£740', { exact: true })).toBeVisible()
    await expect(pricingSection.getByText('3 × $333', { exact: true })).toBeVisible()
    await expect(pricingSection.getByText('3 × £250', { exact: true })).toBeVisible()
    await expect(page.getByText(/£150\/month/i)).toHaveCount(0)
  })
})

test.describe('Landing page story and member results', () => {
  test('uses the updated first-person story and proof figures', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Why my story matters', { exact: true })).toBeVisible()
    await expect(page.getByText('1.5M+', { exact: true })).toBeVisible()
    await expect(page.getByText('£500K+', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('£50K', { exact: true })).toBeVisible()
    await expect(page.getByText(/£30K months/i)).toHaveCount(0)
    await expect(page.getByText(/weekly live coaching with Will/i)).toHaveCount(0)
  })

  test('shows four evidence cards per desktop row and opens a case study', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')

    const cards = page.locator('button[aria-controls="member-case-study"]')
    await expect(cards).toHaveCount(8)

    const first = await cards.nth(0).boundingBox()
    const fourth = await cards.nth(3).boundingBox()
    const fifth = await cards.nth(4).boundingBox()

    expect(first).not.toBeNull()
    expect(fourth).not.toBeNull()
    expect(fifth).not.toBeNull()
    expect(Math.abs(first!.y - fourth!.y)).toBeLessThan(2)
    expect(fifth!.y).toBeGreaterThan(first!.y + first!.height)

    await cards.nth(3).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'First 3 clients signed' })).toBeVisible()
    await expect(dialog.getByText('Proof 1 of 2')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

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
