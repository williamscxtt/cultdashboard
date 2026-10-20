import { RequestTimeout, withDeadline } from './request-deadline'

/** Bound headers and response parsing, so a tool can always offer a retry. */
export async function dashboardRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
  try {
    return await withDeadline(async signal => {
      const response = await fetch(path, { ...init, credentials: 'same-origin', cache: 'no-store', signal })
      const data = await response.json().catch(() => null)
      if (response.status === 401) throw new Error('Your session has expired. Please sign in again.')
      if (!data) throw new Error('The Dashboard could not respond. Please try again.')
      if (!response.ok) throw new Error(data.message || data.error || 'The request could not be completed. Please try again.')
      return data as T
    }, timeoutMs)
  } catch (error) {
    if (error instanceof RequestTimeout) throw new Error('This is taking too long. Please try again. Your saved work is still there.')
    if (error instanceof TypeError) throw new Error('Could not reach the Dashboard. Check your connection and try again.')
    throw error
  }
}
