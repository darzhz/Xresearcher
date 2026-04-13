// lib/llm/summarize.ts

import { inferStream } from './engine'
import { PageIndexSection } from '../../types'

const DEBUG = true
function log(msg: string, data?: any) {
  if (DEBUG) console.log(`[Summarizer] ${msg}`, data || '')
}

// ─── Extractive layer ────────────────────────────────────────────

interface ScoredSentence {
  text: string
  score: number
  originalIndex: number  // position in source — used to restore order
}

function scoreSentence(s: string, index: number): ScoredSentence {
  let score = 0

  // Quantitative findings — highest signal
  score += (s.match(/\d+\.?\d*\s*(%|x\b|×)/g) ?? []).length * 4
  score += (s.match(/\b\d+\.?\d+\b/g) ?? []).length * 1

  // Result/contribution language
  if (/\b(achiev|outperform|surpass|improve|reduc|increas|state.of.the.art|SOTA)\b/i.test(s))
    score += 5
  if (/\b(propose|present|introduc|novel|framework|approach|architecture)\b/i.test(s))
    score += 3
  if (/\b(show|demonstrat|find|observ|conclud|reveal)\b/i.test(s))
    score += 3

  // Causal / logical connectors → reasoning, not filler
  if (/\b(because|therefore|thus|hence|show that|result in|lead to)\b/i.test(s))
    score += 2

  // Contrastive — often where the key insight lives
  if (/\b(however|whereas|unlike|in contrast|despite|although)\b/i.test(s))
    score += 2

  // Penalise boilerplate
  if (/\b(in this paper|we note that|it is worth|as mentioned|for example|e\.g\.|i\.e\.)\b/i.test(s))
    score -= 3
  if (/\b(related work|prior work|previous work)\b/i.test(s))
    score -= 2

  // Penalise very short sentences — usually transitional
  if (s.length < 40) score -= 2

  if (/(http|https|www|.com|.org)/.test(s)) score -= 10;
  
  if (s.includes('\\')) score -= 5; // Penalize LaTeX/Control codes

  return { text: s.trim(), score, originalIndex: index }
}

function extractDenseText(
  text: string,
  targetTokens = 3000   // ~12K chars — enough for 4 rolling windows
): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? []
  const scored = sentences.map((s, i) => scoreSentence(s, i))

  // Sort by signal score descending, pick top sentences up to budget
  scored.sort((a, b) => b.score - a.score)

  // Minimum 1000 chars budget or 30% of text
  const budget = Math.max(1000, Math.min(text.length * 0.4, targetTokens * 4));
  let used = 0
  const selected: ScoredSentence[] = []

  for (const s of scored) {
    if (used + s.text.length > budget) break
    selected.push(s)
    used += s.text.length
  }

  // Re-sort by original position — restore narrative order
  selected.sort((a, b) => a.originalIndex - b.originalIndex)

  return selected.map(s => s.text).join(' ')
}

// ─── Rolling window layer ─────────────────────────────────────────

function chunkText(
  text: string,
  chunkChars = 2400,    // ~600 tokens
  overlapChars = 400    // ~100 tokens — preserves context at boundaries
): string[] {
  const chunks: string[] = []
  let pos = 0
  while (pos < text.length) {
    // Snap to sentence boundary — avoids cutting mid-sentence
    let end = pos + chunkChars
    if (end < text.length) {
      const snap = text.indexOf('. ', end - 200)
      if (snap !== -1 && snap < end + 200) end = snap + 2
    }
    chunks.push(text.slice(pos, end))
    pos = end - overlapChars
  }
  return chunks
}

// ─── Combined pipeline ────────────────────────────────────────────

export async function summarizeLargeText(
  text: string,
  opts?: {
    onToken?: (token: string) => void
    onProgress?: (pct: number, stage: string) => void
    targetTokens?: number
  }
): Promise<{ summary: string; metrics: any }> {
  const startTime = performance.now()
  const { onToken, onProgress, targetTokens = 3000 } = opts ?? {}

  // Stage 1: extract dense text (instant — no LLM)
  const extractStart = performance.now()
  onProgress?.(0, 'Extracting key sentences…')
  const dense = extractDenseText(text, targetTokens)
  const extractEnd = performance.now()

  log(`Stage 1 (Extraction) took ${(extractEnd - extractStart).toFixed(2)}ms`, { denseLen: dense.length })

  const chunks = chunkText(dense)
  onProgress?.(5, `Processing ${chunks.length} chunks…`)

  // Stage 2: rolling window over dense text
  let running = ''
  let totalTokens = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunkStart = performance.now()
    const isLast = i === chunks.length - 1
    const pct = 5 + (i / chunks.length) * 80

    log(`Processing chunk ${i + 1}/${chunks.length}`, { chunkLen: chunks[i].length, runningLen: running.length })

    const chatMessages = running
      ? [
          { role: 'system', content: 'You are building a progressive summary of a research paper.' },
          { role: 'user', content: `Running summary so far:\n${running}\n\nNew content to integrate:\n${chunks[i]}\n\n${isLast ? 'Write final complete summary. 4 sentences: problem, method, result, significance.' : 'Update running summary with key info. Under 4 sentences.'}` }
        ]
      : [
          { role: 'system', content: 'You are a research assistant.' },
          { role: 'user', content: `Summarize opening section of research paper in 3 sentences. Focus on problem and approach.\n\n${chunks[i]}` }
        ]

    if (i === 0) log('First chunk messages:', chatMessages)

    const { result, metrics } = await inferStream(
      chatMessages,
      token => {
        if (isLast) onToken?.(token)
      },
      { maxTokens: isLast ? 150 : 100, temperature: 0.2 }
    )
    running = result.trim()
    if (metrics) totalTokens += metrics.tokenCount
    
    const chunkEnd = performance.now()
    log(`Chunk ${i + 1}/${chunks.length} done in ${(chunkEnd - chunkStart).toFixed(2)}ms`, { result: running })
    onProgress?.(pct, `Chunk ${i + 1}/${chunks.length} done`)
  }

  const totalDuration = performance.now() - startTime
  const tokPerSec = totalTokens / (totalDuration / 1000)

  log('Summarization complete', { finalSummary: running, totalDurationMs: totalDuration })
  onProgress?.(100, 'Done')
  return { 
    summary: running, 
    metrics: { durationMs: totalDuration, tokenCount: totalTokens, tokPerSec } 
  }
}

// ─── Section-aware variant (uses your PageIndex) ──────────────────
// Scores sections by type before extracting sentences within them.
// Methodology and results get a signal boost; references are dropped.

const SECTION_BOOSTS: Partial<Record<PageIndexSection['type'], number>> = {
  abstract: 3,
  results: 3,
  conclusion: 2,
  methodology: 1,
  introduction: 1,
  discussion: 1,
  other: 0,
  references: -99  // always excluded
}

export async function summarizePageIndex(
  sections: PageIndexSection[],
  opts?: {
    onToken?: (token: string) => void
    onProgress?: (pct: number, stage: string) => void
  }
): Promise<{ summary: string; metrics: any }> {
  // Concatenate sections in document order, with section boost applied
  // by passing higher-priority section text first to the extractor
  const ordered = [...sections].sort((a, b) => {
    const ba = SECTION_BOOSTS[a.type] ?? 0
    const bb = SECTION_BOOSTS[b.type] ?? 0
    return bb - ba  // higher boost → appears earlier → wins budget competition
  })

  const boostedText = ordered
    .filter(s => (SECTION_BOOSTS[s.type] ?? 0) >= 0)
    .map(s => s.full_text)
    .join('\n\n')

  return summarizeLargeText(boostedText, opts)
}
