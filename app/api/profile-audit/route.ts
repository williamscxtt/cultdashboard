import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const profileId = formData.get('profileId') as string
    const igUsername = formData.get('igUsername') as string | null
    const screenshot = formData.get('screenshot') as File | null

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    // Fetch client's onboarding data for personalised scoring
    const [onboardingResult, knowledgeResult, igProfileResult] = await Promise.all([
      adminClient.from('onboarding').select('*').eq('profile_id', profileId).single(),
      adminClient.from('knowledge_documents').select('title,content').eq('category', 'Personal Branding').limit(5),
      // Fetch IG profile data if they have a connected account
      adminClient.from('profiles').select('ig_username,ig_user_id,ig_access_token').eq('id', profileId).single(),
    ])

    const onboarding = onboardingResult.data
    const knowledgeDocs = knowledgeResult.data ?? []
    const igProfile = igProfileResult.data

    // Try to fetch live IG data if they have a connected token
    let igLiveData: Record<string, unknown> | null = null
    const tokenUsername = igUsername || igProfile?.ig_username
    if (igProfile?.ig_access_token && igProfile?.ig_user_id) {
      try {
        const igRes = await fetch(
          `https://graph.instagram.com/${igProfile.ig_user_id}?fields=biography,followers_count,follows_count,media_count,name,username,website&access_token=${igProfile.ig_access_token}`
        )
        if (igRes.ok) {
          igLiveData = await igRes.json()
        }
      } catch {}
    }

    // Build context string
    const clientContext = onboarding ? `
Client niche: ${onboarding.niche}
Target audience: ${onboarding.target_audience}
Main goal: ${onboarding.main_goal}
Their offer: ${onboarding.biggest_challenge}
Brand voice: ${onboarding.brand_voice}
Monthly revenue: ${onboarding.monthly_revenue}
`.trim() : ''

    const knowledgeContext = knowledgeDocs.length > 0
      ? `\nKnowledge base (what makes a great Instagram profile for coaches):\n${knowledgeDocs.map(d => `- ${d.title}: ${d.content.slice(0, 300)}`).join('\n')}`
      : ''

    const liveDataContext = igLiveData ? `\nLive Instagram data:
- Username: @${igLiveData.username}
- Name: ${igLiveData.name}
- Bio: "${igLiveData.biography}"
- Followers: ${igLiveData.followers_count?.toLocaleString()}
- Following: ${igLiveData.follows_count}
- Posts: ${igLiveData.media_count}
- Website: ${igLiveData.website || 'None'}` : tokenUsername ? `\nInstagram username: @${tokenUsername}` : ''

    const systemPrompt = `You are Will Scott — personal brand coach and founder of CULT. You are auditing your client's Instagram profile.
You are looking at their actual profile screenshot and/or their live data.
${clientContext}
${knowledgeContext}

Score their profile on 6 elements (0-10 each) and return ONLY valid JSON:
{
  "scores": {
    "profile_pic": 7,
    "name_username": 8,
    "bio": 5,
    "link": 6,
    "highlights": 4,
    "pinned_posts": 7
  },
  "overall_score": 6.2,
  "verdict": "Needs Work",
  "feedback": {
    "profile_pic": { "what_works": "...", "what_to_fix": "...", "action": "Exact step to take" },
    "name_username": { "what_works": "...", "what_to_fix": "...", "action": "Exact step to take" },
    "bio": { "what_works": "...", "what_to_fix": "...", "action": "Exact step to take" },
    "link": { "what_works": "...", "what_to_fix": "...", "action": "Exact step to take" },
    "highlights": { "what_works": "...", "what_to_fix": "...", "action": "Exact step to take" },
    "pinned_posts": { "what_works": "...", "what_to_fix": "...", "action": "Exact step to take" }
  },
  "bio_rewrite": "Rewritten bio — max 150 chars, punchy, who you help + what result + proof/hook",
  "highlight_suggestions": ["Start Here", "Results", "Free Training", "My Story", "Client Wins"],
  "priority_fixes": ["Highest impact fix first", "Second fix", "Third fix"],
  "detailed_bio_analysis": "2-3 sentence deep analysis of current bio vs ideal bio for their niche and offer"
}

Verdict scale: Excellent (8.5+), Good (7-8.4), Needs Work (5-6.9), Poor (<5).
Reference specific things you can see in the screenshot or their live data.
The bio rewrite must be tailored to their specific niche, offer, and target audience from their onboarding data.`

    // Build message content — include screenshot if provided
    type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }
    type TextBlock = { type: 'text'; text: string }
    const messageContent: (ImageBlock | TextBlock)[] = []

    if (screenshot) {
      const arrayBuffer = await screenshot.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const rawType = screenshot.type || 'image/jpeg'
      const mediaType = (['image/jpeg','image/png','image/gif','image/webp'].includes(rawType)
        ? rawType
        : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      })
    }

    messageContent.push({
      type: 'text',
      text: `Audit this Instagram profile.${liveDataContext}\n\n${screenshot ? 'I have attached a screenshot of the profile above.' : 'No screenshot provided — base your analysis on the live data and username only.'}`,
    })

    const messages: MessageParam[] = [{ role: 'user', content: messageContent as MessageParam['content'] }]
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let analysis: Record<string, unknown>
    try {
      analysis = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText.slice(0, 500) }, { status: 500 })
    }

    // Save to DB
    const { data: saved, error: dbError } = await adminClient
      .from('profile_audits')
      .insert({
        profile_id: profileId,
        ig_username: tokenUsername ?? null,
        analysis,
        overall_score: analysis.overall_score ?? null,
        verdict: analysis.verdict ?? null,
        scores: analysis.scores ?? null,
        bio_rewrite: analysis.bio_rewrite ?? null,
        highlight_suggestions: analysis.highlight_suggestions ?? null,
      })
      .select('id, created_at')
      .single()

    if (dbError) {
      console.error('DB save error:', dbError)
      return NextResponse.json({ analysis, id: null })
    }

    return NextResponse.json({ analysis, id: saved.id, created_at: saved.created_at, igLiveData })
  } catch (err) {
    console.error('Profile audit error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

    const { data, error } = await adminClient
      .from('profile_audits')
      .select('id, ig_username, analysis, overall_score, verdict, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ audits: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
