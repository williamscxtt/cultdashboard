/**
 * POST /api/weekly-package/edit-script
 *
 * Saves an inline edit to a specific reel within a weekly scripts package.
 * Also records the edit in profile.intro_structured for future AI context.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * Apply field-level edits to a specific reel block within the markdown string.
 * Operates by locating the Nth reel block and doing targeted regex replacements.
 */
function applyEdit(
  md: string,
  reelIndex: number,
  edits: { hook?: string; script?: string; caption?: string; cta?: string },
): string {
  // Find start positions of all reel blocks
  const reelPattern = /###\s*🎬\s*Reel\s*\d+/g
  const positions: number[] = []
  let m
  while ((m = reelPattern.exec(md)) !== null) positions.push(m.index)

  if (reelIndex >= positions.length) return md

  const blockStart = positions[reelIndex]
  const blockEnd = reelIndex + 1 < positions.length ? positions[reelIndex + 1] : md.length
  let block = md.slice(blockStart, blockEnd)

  if (edits.hook !== undefined) {
    block = block.replace(/(\*\*Hook:\*\*[ \t]*)([^\n]*)/, `$1${edits.hook}`)
  }
  if (edits.script !== undefined) {
    block = block.replace(
      /(\*\*Script:\*\*[ \t]*\n?)([\s\S]*?)(\n\*\*Caption:\*\*|\n\*\*CTA:\*\*)/,
      `$1${edits.script}\n$3`,
    )
  }
  if (edits.caption !== undefined) {
    block = block.replace(
      /(\*\*Caption:\*\*[ \t]*\n?)([\s\S]*?)(\n\*\*CTA:\*\*|---|\n{3}|$)/,
      `$1${edits.caption}\n$3`,
    )
  }
  if (edits.cta !== undefined) {
    block = block.replace(/(\*\*CTA:\*\*[ \t]*)([^\n]*)/, `$1${edits.cta}`)
  }

  return md.slice(0, blockStart) + block + md.slice(blockEnd)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    packageId?: string
    profileId?: string
    reelIndex?: number
    hook?: string
    script?: string
    caption?: string
    cta?: string
  }

  const { packageId, profileId, reelIndex, hook, script, caption, cta } = body
  if (!packageId || reelIndex === undefined) {
    return NextResponse.json({ error: 'packageId and reelIndex required' }, { status: 400 })
  }

  // Auth — admin can edit any package; client can only edit their own
  const { data: userProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = userProfile?.role === 'admin'

  const { data: pkg } = await admin
    .from('weekly_scripts')
    .select('id, scripts_md, profile_id')
    .eq('id', packageId)
    .single()

  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  if (!isAdmin && pkg.profile_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updatedMd = applyEdit(pkg.scripts_md, reelIndex, { hook, script, caption, cta })
  await admin.from('weekly_scripts').update({ scripts_md: updatedMd }).eq('id', packageId)

  // Record editing context in profile.intro_structured so future generations can learn
  const targetProfileId = profileId || pkg.profile_id
  const { data: profile } = await admin.from('profiles').select('intro_structured').eq('id', targetProfileId).single()
  if (profile) {
    const intro = (profile.intro_structured ?? {}) as Record<string, unknown>
    const history = (intro.script_editing_history ?? []) as Array<Record<string, string>>
    history.push({
      timestamp: new Date().toISOString(),
      edited_hook: hook || '',
      edited_script_preview: script ? script.slice(0, 200) : '',
    })
    await admin
      .from('profiles')
      .update({ intro_structured: { ...intro, script_editing_history: history.slice(-20) } })
      .eq('id', targetProfileId)
  }

  return NextResponse.json({ ok: true })
}
