// lib/llm/summarize.ts

import { inferStream } from './engine'
import { PageIndexSection } from '../../types'

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

  const budget = targetTokens * 4  // chars
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
): Promise<string> {
  const { onToken, onProgress, targetTokens = 3000 } = opts ?? {}

  // Stage 1: extract dense text (instant — no LLM)
  onProgress?.(0, 'Extracting key sentences…')
  const dense = extractDenseText(text, targetTokens)

  const chunks = chunkText(dense)
  onProgress?.(5, `Processing ${chunks.length} chunks…`)

  // Stage 2: rolling window over dense text
  let running = ''

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1
    const pct = 5 + (i / chunks.length) * 80

    const prompt = running
      ? `You are building a progressive summary of a research paper.

Running summary so far:
${running}

New content to integrate:
${chunks[i]}

${isLast
  ? 'Write the final complete summary. 4 sentences: problem, method, key result, significance.'
  : 'Update the running summary to include key new information. Keep it under 4 sentences.'
}`
      : `Summarize this opening section of a research paper in 3 sentences.
Focus on: what problem it addresses and what approach is taken.

${chunks[i]}

Summary:`

    running = ''
    await inferStream(
      prompt,
      token => {
        running += token
        if (isLast) onToken?.(token)
      },
      { maxTokens: isLast ? 150 : 100, temperature: 0.2 }
    )
    running = running.trim()
    onProgress?.(pct, `Chunk ${i + 1}/${chunks.length} done`)
  }

  // Stage 3: if only 1 chunk, running IS the final output
  // If multiple chunks, running is already the synthesis
  onProgress?.(100, 'Done')
  return running
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
): Promise<string> {
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
