import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/** Returns the authed user only if they are an admin, else null */
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// Split text into overlapping chunks (~1500 chars, ~150 char overlap)
function chunkText(text: string, size = 1500, overlap = 150): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > size && current.length > 0) {
      chunks.push(current.trim())
      const words = current.split(' ')
      current = words.slice(-Math.floor(overlap / 5)).join(' ') + '\n\n' + para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim())
  return chunks.filter(c => c.length > 20)
}

export async function GET() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminClient
    .from('knowledge_documents')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data || [] })
}

export async function POST(request: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { title, content, source, category } = body
  if (!title || !content) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
  }

  // Save full document
  const { data, error } = await adminClient
    .from('knowledge_documents')
    .insert({ title, content, source, category })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Chunk and save to knowledge_chunks for AI retrieval
  const chunks = chunkText(content)
  if (chunks.length > 0) {
    const rows = chunks.map(chunk => ({
      content: chunk,
      source_type: source || 'document',
      source_id: data.id,
      metadata: { title, source, category, document_id: data.id },
    }))
    await adminClient.from('knowledge_chunks').insert(rows)
  }

  return NextResponse.json({ document: data, chunks_saved: chunks.length })
}

export async function DELETE(request: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Delete chunks first, then document
  await adminClient.from('knowledge_chunks').delete().eq('source_id', id)

  const { error } = await adminClient
    .from('knowledge_documents')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
