import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ScriptCards from '@/components/dashboard/ScriptCards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { FileText } from 'lucide-react'

export default async function ScriptsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: weeklyScript } = await supabase
    .from('weekly_scripts')
    .select('*')
    .eq('profile_id', user.id)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const weekStart = weeklyScript?.week_start
    ? new Date(weeklyScript.week_start).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title="Your Scripts"
        description={weekStart ? `Week of ${weekStart}` : 'Scripts are generated every Monday at 9am.'}
      />

      {weeklyScript ? (
        <ScriptCards scriptsMd={weeklyScript.scripts_md} />
      ) : (
        <Card>
          <EmptyState
            icon={<FileText size={20} />}
            title="No scripts yet"
            description="Scripts are generated every Monday at 9am. Check back then."
          />
        </Card>
      )}
    </div>
  )
}
