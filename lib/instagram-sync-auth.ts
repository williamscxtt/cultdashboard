import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { canUseDashboard } from '@/lib/dashboard-access'

export async function authorizeInstagramSync(profileId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error || !profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (profile.role === 'admin') return null
  if (!profileId || profileId !== user.id || !canUseDashboard(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
