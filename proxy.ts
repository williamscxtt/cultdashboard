import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canUseDashboard, SKOOL_REJOIN_URL } from '@/lib/dashboard-access'
import { isMemberRoute } from '@/lib/member-route'

function preventAuthCaching(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
  response.headers.set('Expires', '0')
  response.headers.set('Pragma', 'no-cache')
  return response
}

function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''

  const redirectResponse = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
    redirectResponse.cookies.set(name, value, options)
  )

  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = sessionResponse.headers.get(header)
    if (value) redirectResponse.headers.set(header, value)
  }

  return preventAuthCaching(redirectResponse)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const memberRoute = isMemberRoute(pathname)
  if (pathname.startsWith('/api/') && !memberRoute) return NextResponse.next({ request })

  // Skip auth check if Supabase isn't configured yet
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value)
          )
        },
      },
    }
  )

  // Keep this immediately after client creation. It validates the JWT and lets
  // Supabase refresh the session before any response is returned.
  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims)

  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    return redirectWithSession(request, supabaseResponse, '/login')
  }

  if (memberRoute) {
    const apiRequest = pathname.startsWith('/api/')
    if (!isAuthenticated) {
      return preventAuthCaching(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // Read the current row, so an existing session cannot keep using member
    // tools after churn. JWT claims alone can outlive an entitlement change.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_active, billing_exempt, access_type, billing_provider, membership_tier, subscription_status, subscription_period_end, skool_access_review_due_at')
      .eq('id', data!.claims!.sub)
      .maybeSingle()

    if (error) {
      return preventAuthCaching(NextResponse.json({ error: 'Unable to verify membership. Please try again.' }, { status: 503 }))
    }
    if (!profile || !canUseDashboard(profile)) {
      if (!apiRequest) return redirectWithSession(request, supabaseResponse, '/subscribe')
      const response = NextResponse.json({
        error: 'An active Creator Cult membership is required.',
        code: 'membership_required',
        rejoinUrl: SKOOL_REJOIN_URL,
      }, { status: 403 })
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => response.cookies.set(name, value, options))
      return preventAuthCaching(response)
    }
  }

  if (isAuthenticated && pathname === '/login') {
    return redirectWithSession(request, supabaseResponse, '/dashboard')
  }

  return preventAuthCaching(supabaseResponse)
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*', '/login', '/onboarding/:path*'],
}
