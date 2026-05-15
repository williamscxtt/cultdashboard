import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  // Auth check — admin only
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Fetch raw applications ──────────────────────────────────────────────────
  const { data: apps, error } = await adminClient
    .from('applications')
    .select('id, created_at, name, email, instagram_handle, phone, status, details')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = apps ?? []

  // ── Summary stats ───────────────────────────────────────────────────────────
  const total       = rows.length
  const qualified   = rows.filter(r => r.status === 'pending').length
  const paymentTier = rows.filter(r => r.status === 'payment_tier').length
  const disqualified = rows.filter(r => r.status === 'disqualified').length

  // ── Weekly trend (last 8 weeks) ─────────────────────────────────────────────
  const weekMap: Record<string, { total: number; qualified: number; payment: number; disqualified: number }> = {}
  rows.forEach(r => {
    const d = new Date(r.created_at)
    // Start of week (Monday)
    const day = d.getUTCDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const mon = new Date(d)
    mon.setUTCDate(d.getUTCDate() + diff)
    mon.setUTCHours(0, 0, 0, 0)
    const key = mon.toISOString().slice(0, 10)
    if (!weekMap[key]) weekMap[key] = { total: 0, qualified: 0, payment: 0, disqualified: 0 }
    weekMap[key].total++
    if (r.status === 'pending') weekMap[key].qualified++
    else if (r.status === 'payment_tier') weekMap[key].payment++
    else if (r.status === 'disqualified') weekMap[key].disqualified++
  })
  const weeklyTrend = Object.entries(weekMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8)
    .map(([week, counts]) => ({ week, ...counts }))

  // ── Investment breakdown ────────────────────────────────────────────────────
  const invMap: Record<string, number> = {}
  rows.forEach(r => {
    const inv = r.details?.investment_amount as string | undefined
    if (inv) {
      invMap[inv] = (invMap[inv] ?? 0) + 1
    }
  })
  const ORDER = [
    'Not right now',
    '£500 or below',
    '£500–£1,000',
    '£1,000–£2,000',
    '£2,000+',
    '£250–£1,000',
    '£2,000–£3,500',
    '£3,500–£5,000',
    '£10,000+',
  ]
  const investmentBreakdown = ORDER
    .filter(k => invMap[k])
    .map(k => ({ label: k, count: invMap[k] }))

  // ── Creator type breakdown ──────────────────────────────────────────────────
  const typeMap: Record<string, number> = {}
  rows.forEach(r => {
    const t = r.details?.creator_type as string | undefined
    if (t) typeMap[t] = (typeMap[t] ?? 0) + 1
  })
  const creatorTypes = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))

  // ── Wants breakdown ─────────────────────────────────────────────────────────
  const wantsMap: Record<string, number> = {}
  rows.forEach(r => {
    const w = r.details?.wants as string | undefined
    if (w) wantsMap[w] = (wantsMap[w] ?? 0) + 1
  })
  const wantsBreakdown = Object.entries(wantsMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))

  // ── Step funnel ─────────────────────────────────────────────────────────────
  let funnelSteps: Array<{ step: number; label: string; sessions: number }> = []
  try {
    const { data: steps } = await adminClient
      .from('apply_funnel_steps')
      .select('step, session_id')

    if (steps && steps.length > 0) {
      const bySessions: Record<number, Set<string>> = {}
      steps.forEach((s: { step: number; session_id: string }) => {
        if (!bySessions[s.step]) bySessions[s.step] = new Set()
        bySessions[s.step].add(s.session_id)
      })
      const stepLabels: Record<number, string> = {
        1: 'Who you are',
        2: 'Content activity',
        3: "What's in the way",
        4: 'Commitment & budget',
        5: 'Contact info',
      }
      funnelSteps = [1, 2, 3, 4, 5].map(n => ({
        step: n,
        label: stepLabels[n],
        sessions: bySessions[n]?.size ?? 0,
      }))
    }
  } catch {
    // Table may not exist yet — ignore
  }

  // ── Recent applications (last 20) ───────────────────────────────────────────
  const recent = rows.slice(0, 20).map(r => ({
    id: r.id,
    created_at: r.created_at,
    name: r.name,
    email: r.email,
    instagram_handle: r.instagram_handle,
    phone: r.phone,
    status: r.status,
    investment_amount: r.details?.investment_amount ?? null,
    wants: r.details?.wants ?? null,
    creator_type: r.details?.creator_type ?? null,
  }))

  return NextResponse.json({
    total,
    qualified,
    paymentTier,
    disqualified,
    weeklyTrend,
    investmentBreakdown,
    creatorTypes,
    wantsBreakdown,
    funnelSteps,
    recent,
  })
}
