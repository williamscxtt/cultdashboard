/**
 * Effective user utility — returns the profile ID that should be used for data
 * fetching in dashboard pages.
 *
 * When an admin is impersonating a client, their effective profile ID is the
 * client's profile ID, not their own.
 */
import { cookies } from 'next/headers'

export const IMPERSONATE_COOKIE = 'cult_impersonating_as'

export async function getImpersonatedId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null
}

/**
 * Given the real user ID and whether they're admin, return the profile ID
 * pages should use when fetching user-specific data.
 */
export function effectiveId(realUserId: string, isAdmin: boolean, impersonatingAs: string | null): string {
  if (isAdmin && impersonatingAs) return impersonatingAs
  return realUserId
}
