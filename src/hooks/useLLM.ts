import { useCallback, useEffect, useRef, useState } from 'react'

export function useLLM() {
  const workerRef = useRef<Worker | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initProgress, setInitProgress] = useState<string>('')
  const [initLoadingPercent, setInitLoadingPercent] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    // Initialize worker (but don't download model yet)
    try {
      workerRef.current = new Worker(
        new URL('../workers/llm.worker.ts', import.meta.url),
        { type: 'module' }
      )

      workerRef.current.onmessage = (event) => {
        const { type, message, progress, error: workerError } = event.data

        switch (type) {
          case 'init-progress':
            setInitProgress(message || '')
            if (progress !== undefined) {
              setInitLoadingPercent(progress)
            }
            setIsDownloading(true)
            break

          case 'init-complete':
            setInitialized(true)
            setInitProgress('Model ready!')
            setIsDownloading(false)
            break

          case 'error':
            setError(workerError || 'Worker error')
            setIsDownloading(false)
            break
        }
      }

      workerRef.current.onerror = (event) => {
        console.error('Worker error:', event)
        setError(`Worker error: ${event.message}`)
        setIsDownloading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize worker')
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const downloadModel = useCallback(() => {
    if (!workerRef.current) {
      setError('Worker not initialized')
      return
    }

    setError(null)
    setInitProgress('Starting download...')
    setIsDownloading(true)

    // Trigger model download in worker
    workerRef.current.postMessage({
      type: 'init'
    })
  }, [])

  const summarize = useCallback(
    async (text: string, sectionId: string): Promise<string> => {
      if (!workerRef.current) {
        throw new Error('Worker not initialized')
      }

      if (!initialized) {
        throw new Error('Model is not loaded. Please download the AI model first.')
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          handler()
          reject(new Error('Summarization timeout'))
        }, 60000) // 60 second timeout

        const handler = () => {
          clearTimeout(timeout)
          workerRef.current?.removeEventListener('message', listener)
        }

        const listener = (event: MessageEvent) => {
          if (event.data.sectionId === sectionId) {
            handler()
            if (event.data.type === 'summary-complete') {
              resolve(event.data.summary)
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.error))
            }
          }
        }

        workerRef.current?.addEventListener('message', listener)
        workerRef.current?.postMessage({
          type: 'summarize',
          text,
          sectionId
        })
      })
    },
    [initialized]
  )

  return {
    initialized,
    error,
    initProgress,
    initLoadingPercent,
    isDownloading,
    downloadModel,
    summarize
  }
}
