import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { postCircleComment } from '@/lib/circle-api'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/** Verify Slack's request signature to prevent spoofing */
async function verifySlackSignature(req: Request, body: string): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret) return true // skip in dev if not set

  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const signature = req.headers.get('x-slack-signature') ?? ''

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const sigBase = `v0:${timestamp}:${body}`
  const expected = 'v0=' + createHmac('sha256', secret).update(sigBase).digest('hex')
  return expected === signature
}

async function slackRespond(responseUrl: string, text: string, replace = true) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response_type: 'in_channel',
      replace_original: replace,
      text,
    }),
  })
}

async function openEditModal(triggerId: string, itemId: string, currentDraft: string) {
  await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'circle_edit_modal',
        private_metadata: itemId,
        title: { type: 'plain_text', text: 'Edit Draft Message' },
        submit: { type: 'plain_text', text: 'Send & Mark Sent' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'draft_block',
            element: {
              type: 'plain_text_input',
              action_id: 'draft_input',
              multiline: true,
              initial_value: currentDraft,
            },
            label: { type: 'plain_text', text: 'Message' },
          },
        ],
      },
    }),
  })
}

export async function POST(req: Request) {
  const bodyText = await req.text()

  // Verify Slack signature
  const valid = await verifySlackSignature(req, bodyText)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  const params = new URLSearchParams(bodyText)
  const payloadStr = params.get('payload')
  if (!payloadStr) return new NextResponse('ok')

  const payload = JSON.parse(payloadStr) as {
    type: string
    trigger_id?: string
    response_url?: string
    actions?: Array<{ action_id: string; value: string }>
    view?: {
      callback_id: string
      private_metadata: string
      state: { values: Record<string, Record<string, { value: string }>> }
    }
  }

  // ── Handle interactive button actions ─────────────────────────────────────
  if (payload.type === 'block_actions' && payload.actions?.length) {
    const action = payload.actions[0]
    const itemId = action.value
    const responseUrl = payload.response_url ?? ''

    // Fetch the action item
    const { data: item } = await adminClient
      .from('circle_action_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (!item) {
      await slackRespond(responseUrl, '❌ Action item not found (may already be resolved).')
      return new NextResponse('ok')
    }

    if (action.action_id === 'circle_post_reply') {
      // Post the reply to Circle
      try {
        await postCircleComment(item.circle_post_id, item.draft_message)
        await adminClient
          .from('circle_action_items')
          .update({ status: 'sent', acted_at: new Date().toISOString() })
          .eq('id', itemId)
        await slackRespond(responseUrl, `✅ Reply posted to Circle for *${item.profile_id}*. Marked as sent.`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed'
        await slackRespond(responseUrl, `❌ Failed to post to Circle: ${msg}`)
      }
    }

    else if (action.action_id === 'circle_mark_sent') {
      await adminClient
        .from('circle_action_items')
        .update({ status: 'sent', acted_at: new Date().toISOString() })
        .eq('id', itemId)
      await slackRespond(responseUrl, `✅ Marked as sent. Send the message above manually via Instagram or Circle DM.`)
    }

    else if (action.action_id === 'circle_edit_draft') {
      if (payload.trigger_id) {
        await openEditModal(payload.trigger_id, itemId, item.draft_message)
      }
    }

    else if (action.action_id === 'circle_dismiss') {
      await adminClient
        .from('circle_action_items')
        .update({ status: 'dismissed', acted_at: new Date().toISOString() })
        .eq('id', itemId)
      await slackRespond(responseUrl, `✖ Dismissed.`)
    }
  }

  // ── Handle modal submission (Edit Draft) ─────────────────────────────────
  else if (payload.type === 'view_submission' && payload.view?.callback_id === 'circle_edit_modal') {
    const itemId = payload.view.private_metadata
    const editedDraft = payload.view.state.values?.draft_block?.draft_input?.value ?? ''

    const { data: item } = await adminClient
      .from('circle_action_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (item) {
      // If it's a Circle post reply, post the edited version
      if (item.circle_post_id && editedDraft) {
        try {
          await postCircleComment(item.circle_post_id, editedDraft)
        } catch {
          // Even if post fails, save the edit and mark sent
        }
      }

      await adminClient
        .from('circle_action_items')
        .update({
          draft_message: editedDraft,
          status: 'sent',
          acted_at: new Date().toISOString(),
        })
        .eq('id', itemId)
    }

    // Return null to close the modal
    return NextResponse.json({ response_action: 'clear' })
  }

  return new NextResponse('ok')
}
