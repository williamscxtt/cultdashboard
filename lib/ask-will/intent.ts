import type { AskWillIntent, AskWillMode } from './types'

const INTENT_TERMS: Array<[AskWillIntent, string[]]> = [
  ['stories', ['story', 'stories', 'poll', 'sticker', 'instagram story', 'cta slide']],
  ['sales', ['sell', 'sales', 'close', 'prospect', 'lead', 'dm', 'objection', 'conversion', 'client enquiry']],
  ['offer', ['offer', 'price', 'pricing', 'package', 'service', 'programme', 'program', 'guarantee']],
  ['positioning', ['niche', 'positioning', 'bio', 'profile', 'ideal client', 'audience', 'personal brand']],
  ['community', ['community', 'skool', 'member', 'onboarding', 'retention', 'group call']],
  ['content', ['content', 'reel', 'video', 'hook', 'retention', 'views', 'caption', 'post', 'viral', 'b-roll', 'script']],
]

export function inferIntent(message: string): AskWillIntent {
  const value = message.toLowerCase()
  let best: { intent: AskWillIntent; score: number } = { intent: 'general', score: 0 }

  for (const [intent, terms] of INTENT_TERMS) {
    const score = terms.reduce((total, term) => total + (value.includes(term) ? 1 : 0), 0)
    if (score > best.score) best = { intent, score }
  }
  return best.intent
}

export function normaliseMode(value: unknown): AskWillMode {
  return value === 'quick' || value === 'deep' || value === 'draft' ? value : 'deep'
}

export function shouldUseDeepModel(message: string, mode: AskWillMode): boolean {
  if (mode === 'deep') return true
  if (mode === 'quick') return false
  const value = message.toLowerCase()
  return message.length > 1200 || ['strategy', 'diagnose', 'why is', 'business model', 'positioning'].some(term => value.includes(term))
}
