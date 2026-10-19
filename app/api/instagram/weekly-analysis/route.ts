import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeInstagramSync } from '@/lib/instagram-sync-auth'
import { loadWeeklyAnalysis } from '@/lib/weekly-analysis-server'

export const maxDuration = 45
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId')
  if (!profileId || !/^[a-f0-9-]{36}$/i.test(profileId)) return NextResponse.json({error:'Invalid profileId'},{status:400})
  const denied = await authorizeInstagramSync(profileId)
  if (denied) return denied
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
  const profile = await db.from('profiles').select('name,ig_username,followers_count,niche,biggest_challenge,ninety_day_goal,intro_structured,focus_this_week').eq('id',profileId).single()
  if (profile.error || !profile.data) return NextResponse.json({error:'Weekly analysis is temporarily unavailable.'},{status:503})
  try {
    const analysis = await loadWeeklyAnalysis(db,profileId,profile.data)
    return NextResponse.json({analysis},{headers:{'Cache-Control':'private, no-store'}})
  } catch {
    console.error('[weekly-analysis] Saved statistics could not load',profileId)
    return NextResponse.json({error:'Weekly analysis is temporarily unavailable.'},{status:503})
  }
}
