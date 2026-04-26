/**
 * Client auth setup — uses Supabase admin API to:
 *   1. Set a temporary password on the test client account
 *   2. Sign in via the normal login form (same flow a real user would use)
 *   3. Save auth state for all client.spec.ts tests
 *
 * Magic-link approach was abandoned because Supabase redirects to the production
 * site URL (/apply) which doesn't initialise the Supabase browser client, so
 * hash tokens are never exchanged for cookies and subsequent /dashboard requests
 * have no session.
 */
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

export const CLIENT_AUTH = path.join(__dirname, '../playwright/.auth/client.json')
const TEST_CLIENT_EMAIL = 'willscott2018@outlook.com'
// Fixed password used only for Playwright — it's a test-only account.
const TEST_CLIENT_PASSWORD = 'playwright-client-test-2024!'

setup('authenticate as test client', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!

  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env.local')
  }

  fs.mkdirSync(path.dirname(CLIENT_AUTH), { recursive: true })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Look up the test client profile
  const { data: profile } = await admin
    .from('profiles')
    .select('id, billing_exempt')
    .eq('email', TEST_CLIENT_EMAIL)
    .single()

  if (!profile) throw new Error(`Test client ${TEST_CLIENT_EMAIL} not found in profiles table`)

  // Look up fuller profile fields
  const { data: fullProfile } = await admin
    .from('profiles')
    .select('id, billing_exempt, onboarding_hub_complete')
    .eq('email', TEST_CLIENT_EMAIL)
    .single()

  // Ensure billing_exempt = true so they can reach the dashboard without a subscription
  // Ensure onboarding_hub_complete = true so nav items are unlocked (not rendered as divs)
  const updates: Record<string, unknown> = {}
  if (!fullProfile?.billing_exempt) updates.billing_exempt = true
  if (!fullProfile?.onboarding_hub_complete) updates.onboarding_hub_complete = true
  if (Object.keys(updates).length > 0) {
    await admin.from('profiles').update(updates).eq('id', profile.id)
    console.log('✓ Set test flags on client:', updates)
  }

  // Set a known test password so we can sign in via the login form.
  // This is simpler and more reliable than the magic-link hash approach.
  const { error: pwError } = await admin.auth.admin.updateUserById(profile.id, {
    password: TEST_CLIENT_PASSWORD,
  })
  if (pwError) throw new Error(`Failed to set test password: ${pwError.message}`)
  console.log('✓ Test password set on client account')

  // Sign in through the normal login form
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', TEST_CLIENT_EMAIL)
  await page.fill('input[type="password"]', TEST_CLIENT_PASSWORD)
  await page.click('button[type="submit"]')

  // Wait for redirect to /dashboard (or /dashboard/onboarding if onboarding is incomplete)
  await page.waitForURL(/localhost:3000\/dashboard/, { timeout: 20_000 })

  await page.context().storageState({ path: CLIENT_AUTH })
  console.log('✓ Client auth state saved')
})
