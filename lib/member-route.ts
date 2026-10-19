// Preserve existing public, service and account-management routes.
// All other API routes require a current Dashboard entitlement.
const EXEMPT_PREFIXES = [
  '/api/auth/', '/api/webhooks/', '/api/stripe/', '/api/cron/',
  '/api/slack/', '/api/account/', '/api/admin/',
]
const EXEMPT_PATHS = new Set([
  '/api/applications', '/api/applications/track', '/api/track-checkout',
  '/api/lead-magnets/offer-builder',
  '/api/instagram/sync-all', '/api/instagram/sync',
])

export function isMemberRoute(pathname: string): boolean {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true
  if (!pathname.startsWith('/api/')) return false
  return !EXEMPT_PATHS.has(pathname) && !EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix))
}
