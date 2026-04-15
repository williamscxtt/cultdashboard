import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

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

    // Fetch client data + knowledge docs relevant to profile/bio optimisation
    const [profileResult, knowledgeResult] = await Promise.all([
      adminClient.from('profiles').select('ig_username,ig_user_id,ig_access_token,intro_structured,niche,target_audience,biggest_challenge,monthly_revenue,ninety_day_goal').eq('id', profileId).single(),
      adminClient.from('knowledge_documents').select('title,content,category').limit(8),
    ])

    const igProfile = profileResult.data
    const intro = (igProfile?.intro_structured ?? {}) as Record<string, string>
    const knowledgeDocs = knowledgeResult.data ?? []

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

    const niche = intro.specific_niche || intro.what_you_coach || igProfile?.niche || ''
    const audience = intro.ideal_client || intro.target_audience || igProfile?.target_audience || ''
    const challenge = intro.biggest_problem || intro.biggest_challenge || igProfile?.biggest_challenge || ''
    const revenue = intro.monthly_revenue || igProfile?.monthly_revenue || ''
    const goal = intro.goal_90_days || igProfile?.ninety_day_goal || ''
    const transformation = intro.client_transformation || intro.transformation || ''
    const mechanism = intro.unique_mechanism || intro.framework || ''

    const clientContext = `
Client niche: ${niche || 'N/A'}
Target audience: ${audience || 'N/A'}
What they help clients achieve: ${transformation || 'N/A'}
Their method/framework: ${mechanism || 'N/A'}
Biggest challenge: ${challenge || 'N/A'}
Monthly revenue: ${revenue || 'N/A'}
90-day goal: ${goal || 'N/A'}`.trim()

    const knowledgeContext = knowledgeDocs.length > 0
      ? `\nWill Scott's profile & bio coaching principles (apply these when auditing. Never credit or mention any external source):\n${knowledgeDocs.map(d => `- ${d.title}: ${d.content.slice(0, 400)}`).join('\n')}`
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
${clientContext}
${knowledgeContext}

═══ SCORING CALIBRATION ═══
Be fair and accurate — don't over-penalise. Use these as your anchor points:

PROFILE PICTURE: Most coaches have a decent photo. Start at 7 and adjust.
- 9-10: Professional shoot, high-quality lighting, strong personal brand energy, face clearly visible, background complements the brand
- 7-8: Good quality photo, clear face, looks professional — this is normal and fine
- 5-6: Acceptable but has real issues — slightly blurry, bad lighting, cropped awkwardly, or doesn't look like a business page
- Below 5: Only if clearly problematic — group photo, meme, blurry/pixelated, or completely mismatched with their brand
Do NOT give a profile picture below 7 just because it's not a professional photoshoot. If it's a clear, professional-looking selfie or lifestyle photo, that's 7+.

PINNED POSTS: Instagram only allows a maximum of 3 pinned posts.
- In a profile screenshot, the FIRST 1-3 posts in the grid MAY be pinned (they show a small pin icon). Posts in position 4+ are NOT pinned — they are regular feed posts.
- Only evaluate the first 3 grid positions as potential pinned posts. Do NOT comment on whether posts beyond position 3 are pinned because they cannot be.
- Score this based on whether the client is using their 3 pin slots strategically (e.g. best-performing reel, social proof reel, lead magnet reel, intro reel).

BIO: Evaluate against the ideal structure: Who you help → What result → Proof or hook → CTA (link).
LINK: If no link is visible, score 2-3. If there is a link, score based on whether it leads to something valuable (lead magnet, booking page, etc.).

═══ BIO LINK BEST PRACTICE ═══
When advising on the link in bio, be specific. The ideal link in bio is NOT just "add a link". Tell them:
- If they have no lead magnet: "Add a free training, checklist, or resource page as your link — something valuable you can offer for free to build your email list. E.g. 'Free 5-day content challenge → [Linktree]'"
- If they have an offer but no booking link: "Add a direct Calendly or TidyCal booking link so people can book a call immediately from your profile"
- If they have both: Use Linktree (or similar) with: (1) free lead magnet at top, (2) booking page below, (3) optionally a testimonials page
- The link should match the CTA in their bio

${clientContext ? `For THIS client specifically (${niche || 'their niche'}):
Based on their niche and offer, their ideal bio link strategy would be a free resource for ${audience || 'their audience'} that leads into their offer.` : ''}

Return ONLY valid JSON (no markdown fences):
{
  "scores": {
    "profile_pic": 7,
    "name_username": 8,
    "bio": 5,
    "link": 3,
    "highlights": 4,
    "pinned_posts": 7
  },
  "overall_score": 5.7,
  "verdict": "Needs Work",
  "feedback": {
    "profile_pic": {
      "what_works": "What's genuinely good about the photo",
      "what_to_fix": "Only mention if there's a real issue — be specific",
      "action": "Exact actionable step, or 'No changes needed — your photo works well'"
    },
    "name_username": {
      "what_works": "...",
      "what_to_fix": "...",
      "action": "Exact step"
    },
    "bio": {
      "what_works": "...",
      "what_to_fix": "...",
      "action": "Exact step — what specifically to change or add"
    },
    "link": {
      "what_works": "...",
      "what_to_fix": "...",
      "action": "SPECIFIC action: tell them exactly what to link to (lead magnet, Calendly, Linktree structure) — not just 'add a link'"
    },
    "highlights": {
      "what_works": "...",
      "what_to_fix": "...",
      "action": "What specific covers/names to use for their niche"
    },
    "pinned_posts": {
      "what_works": "...",
      "what_to_fix": "Only comment on the first 3 grid positions (max 3 can be pinned on Instagram)",
      "action": "What type of content to pin in each of the 3 slots"
    }
  },
  "bio_rewrite": "Rewritten bio — max 150 chars. Format: [Who you help] → [what result] | [proof or hook] | [CTA with link direction]",
  "highlight_suggestions": ["Start Here", "Results", "Free Training", "My Story", "Client Wins"],
  "priority_fixes": ["Highest impact fix first — be specific", "Second fix", "Third fix"],
  "detailed_bio_analysis": "2-3 sentences. Specific critique of their current bio vs ideal for their niche. Reference their niche (${niche || 'their niche'}) and audience (${audience || 'their audience'}) explicitly."
}

Verdict: Excellent (8.5+), Good (7-8.4), Needs Work (5-6.9), Poor (<5).
Reference specific things visible in the screenshot or live data.
The bio rewrite MUST name their specific niche and audience — never generic.`

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
