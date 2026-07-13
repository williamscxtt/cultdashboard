'use client'

import { useState } from 'react'

type PurchaseButtonProps = {
  children: React.ReactNode
  className?: string
}

export default function PurchaseButton({ children, className }: PurchaseButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function startCheckout() {
    if (status === 'loading') return

    setStatus('loading')

    fetch('/api/track-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'landing_checkout' }),
    }).catch(() => undefined)

    try {
      const response = await fetch('/api/stripe/checkout-membership', { method: 'POST' })
      const data = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Checkout could not be started.')
      }

      window.location.assign(data.url)
    } catch {
      setStatus('error')
    }
  }

  return (
    <span className={className}>
      <button type="button" onClick={startCheckout} disabled={status === 'loading'}>
        {status === 'loading' ? 'Opening checkout…' : children}
      </button>
      {status === 'error' ? (
        <span role="alert">Checkout did not open. Please try again.</span>
      ) : null}
    </span>
  )
}
