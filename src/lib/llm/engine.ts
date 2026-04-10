// lib/llm/engine.ts
// Singleton to manage the LLM worker and provide inference functions

let worker: Worker | null = null
let initialized = false
let initCallback: ((data: any) => void) | null = null

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
  onProgress?: (data: any) => void
): Promise<void> {
  const w = getWorker()
  initCallback = onProgress

  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const { type, error, message, progress } = event.data
      
      if (type === 'init-progress' && onProgress) {
        onProgress({ message, progress })
      } else if (type === 'init-complete') {
        initialized = true
        w.removeEventListener('message', handler)
        resolve()
      } else if (type === 'error' && !initialized) {
        w.removeEventListener('message', handler)
        reject(new Error(error))
      }
    }

    w.addEventListener('message', handler)
    w.postMessage({ type: 'init', modelId, filename })
  })
}

export async function inferStream(
  prompt: string,
  onToken: (token: string) => void,
  params?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const w = getWorker()
  const requestId = Math.random().toString(36).substring(7)
  let fullText = ''

  return new Promise((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      const { type, requestId: respId, token, result, error } = event.data

      if (respId !== requestId) return

      if (type === 'token') {
        fullText += token
        onToken(token)
      } else if (type === 'infer-complete') {
        w.removeEventListener('message', listener)
        resolve(result)
      } else if (type === 'error') {
        w.removeEventListener('message', listener)
        reject(new Error(error))
      }
    }

    w.addEventListener('message', listener)
    w.postMessage({
      type: 'infer',
      prompt,
      sectionId: requestId,
      params: { ...params, stream: true }
    })
  })
}

export function isInitialized() {
  return initialized
}
