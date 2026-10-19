import { instagramUsername } from './instagram-statistics'
import { normalizeMemberEmail } from './skool-membership-event'

export function signupInput(body: unknown) {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const username = instagramUsername(value.ig_username)
  if (!username) return { error: 'Enter your Instagram username using letters, numbers, full stops or underscores.' } as const
  const email = typeof value.email === 'string' ? normalizeMemberEmail(value.email) : ''
  const password = typeof value.password === 'string' ? value.password : ''
  if (!email || !password) return { error: 'Email and password are required' } as const
  if (password.length < 8) return { error: 'Use a password with at least 8 characters.' } as const
  return { data: {
    name: typeof value.name === 'string' ? value.name.trim() : '',
    email, password, ig_username: username,
  } } as const
}
