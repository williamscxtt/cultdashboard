import { createHmac, timingSafeEqual } from 'node:crypto'

export function validInstagramCronSignature(secret: string, nonce: string | null, timestamp: string | null, signature: string | null, now = Date.now()): boolean {
  if (!secret || !nonce || !timestamp || !signature) return false
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nonce)
    || !/^\d{10}$/.test(timestamp) || !/^[0-9a-f]{64}$/i.test(signature)) return false
  if (Math.abs(now - Number(timestamp) * 1000) > 5 * 60000) return false
  const expected = createHmac('sha256', secret).update(`${nonce}.${timestamp}`).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}
