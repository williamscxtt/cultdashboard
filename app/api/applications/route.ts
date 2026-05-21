import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const INVEST_LABEL: Record<string, string> = {
  yes_500:   '✅ Yes — £500 or below',
  yes_1000:  '✅ Yes — £500–£1,000',
  yes_2000:  '✅ Yes — £1,000–£2,000',
  yes_2000p: '✅ Yes — £2,000+',
  not_yet:   '❌ Not right now',
}

async function sendSlackNotification(data: Record<string, unknown>) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const firstName    = String(data.first_name || '')
  const lastName     = String(data.last_name  || '')
  const name         = `${firstName} ${lastName}`.trim()
  const phone        = String(data.phone     || '—')
  const ig           = String(data.instagram_handle || '').replace(/^@/, '')
  const income       = String(data.monthly_income   || '—')
  const incomeGoal   = String(data.income_goal      || '—')
  const invest       = INVEST_LABEL[String(data.willing_to_invest || '')] ?? String(data.willing_to_invest || '—')
  const creatorRaw   = String(data.creator_type || '')
  const creatorLabel = ({ creator: 'Pure Content Creator', coach: 'Coaching / Service Business', both: 'Both' }[creatorRaw] ?? creatorRaw) || '—'

  const isHotLead = String(data.willing_to_invest || '').startsWith('yes')

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: isHotLead ? '🔥 New Mentorship Application — CALL NOW' : '📋 New Mentorship Application',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*📞 Phone:* \`${phone}\``,
          `*👤 Name:* ${name}`,
          `*📸 Instagram:* @${ig}`,
        ].join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*🎯 Building:* ${creatorLabel}`,
          `*💰 Current monthly income:* ${income}`,
          `*📈 Income goal:* ${incomeGoal}`,
          `*💳 Willing to invest:* ${invest}`,
        ].join('\n'),
      },
    },
    ...(isHotLead ? [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📲 Ring them now:* \`${phone}\``,
      },
    }] : []),
  ]

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${isHotLead ? '🔥' : '📋'} Mentorship application from ${name} — ${phone}`,
      blocks,
    }),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { first_name, last_name, phone, instagram_handle, creator_type, monthly_income, income_goal, willing_to_invest, track } = body

  if (!first_name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const name = `${first_name} ${last_name || ''}`.trim()

  await adminClient.from('applications').insert({
    name,
    phone,
    instagram_handle,
    status: 'pending',
    details: { first_name, last_name, creator_type, monthly_income, income_goal, willing_to_invest, track },
  }).then(({ error }) => {
    if (error) console.error('[applications] insert error:', error.message)
  })

  try {
    await sendSlackNotification(body)
  } catch (err) {
    console.error('[applications] slack error:', err)
  }

  return NextResponse.json({ ok: true })
}
