// lib/llm/engine.ts
// Singleton to manage the LLM worker and provide inference functions

const DEBUG = true
function log(msg: string, data?: any) {
  if (DEBUG) console.log(`[LLM Engine] ${msg}`, data || '')
}

let worker: Worker | null = null
let initialized = false

export function getWorker() {
  if (!worker) {
    worker = new Worker(
      new URL('../../workers/llm.worker.ts', import.meta.url),
      { type: 'module' }
    )
  }
  return worker
}

export async function initialize(
  modelId: string,
  filename: string,
  onProgress?: (data: any) => void,
  preferredBackend?: 'webgpu' | 'wasm',
  dtype?: string
): Promise<void> {
  log(`Initializing: ${modelId} (${preferredBackend || 'auto'})`)
  const w = getWorker()

  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const { type, error, message, progress, data } = event.data
      
      if (type === 'log') {
        log(message, data)
        return
      }

      if (type === 'init-progress' && onProgress) {
        onProgress({ message, progress })
      } else if (type === 'init-complete') {
        log('Init complete')
        initialized = true
        w.removeEventListener('message', handler)
        resolve()
      } else if (type === 'error' && !initialized) {
        log('Init error', error)
        w.removeEventListener('message', handler)
        reject(new Error(error))
      }
    }

    w.addEventListener('message', handler)
    w.postMessage({ type: 'init', modelId, filename, preferredBackend, dtype })
  })
}

export async function inferStream(
  input: string | { role: string; content: string }[],
  onToken: (token: string) => void,
  params?: { maxTokens?: number; temperature?: number }
): Promise<{ result: string; metrics?: any }> {
  log('Infer start', { 
    input: typeof input === 'string' ? `prompt (${input.length})` : `messages (${input.length})`, 
    params 
  })
  const w = getWorker()
  const requestId = Math.random().toString(36).substring(7)
  let fullText = ''

  return new Promise((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      const { type, requestId: respId, token, result, error, metrics, message, data } = event.data

      if (type === 'log') {
        log(message, data)
        return
      }

      if (respId !== requestId) return

      if (type === 'token') {
        fullText += token
        onToken(token)
      } else if (type === 'infer-complete') {
        log('Infer complete', { resultLen: result.length, metrics })
        w.removeEventListener('message', listener)
        resolve({ result, metrics })
      } else if (type === 'error') {
        log('Infer error', error)
        w.removeEventListener('message', listener)
        reject(new Error(error))
      }
    }

    w.addEventListener('message', listener)
    w.postMessage({
      type: 'infer',
      [typeof input === 'string' ? 'prompt' : 'messages']: input,
      sectionId: requestId,
      params: { ...params, stream: true }
    })
  })
}

export function isInitialized() {
  return initialized
}
