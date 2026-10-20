import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { normalizeMemberEmail } from '@/lib/skool-membership-event'
import { RequestTimeout, withDeadline } from '@/lib/request-deadline'

export const maxDuration = 20

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== req.nextUrl.origin) return json({ error: 'Please sign in from the Dashboard website.' }, 403)
  const body = await req.json().catch(() => null) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? normalizeMemberEmail(body.email) : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || email.length > 320 || password.length > 4096) {
    return json({ error: 'Enter your email and Dashboard password.' }, 400)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return json({ error: 'Sign-in is temporarily unavailable. Please try again later.' }, 503)
  const pendingCookies = new Map<string, { value: string; options: CookieOptions }>()
  try {
    const result = await withDeadline(async signal => {
      // A fresh password login must not wait for a browser's session-storage
      // lock or an expired session refresh. Persist cookies only on success.
      const supabase = createServerClient(url, key, {
        global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
        cookieOptions: { path: '/', sameSite: 'lax', secure: req.nextUrl.protocol === 'https:' },
        cookies: {
          getAll: () => [],
          setAll: cookies => { for (const cookie of cookies) pendingCookies.set(cookie.name, cookie) },
        },
      })
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) return { error, profile: null }
      const profile = await supabase.from('profiles').select('role,onboarding_completed').eq('id', data.user.id).maybeSingle()
      return { error: null, profile }
    }, 12_000)

    if (result.error) {
      if (result.error.status === 429) return json({ error: 'Too many sign-in attempts. Please wait a moment and try again.' }, 429)
      if (!result.error.status || result.error.status >= 500) return json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, 503)
      return json({ error: 'Email or Dashboard password is incorrect. First time here? Create your Dashboard account using your Skool email.' }, 401)
    }
    if (!result.profile || result.profile.error) return json({ error: 'Could not load your Dashboard account. Please try again.' }, 503)
    if (!result.profile.data) return json({ error: 'Finish creating your Dashboard account before signing in.' }, 403)
    const profile = result.profile.data
    const response = json({ ok: true, redirectTo: profile.role === 'client' && !profile.onboarding_completed
      ? '/dashboard/onboarding' : '/dashboard/analytics' })
    const cookieName = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name === cookieName || cookie.name.startsWith(cookieName + '.')) {
        response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
      }
    }
    for (const [name, cookie] of pendingCookies) response.cookies.set(name, cookie.value, cookie.options)
    return response
  } catch (error) {
    return json({ error: error instanceof RequestTimeout
      ? 'Sign-in took too long. Please try again.' : 'Sign-in is temporarily unavailable. Please try again.' },
    error instanceof RequestTimeout ? 504 : 503)
  }
}
