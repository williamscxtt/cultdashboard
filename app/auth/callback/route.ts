/**
 * Auth callback handler — processes:
 * 1. Email confirmation links (code exchange)
 * 2. OAuth callbacks
 * 3. Magic link logins
 *
 * Supabase sends users here after they click the confirmation email.
 * We exchange the code for a session then redirect to the dashboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect to onboarding for new users, or dashboard for returning users
      const redirectTo = searchParams.get('next') ?? '/dashboard'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Something went wrong — send to login with error message
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
