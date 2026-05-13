import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function sendSlackNotification(data: Record<string, unknown>, isQualified: boolean) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const name        = `${data.first_name} ${data.last_name}`.trim()
  const phone       = String(data.phone || '')
  const email       = String(data.email || '')
  const ig          = String(data.instagram_handle || '').replace(/^@/, '')
  const niche       = String(data.niche || '')
  const platforms   = Array.isArray(data.platforms) ? data.platforms.join(', ') : String(data.platforms || '')
  const frequency   = String(data.posting_frequency || '')
  const obstacle    = String(data.biggest_obstacle || '')
  const strategies  = Array.isArray(data.strategies_tried) ? data.strategies_tried.join(', ') : String(data.strategies_tried || '')
  const income      = String(data.monthly_income || '')
  const investAmount = String(data.investment_amount || '')
  const incomeGoal  = String(data.income_goal || '')
  const creatorType = String(data.creator_type || '')
  const wants       = String(data.wants || '')
  const mindset     = String(data.business_mindset || '')

  const creatorTypeLabel = {
    creator: 'Pure Content Creator',
    coach: 'Coaching / Service Business',
    both: 'Both (creator + coaching)',
  }[creatorType] ?? creatorType

  const wantsLabel = wants === 'coaching'
    ? 'Dashboard + Coaching from Will 🎯'
    : wants === 'dashboard'
      ? 'Dashboard access only'
      : wants

  const header = isQualified
    ? '🔔 New Creator Cult Application — Qualified'
    : '🟡 New Application — Auto-Disqualified'

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: header, emoji: true },
    },

    // Contact
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isQualified
          ? `*📞 CALL NOW: ${phone}*\n*Name:* ${name}\n*Email:* ${email}\n*Instagram:* @${ig}`
          : `*Name:* ${name}\n*Email:* ${email}  |  *Instagram:* @${ig}\n*Phone:* ${phone || '—'}\n_Said they can't invest right now — not the right fit_`,
      },
    },

    { type: 'divider' },

    // Who they are
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*👤 Who They Are*\n• Creator type: ${creatorTypeLabel}\n• They want: ${wantsLabel}\n• Business mindset: ${mindset || '—'}`,
      },
    },

    // Content situation
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📊 Content Situation*\n• Niche: ${niche || '—'}\n• Platforms: ${platforms || '—'}\n• Posts last 30 days: ${frequency || '—'}`,
      },
    },

    // Obstacle + strategies
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🚧 Their Biggest Problem*\n${obstacle || '—'}\n\n*Already tried:* ${strategies || '—'}`,
      },
    },

    { type: 'divider' },

    // Money
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*💰 Money*\n• Current income (all sources): ${income || '—'}\n• Can invest: ${investAmount || '—'}\n• Income goal: ${incomeGoal || '—'}`,
      },
    },

    // CTA for qualified
    ...(isQualified ? [{
      type: 'section',
      text: { type: 'mrkdwn', text: `*📞 Ring them now:* \`${phone}\`` },
    }] : []),
  ]

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${isQualified ? '🔔' : '🟡'} Creator Cult Application — ${name}`,
      blocks,
    }),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const {
    first_name, last_name, email, phone, instagram_handle,
    creator_type, wants,
    platforms, posting_frequency, niche,
    biggest_obstacle, strategies_tried,
    monthly_income, investment_amount, income_goal, business_mindset,
    outcome,
  } = body

  if (!email || !first_name) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const name = `${first_name} ${last_name}`.trim()
  const statusMap: Record<string, string> = { qualified: 'pending', payment: 'payment_tier', disqualified: 'disqualified' }
  const status = statusMap[outcome] ?? 'pending'

  // Save to DB — non-blocking if it fails
  const { error } = await adminClient.from('applications').insert({
    name,
    email,
    phone,
    instagram_handle,
    status,
    details: {
      first_name, last_name,
      creator_type, wants,
      platforms, posting_frequency, niche,
      biggest_obstacle, strategies_tried,
      monthly_income, investment_amount,
      income_goal, business_mindset,
    },
  })

  if (error) {
    console.error('[applications] insert error:', error.message)
  }

  // Ping Slack for all real submissions — qualified ones get the urgent message,
  // disqualified ones get a low-priority heads-up. Skip if no real data (fake/test entries).
  // Payment tier self-serves — no Slack needed. Qualified and disqualified both ping.
  const hasRealData = Boolean(first_name && (phone || niche || biggest_obstacle))
  if (hasRealData && outcome !== 'payment') {
    try {
      await sendSlackNotification(body, outcome === 'qualified')
    } catch (err) {
      console.error('[applications] slack error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
