/** Public messages never expose provider responses, credentials or database errors. */
export function instagramSyncFeedback(error: unknown) {
  const value = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (/provider_usage_limit|monthly usage hard limit exceeded/i.test(value)) {
    return { code: 'provider_usage_limit', message: 'Instagram updates are temporarily paused because the sync service has reached its usage limit. Your saved statistics are still available. You do not need to reconnect your account.', status: 503 }
  }
  if (/token_expired/i.test(value)) return { code: 'token_expired', message: 'Instagram session expired. Reconnect in Settings.', status: 401 }
  if (/rate_limited|HTTP 429|too many requests/i.test(value)) return { code: 'rate_limited', message: 'Instagram updates are busy. Please try again later. Your saved statistics are still available.', status: 429 }
  if (/restricted_page|restricted profile|\(restricted\)|not_found/i.test(value)) return { code: 'account_unavailable', message: 'Instagram could not return this account’s public statistics. Check your Instagram username in Settings. Your saved statistics are still available.', status: 502 }
  return { code: 'sync_unavailable', message: 'Instagram could not refresh right now. Your saved statistics are still available. Please try again later.', status: 502 }
}
