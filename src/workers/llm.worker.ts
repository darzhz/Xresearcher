/// <reference lib="webworker" />
// LLM Worker - handles inference in a dedicated thread
// Uses transformers.js for WebGPU-accelerated (or WASM fallback) inference

import { pipeline, env, TextGenerationPipeline } from '@huggingface/transformers'

// Transformers.js needs to resolve WASM/model files at a known base URL.
// Adjust if you have a local asset mirror.
env.allowLocalModels = false
env.useBrowserCache = true   // cache downloaded weights in IndexedDB

interface Metrics {
  durationMs: number
  tokenCount: number
  tokPerSec: number
}

interface MessageData {
  type: 'init' | 'summarize' | 'infer'
  text?: string
  prompt?: string
  sectionId?: string
  modelId?: string
  filename?: string          // ignored — transformers.js picks quantization internally
  preferredBackend?: 'webgpu' | 'wasm'
  params?: {
    maxTokens?: number
    temperature?: number
    stream?: boolean
  }
}

let generator: TextGenerationPipeline | null = null
let modelLoaded = false
let activeBackend: 'webgpu' | 'wasm' = 'wasm'

// ---------------------------------------------------------------------------
// Backend detection
// ---------------------------------------------------------------------------

async function detectBestDevice(): Promise<'webgpu' | 'wasm'> {
  if (typeof navigator === 'undefined') return 'wasm'
  const gpu = (navigator as any).gpu
  if (!gpu) return 'wasm'
  try {
    const adapter = await gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function initializeModel(
  modelId: string = 'Qwen/Qwen2.5-1.5B-Instruct',
  preferredBackend?: 'webgpu' | 'wasm'
): Promise<void> {
  if (modelLoaded) return

  const device = preferredBackend || await detectBestDevice()
  activeBackend = device

  self.postMessage({
    type: 'init-progress',
    message: `Initializing (${device.toUpperCase()})…`,
    progress: 0,
    backend: device
  })

  // dtype selection: fp16 for WebGPU (fast + fits VRAM), q8 for WASM (CPU-friendly)
  const dtype = device === 'webgpu' ? 'fp16' : 'q8'

  try {
    generator = await pipeline('text-generation', modelId, {
      device,
      dtype,
      progress_callback: (p: { status: string; progress?: number; file?: string }) => {
        if (p.status === 'downloading' || p.status === 'progress') {
          const progress = Math.round(p.progress ?? 0)
          self.postMessage({
            type: 'init-progress',
            message: `Downloading${p.file ? ` ${p.file}` : ''}… ${progress}%`,
            progress
          })
        } else if (p.status === 'ready') {
          self.postMessage({ type: 'init-progress', message: 'Model ready!', progress: 100 })
        }
      }
    }) as TextGenerationPipeline

    modelLoaded = true
  } catch (error) {
    // If WebGPU was attempted and failed, retry transparently on WASM
    if (device === 'webgpu') {
      console.warn('[Worker] WebGPU pipeline failed, retrying on WASM:', error)
      self.postMessage({
        type: 'init-progress',
        message: 'WebGPU unavailable, falling back to WASM…',
        progress: 0,
        backend: 'wasm'
      })
      activeBackend = 'wasm'
      generator = await pipeline('text-generation', modelId, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (p: { status: string; progress?: number }) => {
          if (p.status === 'progress') {
            self.postMessage({
              type: 'init-progress',
              message: `Downloading… ${Math.round(p.progress ?? 0)}%`,
              progress: Math.round(p.progress ?? 0)
            })
          }
        }
      }) as TextGenerationPipeline
      modelLoaded = true
    } else {
      throw new Error(`Failed to load model: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Summarize
// ---------------------------------------------------------------------------

async function generateSummary(text: string): Promise<{ summary: string; metrics: Metrics }> {
  if (!generator || !modelLoaded) throw new Error('Model not initialized.')

  const maxChars = 4000
  const truncated = text.length > maxChars ? text.slice(0, maxChars) + '…' : text

  const messages = [
    { role: 'system', content: 'You are a research assistant. Summarize the following paper in a few sentences.' },
    { role: 'user',   content: truncated }
  ]

  const startTime = performance.now()
  const output = await generator(messages as any, {
    max_new_tokens: 120,
    temperature: 0.2,
    do_sample: true,
  })
  const durationMs = performance.now() - startTime

  // transformers.js returns an array; the generated text is in the last message
  const generated = (output as any)[0]?.generated_text
  const reply = Array.isArray(generated)
    ? (generated.length > 0 ? generated[generated.length - 1]?.content : '') ?? ''
    : String(generated ?? '')

  // Token count
  const tokens = generator.tokenizer.encode(reply)
  const tokenCount = tokens.length
  const tokPerSec = tokenCount / (durationMs / 1000)

  return { 
    summary: reply.trim() || 'Unable to generate summary',
    metrics: { durationMs, tokenCount, tokPerSec }
  }
}

// ---------------------------------------------------------------------------
// General inference
// ---------------------------------------------------------------------------

async function infer(
  prompt: string,
  params?: { maxTokens?: number; temperature?: number; stream?: boolean },
  requestId?: string
): Promise<{ result: string; metrics: Metrics }> {
  if (!generator || !modelLoaded) throw new Error('Model not initialized.')

  const { maxTokens = 100, temperature = 0.2, stream = false } = params ?? {}
  const startTime = performance.now()
  let tokenCount = 0

  if (stream) {
    // transformers.js streamer — emit token-by-token
    const { TextStreamer } = await import('@huggingface/transformers')
    let fullText = ''

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (token: string) => {
        fullText += token
        tokenCount++
        self.postMessage({ type: 'token', requestId, token })
      }
    })

    await generator(prompt, {
      max_new_tokens: maxTokens,
      temperature,
      do_sample: true,
      streamer
    })

    const durationMs = performance.now() - startTime
    const tokPerSec = tokenCount / (durationMs / 1000)
    return { result: fullText.trim(), metrics: { durationMs, tokenCount, tokPerSec } }
  }

  const output = await generator(prompt, {
    max_new_tokens: maxTokens,
    temperature,
    do_sample: true,
  })
  const durationMs = performance.now() - startTime

  const generated = (output as any)[0]?.generated_text
  const result = (typeof generated === 'string' ? generated : '').replace(prompt, '').trim()
  
  const tokens = generator.tokenizer.encode(result)
  tokenCount = tokens.length
  const tokPerSec = tokenCount / (durationMs / 1000)

  return { result, metrics: { durationMs, tokenCount, tokPerSec } }
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { type, text, prompt, sectionId, modelId, preferredBackend, params } = event.data

  try {
    switch (type) {
      case 'init':
        await initializeModel(modelId, preferredBackend)
        self.postMessage({ type: 'init-complete', backend: activeBackend })
        break

      case 'summarize':
        if (!text) throw new Error('No text provided for summarization')
        self.postMessage({ type: 'summarize-progress', sectionId, message: 'Generating summary…' })
        const { summary, metrics: sMetrics } = await generateSummary(text)
        self.postMessage({ type: 'summary-complete', sectionId, summary, metrics: sMetrics })
        break

      case 'infer':
        if (!prompt) throw new Error('No prompt provided for inference')
        const { result, metrics: iMetrics } = await infer(prompt, params, sectionId)
        self.postMessage({ type: 'infer-complete', requestId: sectionId, result, metrics: iMetrics })
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
