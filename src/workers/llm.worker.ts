// LLM Worker - handles inference in a dedicated thread
// Uses wllama for WASM-based LLM inference

// Workaround for libraries that expect 'document' to be defined
if (typeof (self as any).document === 'undefined') {
  ;(self as any).document = {
    createElement: () => ({})
  };
}

interface MessageData {
  type: 'init' | 'summarize' | 'infer'
  text?: string
  prompt?: string
  sectionId?: string
  modelId?: string
  filename?: string
  params?: {
    maxTokens?: number
    temperature?: number
    stream?: boolean
  }
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
      n_ctx: 4096, // Increased context window
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
  const maxChars = 4000
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) + '...' : text

  // Prepare prompt for summarization
  const prompt = `<|im_start|>system
You are a research assistant. Summarize the following paper fragments into 3 bullet points focusing on the problem and solution.<|im_end|>
<|im_start|>user
${truncatedText}<|im_end|>
<|im_start|>assistant
Summary:`;

  console.log('[Worker] Starting generation for text length:', text.length)

  try {
    const startTime = Date.now()
    // Generate summary using wllama
    const summary = await wllama.createCompletion(prompt, {
      nPredict: 120,
      sampling: {
        temp: 0.2
      }
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
 * General inference function with optional streaming.
 */
async function infer(
  prompt: string,
  params?: { maxTokens?: number; temperature?: number; stream?: boolean },
  requestId?: string
): Promise<string> {
  if (!wllama || !modelLoaded) {
    throw new Error('Model not initialized. Call init first.')
  }

  const { maxTokens = 100, temperature = 0.2, stream = false } = params ?? {}

  try {
    const output = await wllama.createCompletion(prompt, {
      nPredict: maxTokens,
      sampling: {
        temp: temperature
      },
      onNewToken: stream
        ? (token: number, piece: Uint8Array, currentText: string) => {
            const tokenText = new TextDecoder().decode(piece)
            self.postMessage({
              type: 'token',
              requestId,
              token: tokenText
            })
          }
        : undefined
    })

    return output.trim()
  } catch (error) {
    console.error('[Worker] Inference error:', error)
    throw error
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { type, text, prompt, sectionId, modelId, filename, params } = event.data

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
          message: 'Generating summary…'
        })

        const summary = await generateSummary(text)

        self.postMessage({
          type: 'summary-complete',
          sectionId,
          summary
        })
        break

      case 'infer':
        if (!prompt) {
          throw new Error('No prompt provided for inference')
        }

        const result = await infer(prompt, params, sectionId)

        self.postMessage({
          type: 'infer-complete',
          requestId: sectionId,
          result
        })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      sectionId,
      requestId: sectionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
