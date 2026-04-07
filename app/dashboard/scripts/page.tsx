import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import ScriptCards from '@/components/dashboard/ScriptCards'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { FileText } from 'lucide-react'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function ScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const { data: weeklyScript } = await adminClient
    .from('weekly_scripts')
    .select('*')
    .eq('profile_id', profileId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const weekStart = weeklyScript?.week_start
    ? new Date(weeklyScript.week_start).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
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
