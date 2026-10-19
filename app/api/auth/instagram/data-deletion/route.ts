import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { instagramAdmin, instagramConfig } from '@/lib/instagram-connection'
import { verifyInstagramSignedRequest } from '@/lib/instagram-oauth-security'

export async function POST(req: NextRequest) {
  let instagramUserId: string
  try {
    const form = await req.formData()
    instagramUserId = verifyInstagramSignedRequest(String(form.get('signed_request') || ''), instagramConfig().appSecret)
  } catch { return NextResponse.json({ error: 'invalid_signature' }, { status: 400 }) }
  // No private Insights are persisted in the pilot; only the encrypted connection.
  const admin = instagramAdmin(), confirmationCode = randomBytes(24).toString('base64url')
  const { error } = await admin.from('instagram_connections').delete().or(`instagram_user_id.eq.${instagramUserId},graph_user_id.eq.${instagramUserId}`)
  if (error) return NextResponse.json({ error: 'storage' }, { status: 503 })
  const { error: receiptError } = await admin.from('instagram_deletion_receipts').insert({ confirmation_code: confirmationCode })
  if (receiptError) return NextResponse.json({ error: 'storage' }, { status: 503 })
  return NextResponse.json({ url: instagramConfig().baseUrl + '/data-deletion/status?code=' + confirmationCode, confirmation_code: confirmationCode })
}
