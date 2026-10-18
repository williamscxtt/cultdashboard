export type AskWillMode = 'quick' | 'deep' | 'draft'

export type AskWillIntent =
  | 'content'
  | 'stories'
  | 'offer'
  | 'sales'
  | 'positioning'
  | 'community'
  | 'general'

export interface StoredChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  answerRunId?: string
}

export interface AskWillSource {
  fileId?: string
  filename: string
  title: string
  sourcePath?: string
  knowledgeType?: string
  score?: number
}

export interface MemoryCandidate {
  kind: 'goal' | 'offer' | 'audience' | 'constraint' | 'decision' | 'experiment' | 'result' | 'preference'
  key: string
  value: string
  confidence: number
}

export interface AskWillModelOutput {
  answer: string
  conversation_summary: string
  memory_candidates: MemoryCandidate[]
}

export interface ActivityContext {
  reels: Array<Record<string, unknown>>
  competitorReels: Array<Record<string, unknown>>
  audits: Array<Record<string, unknown>>
  stories: Array<Record<string, unknown>>
  sales: Array<Record<string, unknown>>
}
