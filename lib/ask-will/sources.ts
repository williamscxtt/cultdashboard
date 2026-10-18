import type { AskWillSource } from './types'

interface FileSearchResult {
  file_id?: string
  filename?: string
  score?: number
  attributes?: Record<string, string | number | boolean> | null
}

interface FileSearchOutput {
  type?: string
  results?: FileSearchResult[] | null
}

export function extractFileSearchSources(output: unknown): AskWillSource[] {
  if (!Array.isArray(output)) return []
  const byFile = new Map<string, AskWillSource>()

  for (const item of output as FileSearchOutput[]) {
    if (item?.type !== 'file_search_call' || !Array.isArray(item.results)) continue
    for (const result of item.results) {
      const attributes = result.attributes ?? {}
      const filename = String(result.filename ?? attributes.filename ?? 'Creator Cult knowledge')
      const key = result.file_id ?? filename
      const source: AskWillSource = {
        fileId: result.file_id,
        filename,
        title: String(attributes.title ?? filename.replace(/^[a-f0-9]{16}-/, '').replace(/\.md$/i, '').replace(/[-_]/g, ' ')),
        sourcePath: attributes.source_path ? String(attributes.source_path) : undefined,
        knowledgeType: attributes.knowledge_type ? String(attributes.knowledge_type) : undefined,
        score: typeof result.score === 'number' ? result.score : undefined,
      }
      const existing = byFile.get(key)
      if (!existing || (source.score ?? 0) > (existing.score ?? 0)) byFile.set(key, source)
    }
  }

  return [...byFile.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8)
}

export function parseModelOutput(raw: string) {
  const parsed = JSON.parse(raw) as Record<string, unknown>
  if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) throw new Error('Ask Will returned no answer')
  return {
    answer: parsed.answer.trim(),
    conversation_summary: typeof parsed.conversation_summary === 'string' ? parsed.conversation_summary.trim().slice(0, 1200) : '',
    memory_candidates: Array.isArray(parsed.memory_candidates) ? parsed.memory_candidates.slice(0, 8) : [],
  }
}
