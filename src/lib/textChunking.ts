/**
 * Split text into sentences for streaming speech synthesis.
 * Handles common sentence boundaries and abbreviations.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return []

  // Replace common abbreviations to avoid false sentence breaks
  let processed = text
    .replace(/Dr\./g, 'Dr')
    .replace(/Mr\./g, 'Mr')
    .replace(/Mrs\./g, 'Mrs')
    .replace(/Ms\./g, 'Ms')
    .replace(/Prof\./g, 'Prof')
    .replace(/etc\./g, 'etc')
    .replace(/e\.g\./g, 'eg')
    .replace(/i\.e\./g, 'ie')

  // Split on sentence boundaries: . ! ? followed by space and capital letter
  const sentences = processed.split(/(?<=[.!?])\s+(?=[A-Z])/g)

  // Restore abbreviations in sentences
  return sentences
    .map(s =>
      s
        .replace(/\bDr\b/g, 'Dr.')
        .replace(/\bMr\b/g, 'Mr.')
        .replace(/\bMrs\b/g, 'Mrs.')
        .replace(/\bMs\b/g, 'Ms.')
        .replace(/\bProf\b/g, 'Prof.')
        .replace(/\betc\b/g, 'etc.')
        .replace(/\beg\b/g, 'e.g.')
        .replace(/\bie\b/g, 'i.e.')
    )
    .filter(s => s.trim().length > 0)
}

/**
 * Queue sentences for speech synthesis with pause between them.
 * Returns immediately; speech happens asynchronously.
 */
export function queueSpeechSentences(
  sentences: string[],
  onProgress?: (index: number) => void
): { cancel: () => void } {
  let cancelled = false
  let currentUtterance: SpeechSynthesisUtterance | null = null

  const speakNext = (index: number) => {
    if (cancelled || index >= sentences.length) return

    const sentence = sentences[index]
    currentUtterance = new SpeechSynthesisUtterance(sentence)

    currentUtterance.onend = () => {
      if (!cancelled) {
        onProgress?.(index + 1)
        // Small pause between sentences
        setTimeout(() => speakNext(index + 1), 300)
      }
    }

    currentUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      if (!cancelled) {
        speakNext(index + 1)
      }
    }

    window.speechSynthesis.speak(currentUtterance)
  }

  speakNext(0)

  return {
    cancel: () => {
      cancelled = true
      window.speechSynthesis.cancel()
    }
  }
}
