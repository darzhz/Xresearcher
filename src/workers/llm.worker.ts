// LLM Worker - handles inference in a dedicated thread
// Uses wllama for WASM-based LLM inference

interface MessageData {
  type: 'init' | 'summarize'
  text?: string
  sectionId?: string
}

let wllama: any = null
let modelLoaded = false

/**
 * Initialize wllama and load the Qwen model from Hugging Face.
 */
async function initializeModel(): Promise<void> {
  if (modelLoaded) return

  try {
    // Dynamically import wllama
    const { Wllama } = await import('@wllama/wllama')

    // Report progress
    self.postMessage({
      type: 'init-progress',
      message: 'Initializing WASM runtime...'
    })

    // Create wllama instance with default ESM paths
    // wllama will use CDN by default for WASM files
    wllama = new Wllama(
      {
        'single-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/single-thread/wllama.wasm'
      } as any
    )

    // Report progress as model loads
    self.postMessage({
      type: 'init-progress',
      message: 'Downloading model from Hugging Face (~1.1GB)...'
    })

    // Load Qwen 2.5 1.5B Q4 model from Hugging Face
    await wllama.loadModelFromHF('Qwen/Qwen2.5-1.5B-Instruct-GGUF', 'qwen2.5-1.5b-instruct-q4_k_m.gguf')

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

  try {
    // Generate summary using wllama
    const summary = await wllama.createCompletion(prompt, {
      nPredict: 100
    })

    return (summary || '').trim() || 'Unable to generate summary'
  } catch (error) {
    throw new Error(
      `Summarization failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { type, text, sectionId } = event.data

  try {
    switch (type) {
      case 'init':
        await initializeModel()
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
