/**
 * POST (FormData or JSON)
 *
 * Accepts raw text OR a file upload (PDF, TXT, MD, CSV) plus an optional
 * description/context hint, then uses Claude to:
 *   1. Clean and structure the content (remove filler words, repetition,
 *      organise into sections with headings)
 *   2. Preserve EVERY piece of knowledge — no summarising, no compressing
 *   3. Split into multiple documents if the content covers distinct topics
 *
 * Long content (YouTube transcripts etc.) is chunked and processed in
 * parallel so nothing gets cut off.
 *
 * Returns: { documents: [{ title, category, source, content }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

const CATEGORIES = [
  'Hook Writing', 'Offer Building', 'Personal Branding',
  'Mindset', 'Sales', 'Content Strategy', 'Coaching Framework',
  'Case Study', 'Script', 'Other',
]

function csvToText(csv: string): string {
  const lines = csv.trim().split('\n')
  return lines.map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')).join(' | ')).join('\n')
}

/** Split rawText into overlapping chunks of ~chunkSize chars */
function chunkText(text: string, chunkSize = 14000, overlap = 400): string[] {
  if (text.length <= chunkSize) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = start + chunkSize
    if (end < text.length) {
      // Break at paragraph boundary if possible
      const paraBreak = text.lastIndexOf('\n\n', end)
      if (paraBreak > start + chunkSize * 0.6) end = paraBreak
    }
    chunks.push(text.slice(start, Math.min(end, text.length)))
    if (end >= text.length) break
    start = end - overlap
  }
  return chunks
}

/** Ask Claude to clean + structure one chunk, preserving all knowledge */
async function cleanChunk(
  chunk: string,
  description: string,
  partLabel: string,
): Promise<string> {
  const contextNote = description ? `Context: ${description}\n\n` : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    messages: [{
      role: 'user',
      content: `${contextNote}Clean and structure this content ${partLabel} for a knowledge base. This may be a YouTube transcript, script, framework, or notes.

RULES — READ CAREFULLY:
1. PRESERVE ALL KNOWLEDGE — do not summarise, condense, or drop any idea, example, framework, number, story, or tip. If something was said, it belongs in the output.
2. CLEAN IT UP — remove verbal fillers (um, uh, like, you know, right, I mean), fix awkward spoken phrasing, remove repetition (keep the best version of a repeated point), remove timestamps.
3. ORGANISE — use clear section headings (##) and bullet points where appropriate. Group related ideas together.
4. LENGTH — your output should be roughly 60–80% of the input length. Shorter only means cleaner, never means fewer ideas.
5. TONE — convert from conversational spoken language to clean written prose or structured bullets.

Return the cleaned, structured content only — no preamble like "Here is the cleaned content:".

CONTENT:
${chunk}`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

/** Ask Claude to extract title/category/source metadata from cleaned content */
async function extractMetadata(
  content: string,
  description: string,
): Promise<Array<{ title: string; category: string; source: string; split_hint?: string }>> {
  const contextNote = description ? `Context from the user: ${description}\n\n` : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `${contextNote}Given this knowledge base content, return ONLY metadata JSON — no content.

Rules:
- ONE document if the content is a single topic
- MULTIPLE documents (max 4) if content clearly covers distinct, separable topics
- Titles must be specific (not "Notes" or "Content")
- Categories: ${CATEGORIES.join(', ')}
- Source: always "Will Scott" — this is a knowledge base for Will's own coaching methodology.

Return ONLY valid JSON array:
[{ "title": "...", "category": "...", "source": "..." }]

CONTENT PREVIEW (first 3000 chars):
${content.slice(0, 3000)}`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\[[\s\S]*?\]/)
  if (!match) return [{ title: description || 'Knowledge Document', category: 'Other', source: 'Will Scott' }]

  try {
    return JSON.parse(match[0])
  } catch {
    return [{ title: description || 'Knowledge Document', category: 'Other', source: 'Will Scott' }]
  }
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let rawText = ''
  let description = ''
  let isPdf = false
  let pdfBase64 = ''

  // Parse request
  let parsedAsForm = false
  try {
    const form = await req.formData()
    parsedAsForm = true
    description = String(form.get('description') ?? '')
    rawText = String(form.get('text') ?? '')
    const file = form.get('file') as File | null

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const bytes = await file.arrayBuffer()

      if (ext === 'pdf') {
        isPdf = true
        pdfBase64 = Buffer.from(bytes).toString('base64')
      } else if (['txt', 'md'].includes(ext)) {
        rawText = new TextDecoder().decode(bytes)
      } else if (ext === 'csv') {
        rawText = csvToText(new TextDecoder().decode(bytes))
      }
    }
  } catch {
    // Not FormData
  }

  if (!parsedAsForm) {
    const body = await req.json().catch(() => ({})) as { rawText?: string; description?: string }
    rawText = body.rawText ?? ''
    description = body.description ?? ''
  }

  if (!rawText.trim() && !isPdf) {
    return NextResponse.json({ error: 'No content provided' }, { status: 400 })
  }

  // ── PDF: Claude extracts + cleans (no rawText available) ─────────────────────
  if (isPdf) {
    try {
      const contextNote = description ? `Context: ${description}\n\n` : ''
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            } as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: `${contextNote}Extract, clean, and structure ALL content from this PDF for a knowledge base. Preserve every idea, framework, example, and number. Organise with clear headings. Then return as JSON:
[{ "title": "Specific title", "category": "${CATEGORIES.join(' | ')}", "source": "Source name", "content": "Full cleaned structured content" }]`,
            },
          ],
        }],
      })

      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON in response')
      const documents = JSON.parse(match[0])
      return NextResponse.json({ documents })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF processing failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── Text: chunk → clean in parallel → extract metadata ──────────────────────
  try {
    const chunks = chunkText(rawText.slice(0, 120000)) // cap at ~120k chars
    const totalChunks = chunks.length

    // Clean all chunks in parallel
    const cleanedParts = await Promise.all(
      chunks.map((chunk, i) =>
        cleanChunk(
          chunk,
          description,
          totalChunks > 1 ? `(part ${i + 1} of ${totalChunks})` : '',
        )
      )
    )

    const cleanedContent = cleanedParts.join('\n\n')

    // Extract metadata (title, category, source) from the cleaned result
    const metaDocs = await extractMetadata(cleanedContent, description)

    // For now, return as single document (the cleaned full content)
    // If Claude suggests multiple docs, split content roughly equally
    let documents: Array<{ title: string; category: string; source: string; content: string }>

    if (metaDocs.length <= 1) {
      documents = [{
        title: metaDocs[0]?.title || description || 'Knowledge Document',
        category: metaDocs[0]?.category || 'Other',
        source: metaDocs[0]?.source || 'Will Scott',
        content: cleanedContent,
      }]
    } else {
      // Split cleaned content roughly equally across suggested documents
      const partSize = Math.ceil(cleanedContent.length / metaDocs.length)
      documents = metaDocs.map((meta, i) => {
        let start = i * partSize
        // Try to align to paragraph break
        if (i > 0) {
          const nearBreak = cleanedContent.indexOf('\n\n', start - 200)
          if (nearBreak > start - 400 && nearBreak < start + 400) start = nearBreak + 2
        }
        const end = i === metaDocs.length - 1 ? cleanedContent.length : (i + 1) * partSize
        return {
          title: meta.title,
          category: meta.category,
          source: meta.source,
          content: cleanedContent.slice(start, end).trim(),
        }
      })
    }

    return NextResponse.json({ documents })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Processing failed'
    console.error('[knowledge/ingest]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
