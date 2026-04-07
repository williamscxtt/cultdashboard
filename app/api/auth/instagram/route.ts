import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.INSTAGRAM_APP_ID?.trim()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/api/auth/instagram/callback`

  if (!clientId) {
    return NextResponse.json({ error: 'Instagram App ID not configured. Add INSTAGRAM_APP_ID to env vars.' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'instagram_business_basic,instagram_business_manage_insights',
    response_type: 'code',
  })

  return NextResponse.redirect(`https://www.instagram.com/oauth/authorize?${params}`)
}
