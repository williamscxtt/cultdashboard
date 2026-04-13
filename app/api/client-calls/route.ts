/**
 * GET  /api/client-calls?profileId=X  — list calls for a client
 * POST /api/client-calls              — create a call (manual log or from webhook)
 *
 * When rawNotes is supplied, Claude extracts summary + action items automatically.
 */
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── GET — list calls ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data, error } = await adminClient
    .from('client_calls')
    .select('*')
    .eq('profile_id', profileId)
    .order('call_date', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ calls: data || [] })
}

// ── POST — create call ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    profileId?: string
    callDate?: string
    title?: string
    rawNotes?: string
    summary?: string
    actionItems?: string[]
    durationSec?: number
    attendees?: string[]
    recordingUrl?: string
    fathomCallId?: string
  }

  const { profileId, callDate, title, rawNotes, summary: summaryIn, actionItems: itemsIn,
          durationSec, attendees, recordingUrl, fathomCallId } = body

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  if (!callDate)  return NextResponse.json({ error: 'callDate required' }, { status: 400 })

  let summary = summaryIn ?? ''
  let actionItems: string[] = itemsIn ?? []

  // If raw notes provided and no structured data, extract with Claude
  if (rawNotes && (!summary || actionItems.length === 0)) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Extract a clean summary and action items from these call notes.

Return ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence summary of what was discussed and decided",
  "action_items": ["Action 1 (owner if mentioned)", "Action 2", ...]
}

Call notes:
${rawNotes.slice(0, 4000)}`,
        }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (!summary && parsed.summary) summary = parsed.summary
        if (!actionItems.length && Array.isArray(parsed.action_items)) actionItems = parsed.action_items
      }
    } catch (err) {
      console.error('[client-calls] Claude extraction failed:', err)
      // Continue without AI — save raw notes anyway
    }
  }

  const { data, error } = await adminClient
    .from('client_calls')
    .insert({
      profile_id:     profileId,
      fathom_call_id: fathomCallId ?? null,
      call_date:      callDate,
      title:          title ?? 'Call',
      duration_sec:   durationSec ?? null,
      summary:        summary || null,
      action_items:   actionItems,
      raw_notes:      rawNotes ?? null,
      attendees:      attendees ?? null,
      recording_url:  recordingUrl ?? null,
    })
    .select()
    .single()

  if (error) {
    // Duplicate fathom_call_id is not an error — just return existing
    if (error.code === '23505') return NextResponse.json({ call: null, duplicate: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ call: data })
}

// ── DELETE — remove a call ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminClient
    .from('client_calls')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
