import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { WeeklyReport } from '@/lib/types'
import IntelReport from '@/components/dashboard/IntelReport'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { Globe } from 'lucide-react'

export default async function IntelPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: report } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const weekLabel = report
    ? new Date(report.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title="Competitor Intel"
        description={weekLabel ? `Week of ${weekLabel}` : 'Weekly competitor analysis and trending content.'}
      />

      {report ? (
        <IntelReport report={report as WeeklyReport} />
      ) : (
        <Card>
          <EmptyState
            icon={<Globe size={20} />}
            title="No report yet"
            description="Weekly reports are generated every Monday morning after competitor scraping runs."
          />
        </Card>
      )}
    </div>
  )
}
