import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function sendSlackNotification(data: Record<string, unknown>) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const name = `${data.first_name} ${data.last_name}`.trim()
  const phone = String(data.phone || '')
  const email = String(data.email || '')
  const ig = String(data.instagram_handle || '')
  const niche = String(data.niche || '')
  const platforms = Array.isArray(data.platforms) ? data.platforms.join(', ') : String(data.platforms || '')
  const frequency = String(data.posting_frequency || '')
  const ifNothing = String(data.if_nothing_changes || '')
  const obstacle = String(data.biggest_obstacle || '')
  const strategies = Array.isArray(data.strategies_tried) ? data.strategies_tried.join(', ') : String(data.strategies_tried || '')
  const income = String(data.monthly_income || '')
  const investApproach = String(data.investment_approach || '')
  const investAmount = String(data.investment_amount || '')
  const incomeGoal = String(data.income_goal || '')
  const dob = String(data.date_of_birth || '')

  const message = {
    text: `🔔 New Creator Cult Application — ${name}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔔 New Creator Cult Application', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📞 CALL NOW: ${phone}*\n*Name:* ${name}  |  *DOB:* ${dob}\n*Email:* ${email}\n*Instagram:* @${ig.replace(/^@/, '')}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Their Content Situation*\n• Niche: ${niche}\n• Platforms: ${platforms}\n• Posts last 30 days: ${frequency}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*😬 If Nothing Changes*\n_${ifNothing}_`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚧 Biggest Obstacle*\n${obstacle}\n\n*Already tried:* ${strategies}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💰 Investment & Income*\n• Current income: ${income}\n• Will invest: ${investAmount}\n• Approach: ${investApproach}\n• Income goal: ${incomeGoal}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📞 Ring them now:* \`${phone}\``,
        },
      },
    ],
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const {
    first_name, last_name, date_of_birth, email, phone, instagram_handle,
    platforms, posting_frequency, niche,
    if_nothing_changes, biggest_obstacle, strategies_tried,
    monthly_income, investment_approach, investment_amount, income_goal, business_mindset,
    qualified,
  } = body

  if (!email || !first_name) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const name = `${first_name} ${last_name}`.trim()
  const status = qualified === false ? 'disqualified' : 'pending'

  // Save to DB — non-blocking if it fails
  const { error } = await adminClient.from('applications').insert({
    name,
    email,
    phone,
    instagram_handle,
    status,
    details: {
      first_name, last_name, date_of_birth,
      platforms, posting_frequency, niche,
      if_nothing_changes, biggest_obstacle, strategies_tried,
      monthly_income, investment_approach, investment_amount,
      income_goal, business_mindset,
    },
  })

  if (error) {
    console.error('[applications] insert error:', error.message)
  }

  // Only ping Slack for qualified applicants
  if (qualified !== false) {
    try {
      await sendSlackNotification(body)
    } catch (err) {
      console.error('[applications] slack error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
