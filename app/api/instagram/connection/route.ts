import { NextRequest, NextResponse } from 'next/server'
import { instagramAdmin, instagramConfig, requireInstagramPilot } from '@/lib/instagram-connection'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireInstagramPilot()
    if (req.headers.get('origin') !== instagramConfig().baseUrl) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 })
    const body = await req.json()
    if (body.action !== 'disconnect') return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    const { error } = await instagramAdmin().from('instagram_connections').delete().eq('profile_id', user.id)
    if (error) throw new Error('storage')
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: code === 'unauthorized' ? code : 'disconnect_failed' }, { status: code === 'unauthorized' ? 401 : 403 })
  }
}
