import { useState, useEffect, useCallback } from 'react'
import { getInterests, setInterest, removeInterest } from '../lib/db'

export function useInterests() {
  const [interests, setInterests] = useState<string[]>([])

  useEffect(() => {
    const loadInterests = async () => {
      const cats = await getInterests()
      setInterests(cats)
    }
    loadInterests()
  }, [])

  const addInterest = useCallback(async (category: string) => {
    try {
      await setInterest(category)
      const cats = await getInterests()
      setInterests(cats)
    } catch (error) {
      console.error('Failed to add interest:', error)
      throw error
    }
  }, [])

  const removeInterestCategory = useCallback(async (category: string) => {
    try {
      await removeInterest(category)
      const cats = await getInterests()
      setInterests(cats)
    } catch (error) {
      console.error('Failed to remove interest:', error)
      throw error
    }
  }, [])

  return {
    interests,
    addInterest,
    removeInterest: removeInterestCategory
  }
}
