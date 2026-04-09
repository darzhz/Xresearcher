import { useState, useEffect, useCallback } from 'react'
import type { ArxivMetadata, SavedPaper, Collection } from '../types'
import {
  getAllSavedPapers,
  getCollections,
  createCollection as dbCreateCollection,
  deleteCollection as dbDeleteCollection,
  addPaperToCollection,
  removePaperFromCollection,
  deletePaper as dbDeletePaper
} from '../lib/db'
import { savePaper as savePaperToStorage, deletePaperCompletely } from '../lib/paperStorage'

export function useLibrary() {
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const papers = await getAllSavedPapers()
      const colls = await getCollections()
      setSavedPapers(papers)
      setCollections(colls)
      setLoading(false)
    }
    loadData()
  }, [])

  const savePaper = useCallback(async (meta: ArxivMetadata) => {
    try {
      await savePaperToStorage(meta)
      // Refresh list
      const papers = await getAllSavedPapers()
      setSavedPapers(papers)
    } catch (error) {
      console.error('Failed to save paper:', error)
      throw error
    }
  }, [])

  const removePaper = useCallback(async (id: string) => {
    try {
      await deletePaperCompletely(id)
      const papers = await getAllSavedPapers()
      setSavedPapers(papers)
    } catch (error) {
      console.error('Failed to remove paper:', error)
      throw error
    }
  }, [])

  const isPaperSaved = useCallback((id: string): boolean => {
    return savedPapers.some(p => p.id === id)
  }, [savedPapers])

  const addCollection = useCallback(async (name: string) => {
    try {
      await dbCreateCollection(name)
      const colls = await getCollections()
      setCollections(colls)
    } catch (error) {
      console.error('Failed to create collection:', error)
      throw error
    }
  }, [])

  const removeCollection = useCallback(async (id: number) => {
    try {
      await dbDeleteCollection(id)
      const colls = await getCollections()
      setCollections(colls)
    } catch (error) {
      console.error('Failed to delete collection:', error)
      throw error
    }
  }, [])

  const assignToCollection = useCallback(async (paperId: string, collectionId: number) => {
    try {
      await addPaperToCollection(paperId, collectionId)
      const papers = await getAllSavedPapers()
      setSavedPapers(papers)
    } catch (error) {
      console.error('Failed to assign paper to collection:', error)
      throw error
    }
  }, [])

  const removeFromCollection = useCallback(async (paperId: string, collectionId: number) => {
    try {
      await removePaperFromCollection(paperId, collectionId)
      const papers = await getAllSavedPapers()
      setSavedPapers(papers)
    } catch (error) {
      console.error('Failed to remove paper from collection:', error)
      throw error
    }
  }, [])

  return {
    savedPapers,
    collections,
    loading,
    savePaper,
    removePaper,
    isPaperSaved,
    addCollection,
    removeCollection,
    assignToCollection,
    removeFromCollection
  }
}
