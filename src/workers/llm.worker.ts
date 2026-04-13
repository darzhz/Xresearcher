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

type QuantDtype = 'auto' | 'q4' | 'q8' | 'fp16' | 'fp32' | 'int8' | 'uint8' | 'bnb4' | 'q4f16'

interface MessageData {
  type: 'init' | 'summarize' | 'infer'
  text?: string
  prompt?: string
  messages?: { role: string; content: string }[]
  sectionId?: string
  modelId?: string
  filename?: string          // ignored — transformers.js picks quantization internally
  preferredBackend?: 'webgpu' | 'wasm'
  dtype?: QuantDtype
  params?: {
    maxTokens?: number
    temperature?: number
    stream?: boolean
  }
}

const DEBUG = true
function log(msg: string, data?: any) {
  if (DEBUG) self.postMessage({ type: 'log', message: `[Worker] ${msg}`, data })
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
  preferredBackend?: 'webgpu' | 'wasm',
  preferredDtype?: QuantDtype
): Promise<void> {
  if (modelLoaded) return

  const device = preferredBackend || await detectBestDevice()
  activeBackend = device
  log(`Initializing on ${device}`, { modelId, preferredDtype })

  self.postMessage({
    type: 'init-progress',
    message: `Initializing (${device.toUpperCase()})…`,
    progress: 0,
    backend: device
  })

  // dtype selection: q4 for WebGPU (safe memory), q8 for WASM (CPU-friendly)
  const dtype: QuantDtype = preferredDtype || (device === 'webgpu' ? 'q4' : 'q8')

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
    log('Model loaded successfully')
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
      log('Fallback to WASM success')
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
  log('Generating summary', { textLen: text.length })

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
    do_sample: false,
  })
  const durationMs = performance.now() - startTime

  // transformers.js returns an array; the generated text is in the last message
  const generated = (output as any)[0]?.generated_text
  const reply = Array.isArray(generated)
    ? (generated.length > 0 ? generated[generated.length - 1]?.content : '') ?? ''
    : String(generated ?? '')

  log('Summary generation result', { replyLen: reply.length })

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
  input: string | { role: string; content: string }[],
  params?: { maxTokens?: number; temperature?: number; stream?: boolean },
  requestId?: string
): Promise<{ result: string; metrics: Metrics }> {
  if (!generator || !modelLoaded) throw new Error('Model not initialized.')
  
  const startTime = performance.now()
  let tokenCount = 0

  if (typeof input === 'string') {
    const tokens = generator.tokenizer.encode(input)
    log('Inference starting (string)', { promptLen: input.length, promptTokens: tokens.length, params })
  } else {
    log('Inference starting (messages)', { count: input.length, params })
  }

  const { maxTokens = 100, temperature = 0.2, stream = false } = params ?? {}

  if (stream) {
    const { TextStreamer } = await import('@huggingface/transformers')
    let fullText = ''

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (token: string) => {
        fullText += token
        tokenCount++
        if (DEBUG && tokenCount < 5) log('Emitting token', { token, count: tokenCount })
        self.postMessage({ type: 'token', requestId, token })
      }
    })

    const output = await generator(input as any, {
      max_new_tokens: maxTokens,
      temperature,
      do_sample: false,
      streamer
    })

    log('Raw generator output (stream)', { output, result: fullText })

    const durationMs = performance.now() - startTime
    const tokPerSec = tokenCount / (durationMs / 1000)
    log('Inference (stream) complete', { totalLen: fullText.length, tokens: tokenCount, durationMs })
    return { result: fullText.trim(), metrics: { durationMs, tokenCount, tokPerSec } }
  }

  const output = await generator(input as any, {
    max_new_tokens: maxTokens,
    temperature,
    do_sample: false,
  })
  
  log('Raw generator output (non-stream)', { output })
  const durationMs = performance.now() - startTime

  const generated = (output as any)[0]?.generated_text
  let result = ''
  
  if (Array.isArray(generated)) {
    result = (generated[generated.length - 1]?.content || '').trim()
  } else if (typeof generated === 'string') {
    const promptStr = typeof input === 'string' ? input : ''
    result = (generated.startsWith(promptStr) ? generated.slice(promptStr.length) : generated).trim()
  }

  const resultTokens = generator.tokenizer.encode(result)
  tokenCount = resultTokens.length
  const tokPerSec = tokenCount / (durationMs / 1000)

  log('Inference (non-stream) complete', { resultLen: result.length, tokens: tokenCount })
  return { result, metrics: { durationMs, tokenCount, tokPerSec } }
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { type, text, prompt, messages, sectionId, modelId, preferredBackend, dtype, params } = event.data

  try {
    switch (type) {
      case 'init':
        await initializeModel(modelId, preferredBackend, dtype)
        self.postMessage({ type: 'init-complete', backend: activeBackend })
        break

      case 'summarize':
        if (!text) throw new Error('No text provided for summarization')
        self.postMessage({ type: 'summarize-progress', sectionId, message: 'Generating summary…' })
        const { summary, metrics: sMetrics } = await generateSummary(text)
        self.postMessage({ type: 'summary-complete', sectionId, summary, metrics: sMetrics })
        break

      case 'infer':
        const input = messages || prompt
        if (!input) throw new Error('No prompt or messages provided for inference')
        const { result, metrics: iMetrics } = await infer(input, params, sectionId)
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
