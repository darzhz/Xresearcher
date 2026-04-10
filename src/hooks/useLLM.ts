import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModelConfig } from '../lib/models'

export function useLLM() {
  const workerRef = useRef<Worker | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initProgress, setInitProgress] = useState<string>('')
  const [initLoadingPercent, setInitLoadingPercent] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(null)

  useEffect(() => {
    // Initialize worker (but don't download model yet)
    try {
      workerRef.current = new Worker(
        new URL('../workers/llm.worker.ts', import.meta.url),
        { type: 'module' }
      )

      workerRef.current.onmessage = (event) => {
        const { type, message, progress, error: workerError } = event.data
        console.log(`[useLLM] Received message: ${type}`, event.data)

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

          case 'summarize-progress':
            // Can be used to show summarization progress in UI
            console.log(`[useLLM] Summarization progress for section ${event.data.sectionId}:`, message)
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

  const downloadModel = useCallback((config: ModelConfig) => {
    if (!workerRef.current) {
      setError('Worker not initialized')
      return
    }

    setError(null)
    setInitProgress('Starting download...')
    setIsDownloading(true)
    setActiveModel(config)

    // Trigger model download in worker with selected model
    workerRef.current.postMessage({
      type: 'init',
      modelId: config.repoId,
      filename: config.filename
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
        console.log(`[useLLM] Requesting summary for section: ${sectionId}`, { textLength: text.length })
        const timeout = setTimeout(() => {
          handler()
          reject(new Error('Summarization timeout (exceeded 5 minutes)'))
        }, 300000) // 5 minute timeout

        const handler = () => {
          clearTimeout(timeout)
          workerRef.current?.removeEventListener('message', listener)
        }

        const listener = (event: MessageEvent) => {
          if (event.data.sectionId === sectionId) {
            if (event.data.type === 'summary-complete') {
              console.log(`[useLLM] Summary received for section: ${sectionId}`)
              handler()
              resolve(event.data.summary)
            } else if (event.data.type === 'error') {
              console.error(`[useLLM] Error received for section: ${sectionId}`, event.data.error)
              handler()
              reject(new Error(event.data.error))
            }
            // Ignore other message types for this section (like summarize-progress)
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
    activeModel,
    downloadModel,
    summarize
  }
}
