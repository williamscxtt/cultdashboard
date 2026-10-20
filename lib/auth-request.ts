import { RequestTimeout, withDeadline } from './request-deadline'

export class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'AuthRequestError' }
}

export async function authRequest<T extends { error?: string } = { ok?: boolean; redirectTo?: string; error?: string }>(
  path: string, body: Record<string, unknown>, timeoutMs = 20_000,
): Promise<T> {
  try {
    return await withDeadline(async signal => {
      const response = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', cache: 'no-store', body: JSON.stringify(body), signal,
      })
      const data = await response.json().catch(() => null) as T | null
      if (!data) throw new Error('The Dashboard could not respond. Please try again.')
      if (!response.ok) throw new AuthRequestError(data.error || 'The request could not be completed. Please try again.', response.status)
      return data
    }, timeoutMs)
  } catch (error) {
    if (error instanceof RequestTimeout) throw new Error('This is taking too long. Please try again.')
    if (error instanceof TypeError) throw new Error('Could not reach the Dashboard. Check your connection and try again.')
    throw error
  }
}
