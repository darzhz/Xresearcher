import { useCallback, useEffect, useRef, useState } from 'react'

export function useLLM() {
  const workerRef = useRef<Worker | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/llm.worker.ts', import.meta.url),
        { type: 'module' }
      )

      workerRef.current.onmessage = (event) => {
        if (event.data.type === 'init-complete') {
          setInitialized(true)
        } else if (event.data.type === 'error') {
          setError(event.data.error)
        }
      }

      // Initialize the model
      workerRef.current.postMessage({
        type: 'init',
        modelUrl: '/models/qwen-2.5-1.5b.gguf'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize worker')
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const summarize = useCallback(
    async (text: string, sectionId: string): Promise<string> => {
      if (!workerRef.current) {
        throw new Error('Worker not initialized')
      }

      return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.data.sectionId === sectionId) {
            workerRef.current?.removeEventListener('message', handler)
            if (event.data.type === 'summary-complete') {
              resolve(event.data.summary)
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.error))
            }
          }
        }

        workerRef.current?.addEventListener('message', handler)
        workerRef.current?.postMessage({
          type: 'summarize',
          text,
          sectionId
        })
      })
    },
    []
  )

  return { initialized, error, summarize }
}
