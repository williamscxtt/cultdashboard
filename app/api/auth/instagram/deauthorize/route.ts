import { NextRequest, NextResponse } from 'next/server'
import { instagramAdmin, instagramConfig } from '@/lib/instagram-connection'
import { verifyInstagramSignedRequest } from '@/lib/instagram-oauth-security'

export async function POST(req: NextRequest) {
  let instagramUserId: string
  try {
    const form = await req.formData()
    instagramUserId = verifyInstagramSignedRequest(String(form.get('signed_request') || ''), instagramConfig().appSecret)
  } catch { return NextResponse.json({ error: 'invalid_signature' }, { status: 400 }) }
  // Meta uses app-scoped and Graph account IDs on different surfaces.
  const { error } = await instagramAdmin().from('instagram_connections').delete().or(`instagram_user_id.eq.${instagramUserId},graph_user_id.eq.${instagramUserId}`)
  return error ? NextResponse.json({ error: 'storage' }, { status: 503 }) : NextResponse.json({ success: true })
}
