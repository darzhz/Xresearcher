import { useState, useCallback } from 'react'
import type { ArxivMetadata, ArxivSearchParams } from '../types'
import { searchArxiv, fetchDailyFeed } from '../lib/arxiv'

const MAX_RESULTS = 20

interface UseArxivState {
  results: ArxivMetadata[]
  loading: boolean
  error: string | null
  hasMore: boolean
  currentStart: number
}

export function useArxiv() {
  const [state, setState] = useState<UseArxivState>({
    results: [],
    loading: false,
    error: null,
    hasMore: false,
    currentStart: 0
  })

  const searchPapers = useCallback(async (params: ArxivSearchParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const papers = await searchArxiv({
        ...params,
        maxResults: MAX_RESULTS,
        start: 0
      })
      setState(prev => ({
        ...prev,
        results: papers,
        hasMore: papers.length === MAX_RESULTS,
        currentStart: 0,
        loading: false
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Search failed',
        loading: false
      }))
    }
  }, [])

  const loadDailyFeed = useCallback(async (categories: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const papers = await fetchDailyFeed(categories, MAX_RESULTS)
      setState(prev => ({
        ...prev,
        results: papers,
        hasMore: papers.length === MAX_RESULTS,
        currentStart: 0,
        loading: false
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load feed',
        loading: false
      }))
    }
  }, [])

  const loadMore = useCallback(async (params?: ArxivSearchParams) => {
    setState(prev => ({ ...prev, loading: true }))
    try {
      const nextStart = state.currentStart + MAX_RESULTS
      const papers = await searchArxiv({
        ...params,
        maxResults: MAX_RESULTS,
        start: nextStart
      })
      setState(prev => ({
        ...prev,
        results: [...prev.results, ...papers],
        hasMore: papers.length === MAX_RESULTS,
        currentStart: nextStart,
        loading: false
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load more',
        loading: false
      }))
    }
  }, [state.currentStart])

  return {
    results: state.results,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    searchPapers,
    loadDailyFeed,
    loadMore
  }
}
