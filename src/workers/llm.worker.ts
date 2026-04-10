// LLM Worker - handles inference in a dedicated thread
// Uses wllama for WASM-based LLM inference

// Workaround for libraries that expect 'document' to be defined
if (typeof (self as any).document === 'undefined') {
  ;(self as any).document = {
    createElement: () => ({})
  };
}

interface MessageData {
  type: 'init' | 'summarize'
  text?: string
  sectionId?: string
  modelId?: string
  filename?: string
}

let wllama: any = null
let modelLoaded = false

/**
 * Initialize wllama and load a model from Hugging Face.
 */
async function initializeModel(
  modelId: string = 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
  filename: string = 'qwen2.5-1.5b-instruct-q4_k_m.gguf'
): Promise<void> {
  if (modelLoaded) return

  // Report progress immediately
  self.postMessage({
    type: 'init-progress',
    message: 'Initializing WASM runtime...',
    progress: 0
  })

  try {
    // Dynamically import wllama
    const { Wllama } = await import('@wllama/wllama')

    // Create wllama instance with paths to WASM files
    // wllama will use CDN for WASM files
    wllama = new Wllama(
      {
        'single-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/single-thread/wllama.wasm',
        'multi-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/multi-thread/wllama.wasm',
        'multi-thread/wllama.worker.mjs': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/multi-thread/wllama.worker.mjs',
      } as any
    )

    // Report progress as model loads
    self.postMessage({
      type: 'init-progress',
      message: `Downloading model from Hugging Face...`,
      progress: 0
    })

    // Load model from Hugging Face with user-selected repo and filename
    await wllama.loadModelFromHF(modelId, filename, {
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
        const progress = Math.round((loaded / total) * 100)
        self.postMessage({
          type: 'init-progress',
          message: `Downloading model: ${progress}%`,
          progress
        })
      }
    })

    self.postMessage({
      type: 'init-progress',
      message: 'Model loaded successfully!'
    })

    modelLoaded = true
  } catch (error) {
    throw new Error(
      `Failed to load model: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Generate a summary of the given text using the LLM.
 */
async function generateSummary(text: string): Promise<string> {
  if (!wllama || !modelLoaded) {
    throw new Error('Model not initialized. Call init first.')
  }

  // Truncate text if too long to avoid memory issues
  const maxChars = 2000
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) + '...' : text

  // Prepare prompt for summarization
  const prompt = `Summarize this text in 2-3 sentences:

${truncatedText}

Summary:`

  console.log('[Worker] Starting generation for text length:', text.length)
  console.log('[Worker] Generated prompt:', prompt)

  try {
    const startTime = Date.now()
    // Generate summary using wllama
    const summary = await wllama.createCompletion(prompt, {
      nPredict: 100
    })
    const duration = (Date.now() - startTime) / 1000

    const result = (summary || '').trim() || 'Unable to generate summary'
    console.log(`[Worker] Generation complete in ${duration.toFixed(2)}s:`, result)
    return result
  } catch (error) {
    console.error('[Worker] Generation error:', error)
    throw new Error(
      `Summarization failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { type, text, sectionId, modelId, filename } = event.data

  try {
    switch (type) {
      case 'init':
        await initializeModel(modelId, filename)
        self.postMessage({ type: 'init-complete' })
        break

      case 'summarize':
        if (!text) {
          throw new Error('No text provided for summarization')
        }

        self.postMessage({
          type: 'summarize-progress',
          sectionId,
          message: 'Generating summary...'
        })

        const summary = await generateSummary(text)

        self.postMessage({
          type: 'summary-complete',
          sectionId,
          summary
        })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      sectionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
