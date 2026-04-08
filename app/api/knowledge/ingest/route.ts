/**
 * POST (FormData or JSON)
 *
 * Accepts raw text OR a file upload (PDF, TXT, MD, CSV, XLSX) plus an
 * optional description/context hint, then asks Claude to split the content
 * into discrete titled knowledge documents and returns them for preview.
 *
 * FormData fields:
 *   file        — optional: PDF / TXT / MD / CSV / XLSX
 *   text        — optional: pasted raw text
 *   description — optional: brief context hint ("what is this?")
 *
 * Returns: { documents: [{ title, category, source, content }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CATEGORIES = [
  'Hook Writing', 'Offer Building', 'Personal Branding',
  'Mindset', 'Sales', 'Content Strategy', 'Coaching Framework',
  'Case Study', 'Script', 'Other',
]

// Simple CSV → readable text converter
function csvToText(csv: string): string {
  const lines = csv.trim().split('\n')
  return lines.map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')).join(' | ')).join('\n')
}

export async function POST(req: NextRequest) {
  let rawText = ''
  let description = ''
  let isPdf = false
  let pdfBase64 = ''

  const ct = req.headers.get('content-type') ?? ''

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
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
      } else {
        // For XLSX and other formats, treat as binary → just use description
        rawText = rawText || `[Binary file: ${file.name} — ${file.size} bytes. Use the description context to guide categorisation.]`
      }
    }
  } else {
    const body = await req.json().catch(() => ({})) as { rawText?: string; description?: string }
    rawText = body.rawText ?? ''
    description = body.description ?? ''
  }

  if (!rawText.trim() && !isPdf) {
    return NextResponse.json({ error: 'No content provided' }, { status: 400 })
  }

  const contextNote = description ? `\nContext from the user: ${description}\n` : ''

  const systemPrompt = `You are a knowledge organiser for a personal brand coaching business run by Will Scott (Creator Cult).

Your job: analyse the input and split it into one or more discrete knowledge documents. These will be stored in an AI knowledge base used to generate content scripts, coaching advice, and sales messaging.

Rules:
- If the input is one coherent topic/framework/script → ONE document
- If it covers multiple distinct topics → split into MULTIPLE documents
- Each document should be self-contained and useful on its own
- Titles must be specific and descriptive (not generic like "Notes")
- Categories must be one of: ${CATEGORIES.join(', ')}
- Source: who does this insight come from? ("Will Scott", "Alex Hormozi", "Nick Theriot", "Client Result", etc.) — default to "Will Scott" if unclear
- Content: preserve the actual substance. Keep frameworks, formulas, examples, specific numbers intact.

Return ONLY a valid JSON array:
[
  {
    "title": "Specific descriptive title",
    "category": "Category from the approved list",
    "source": "Source name",
    "content": "Full knowledge content, well structured and ready to use"
  }
]`

  try {
    let msg: Anthropic.Message

    if (isPdf) {
      msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            } as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: `${contextNote}Analyse the PDF above and return the JSON array of knowledge documents.`,
            },
          ],
        }],
      })
    } else {
      msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `${contextNote}RAW INPUT:\n${rawText.slice(0, 12000)}\n\nReturn the JSON array of knowledge documents.`,
        }],
      })
    }

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const documents = JSON.parse(match[0]) as Array<{
      title: string; category: string; source: string; content: string
    }>

    return NextResponse.json({ documents })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[knowledge/ingest]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
