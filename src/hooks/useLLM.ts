import { useCallback, useEffect, useState } from 'react'
import type { ModelConfig } from '../lib/models'
import * as engine from '../lib/llm/engine'

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
    async (text: string, sectionId: string): Promise<string> => {
      if (!engine.isInitialized()) {
        throw new Error('Model is not loaded. Please download the AI model first.')
      }

      return engine.inferStream(
        `Summarize this text in 2-3 sentences:\n\n${text}\n\nSummary:`,
        () => {}, // Individual tokens not needed for the old summarize call
        { maxTokens: 100, temperature: 0.2 }
      )
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
