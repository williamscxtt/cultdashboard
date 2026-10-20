import 'server-only'
import { cache } from 'react'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from './supabase-server'
import type { Profile } from './types'

/** React cache lasts for this server render, never across members or requests. */
export const dashboardSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data, error } = await admin.from('profiles').select('*').eq('id', user.id).single()
  return { user, profile: error ? null : data as Profile }
})
