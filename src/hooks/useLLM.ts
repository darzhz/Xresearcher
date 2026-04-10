import { useCallback, useEffect, useState } from 'react'
import type { ModelConfig } from '../lib/models'
import * as engine from '../lib/llm/engine'
import { summarizeLargeText } from '../lib/llm/summarize'

export function useLLM() {
  const [initialized, setInitialized] = useState(engine.isInitialized())
  const [error, setError] = useState<string | null>(null)
  const [initProgress, setInitProgress] = useState<string>('')
  const [initLoadingPercent, setInitLoadingPercent] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(null)

  useEffect(() => {
    // Sync with engine initialization state
    if (engine.isInitialized()) {
      setInitialized(true)
    }
  }, [])

  const downloadModel = useCallback(async (config: ModelConfig) => {
    setError(null)
    setInitProgress('Starting download...')
    setIsDownloading(true)
    setActiveModel(config)

    try {
      await engine.initialize(config.repoId, config.filename, (data) => {
        if (data.message) setInitProgress(data.message)
        if (data.progress !== undefined) setInitLoadingPercent(data.progress)
      })
      setInitialized(true)
      setInitProgress('Model ready!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
    } finally {
      setIsDownloading(false)
    }
  }, [])

  const summarize = useCallback(
    async (text: string, onToken?: (token: string) => void): Promise<string> => {
      if (!engine.isInitialized()) {
        throw new Error('Model is not loaded. Please download the AI model first.')
      }

      return summarizeLargeText(text, {
        onToken,
        onProgress: (pct, stage) => {
          console.log(`[useLLM] ${stage}: ${pct.toFixed(0)}%`)
        }
      })
    },
    []
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
