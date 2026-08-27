import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const { pathname } = request.nextUrl

  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    return redirectWithSession(request, supabaseResponse, '/login')
  }

  if (isAuthenticated && pathname === '/login') {
    return redirectWithSession(request, supabaseResponse, '/dashboard')
  }

  return preventAuthCaching(supabaseResponse)
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/onboarding/:path*'],
}
