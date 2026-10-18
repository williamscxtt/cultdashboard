import { createHash } from 'node:crypto'
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { buildMemberContext } from '@/lib/ask-will/context'
import { inferIntent, normaliseMode, shouldUseDeepModel } from '@/lib/ask-will/intent'
import { ASK_WILL_OUTPUT_SCHEMA, ASK_WILL_PROMPT_VERSION, modeInstruction, WILL_OS } from '@/lib/ask-will/prompt'
import { extractFileSearchSources, parseModelOutput } from '@/lib/ask-will/sources'
import type { ActivityContext, StoredChatMessage } from '@/lib/ask-will/types'

export const maxDuration = 120

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function openAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function compactHistory(value: unknown): StoredChatMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => item && typeof item === 'object' && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .map(item => ({
      role: item.role as 'user' | 'assistant',
      content: String(item.content).slice(0, 6000),
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : undefined,
      answerRunId: typeof item.answerRunId === 'string' ? item.answerRunId : undefined,
    }))
    .slice(-60)
}

function safeSessionId(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value) ? value : crypto.randomUUID()
}

function safetyIdentifier(profileId: string): string {
  return createHash('sha256').update(`ask-will:${profileId}`).digest('hex').slice(0, 48)
}

function dedupeKey(kind: string, key: string, value: string): string {
  return createHash('sha256').update(`${kind}\n${key}\n${value}`).digest('hex')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { message?: unknown; sessionId?: unknown; mode?: unknown }
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (message.length > 12000) return NextResponse.json({ error: 'Message is too long' }, { status: 400 })

  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)
  const sessionId = safeSessionId(body.sessionId)
  const mode = normaliseMode(body.mode)
  const intent = inferIntent(message)

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count: recentCount, error: rateError } = await adminClient
    .from('ask_will_answer_runs')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .gte('created_at', tenMinutesAgo)
  if (!rateError && (recentCount ?? 0) >= 15) {
    return NextResponse.json({ error: 'You have sent a lot of questions very quickly. Give it a few minutes and try again.' }, { status: 429 })
  }

  const wantsContent = intent === 'content' || intent === 'positioning'
  const wantsStories = intent === 'stories'
  const wantsSales = intent === 'sales' || intent === 'offer'

  const [
    { data: profile },
    { data: existingSession },
    { data: memories },
    { data: reels },
    { data: competitorReels },
    { data: audits },
    { data: stories },
    { data: sales },
    { data: activeVersion },
  ] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient.from('ai_conversations').select('id,messages,summary').eq('session_id', sessionId).eq('profile_id', profileId).maybeSingle(),
    adminClient.from('ask_will_memories').select('kind,key,value,status,confidence').eq('profile_id', profileId).eq('status', 'active').order('updated_at', { ascending: false }).limit(20),
    wantsContent
      ? adminClient.from('client_reels').select('format_type,views,hook,content_pillar').eq('profile_id', profileId).order('views', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
    wantsContent
      ? adminClient.from('competitor_reels').select('account,views,hook,format_type').order('views', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    wantsContent
      ? adminClient.from('profile_audits').select('overall_score,verdict,created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] }),
    wantsStories
      ? adminClient.from('story_sequences').select('sequence_type,day_of_week,created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    wantsSales
      ? adminClient.from('dm_sales').select('source,deal_value,stage,created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
    adminClient.from('ask_will_knowledge_versions').select('version,vector_store_id').eq('status', 'active').order('activated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!profile) return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
  const vectorStoreId = activeVersion?.vector_store_id || process.env.ASK_WILL_VECTOR_STORE_ID
  if (!vectorStoreId) {
    return NextResponse.json({ error: 'Ask Will is being upgraded and its knowledge store is not configured yet.' }, { status: 503 })
  }

  const previousMessages = compactHistory(existingSession?.messages)
  const activity: ActivityContext = {
    reels: (reels ?? []) as Array<Record<string, unknown>>,
    competitorReels: (competitorReels ?? []) as Array<Record<string, unknown>>,
    audits: (audits ?? []) as Array<Record<string, unknown>>,
    stories: (stories ?? []) as Array<Record<string, unknown>>,
    sales: (sales ?? []) as Array<Record<string, unknown>>,
  }
  const memberContext = buildMemberContext(
    profile as Record<string, unknown>,
    activity,
    intent,
    (memories ?? []) as Array<Record<string, unknown>>,
    typeof existingSession?.summary === 'string' ? existingSession.summary : '',
  )

  const useDeepModel = shouldUseDeepModel(message, mode)
  const model = useDeepModel
    ? process.env.ASK_WILL_DEEP_MODEL || 'gpt-6-astra'
    : process.env.ASK_WILL_DEFAULT_MODEL || 'gpt-6.1-sol'
  const knowledgeVersion = activeVersion?.version || process.env.ASK_WILL_KNOWLEDGE_VERSION || 'unversioned'
  const recentInput = previousMessages.slice(-8).map(item => ({ role: item.role, content: item.content }))

  try {
    const response = await openAIClient().responses.create({
      model,
      instructions: WILL_OS,
      input: [
        {
          role: 'developer',
          content: `${modeInstruction(mode)}\n\n${memberContext}\n\nKNOWLEDGE VERSION: ${knowledgeVersion}\nCURRENT DATE: ${new Date().toISOString().slice(0, 10)}`,
        },
        ...recentInput,
        { role: 'user', content: message },
      ],
      tools: [{
        type: 'file_search',
        vector_store_ids: [vectorStoreId],
        max_num_results: mode === 'quick' ? 5 : 8,
        filters: {
          type: 'and',
          filters: [
            { type: 'eq', key: 'visibility', value: 'member_safe' },
            { type: 'eq', key: 'status', value: 'current' },
          ],
        },
        ranking_options: { ranker: 'auto', score_threshold: 0.12 },
      }],
      tool_choice: 'required',
      include: ['file_search_call.results'],
      reasoning: { effort: mode === 'quick' ? 'low' : useDeepModel ? 'high' : 'medium' },
      text: {
        verbosity: mode === 'quick' ? 'low' : 'medium',
        format: {
          type: 'json_schema',
          name: 'ask_will_answer',
          description: 'Member answer plus compact conversation state and reviewable memory candidates.',
          strict: true,
          schema: ASK_WILL_OUTPUT_SCHEMA,
        },
      },
      max_output_tokens: mode === 'quick' ? 1800 : mode === 'draft' ? 3200 : 5000,
      parallel_tool_calls: false,
      prompt_cache_key: ASK_WILL_PROMPT_VERSION,
      store: false,
      safety_identifier: safetyIdentifier(profileId),
      metadata: {
        product: 'ask-will',
        prompt_version: ASK_WILL_PROMPT_VERSION,
        knowledge_version: knowledgeVersion,
        mode,
        intent,
      },
    })

    const parsed = parseModelOutput(response.output_text)
    const sources = extractFileSearchSources(response.output)
    const now = new Date().toISOString()

    const { data: answerRun } = await adminClient
      .from('ask_will_answer_runs')
      .insert({
        profile_id: profileId,
        session_id: sessionId,
        openai_response_id: response.id,
        model,
        mode,
        intent,
        prompt_version: ASK_WILL_PROMPT_VERSION,
        knowledge_version: knowledgeVersion,
        question: message,
        answer: parsed.answer,
        sources,
        input_tokens: response.usage?.input_tokens ?? null,
        output_tokens: response.usage?.output_tokens ?? null,
        status: response.status,
      })
      .select('id')
      .maybeSingle()

    const updatedMessages: StoredChatMessage[] = [
      ...previousMessages,
      { role: 'user' as const, content: message, timestamp: now },
      { role: 'assistant' as const, content: parsed.answer, timestamp: now, answerRunId: answerRun?.id },
    ].slice(-60)

    if (existingSession?.id) {
      await adminClient
        .from('ai_conversations')
        .update({ messages: updatedMessages, summary: parsed.conversation_summary, updated_at: now, insights_extracted: false })
        .eq('id', existingSession.id)
        .eq('profile_id', profileId)
    } else {
      await adminClient.from('ai_conversations').insert({
        profile_id: profileId,
        session_id: sessionId,
        messages: updatedMessages,
        summary: parsed.conversation_summary,
        insights_extracted: false,
        created_at: now,
        updated_at: now,
      })
    }

    const pendingMemories = parsed.memory_candidates
      .filter(candidate => candidate && typeof candidate.kind === 'string' && typeof candidate.key === 'string' && typeof candidate.value === 'string' && candidate.confidence >= 0.8)
      .slice(0, 6)
      .map(candidate => ({
        profile_id: profileId,
        kind: candidate.kind,
        key: candidate.key.slice(0, 120),
        value: candidate.value.slice(0, 1000),
        confidence: candidate.confidence,
        status: 'pending',
        source_session_id: sessionId,
        source_message: message.slice(0, 3000),
        dedupe_key: dedupeKey(candidate.kind, candidate.key, candidate.value),
        updated_at: now,
      }))
    if (pendingMemories.length) {
      await adminClient.from('ask_will_memories').upsert(pendingMemories, { onConflict: 'profile_id,dedupe_key', ignoreDuplicates: true })
    }

    return NextResponse.json({
      message: parsed.answer,
      sessionId,
      answerRunId: answerRun?.id ?? null,
      sources,
      knowledgeVersion,
      mode,
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ask-will]', { profileId, sessionId, intent, mode, detail })
    return NextResponse.json({ error: 'Ask Will could not complete that answer. Please try again.' }, { status: 500 })
  }
}
