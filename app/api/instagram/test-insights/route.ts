import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('ig_access_token, ig_user_id')
    .eq('id', profileId)
    .single()

  if (!profile?.ig_access_token) return NextResponse.json({ error: 'no token' })

  // Get first reel
  const mediaUrl = new URL('https://graph.instagram.com/v21.0/me/media')
  mediaUrl.searchParams.set('fields', 'id,media_type,timestamp')
  mediaUrl.searchParams.set('limit', '3')
  mediaUrl.searchParams.set('access_token', profile.ig_access_token)
  const mediaRes = await fetch(mediaUrl.toString())
  const mediaJson = await mediaRes.json()
  const reels = (mediaJson.data ?? []).filter((m: { media_type: string }) => m.media_type === 'VIDEO')
  if (!reels.length) return NextResponse.json({ error: 'no reels', media: mediaJson })

  const firstReel = reels[0]

  // Try insights
  const insightUrl = new URL(`https://graph.instagram.com/v21.0/${firstReel.id}/insights`)
  insightUrl.searchParams.set('metric', 'plays,reach,saved,shares')
  insightUrl.searchParams.set('access_token', profile.ig_access_token)
  const insightRes = await fetch(insightUrl.toString())
  const insightJson = await insightRes.json()

  return NextResponse.json({
    reel_id: firstReel.id,
    insight_status: insightRes.status,
    insight_response: insightJson,
  })
}
