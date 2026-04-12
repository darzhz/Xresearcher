import { useCallback } from 'react'
import type { PageIndex } from '../types'

export function useOPFS() {
  const initializeOPFS = useCallback(async () => {
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      console.warn('OPFS not supported in this browser')
      return null
    }

    try {
      const root = await navigator.storage.getDirectory()
      const docsDir = await root.getDirectoryHandle('docs', { create: true })

      return { root, docsDir }
    } catch (error) {
      console.error('Failed to initialize OPFS:', error)
      return null
    }
  }, [])

  const savePaperHTML = useCallback(async (id: string, html: string) => {
    const root = await navigator.storage.getDirectory()
    const docsDir = await root.getDirectoryHandle('docs', { create: true })
    const paperDir = await docsDir.getDirectoryHandle(id, { create: true })
    const fileHandle = await paperDir.getFileHandle('content.html', { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(html)
    await writable.close()
  }, [])

  const getPaperHTML = useCallback(async (id: string): Promise<string | null> => {
    try {
      const root = await navigator.storage.getDirectory()
      const docsDir = await root.getDirectoryHandle('docs')
      const paperDir = await docsDir.getDirectoryHandle(id)
      const fileHandle = await paperDir.getFileHandle('content.html')
      const file = await fileHandle.getFile()
      return file.text()
    } catch {
      return null
    }
  }, [])

  const savePaperIndex = useCallback(async (id: string, index: PageIndex) => {
    const root = await navigator.storage.getDirectory()
    const docsDir = await root.getDirectoryHandle('docs', { create: true })
    const paperDir = await docsDir.getDirectoryHandle(id, { create: true })
    const fileHandle = await paperDir.getFileHandle('index.json', { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(index))
    await writable.close()
  }, [])

  const getPaperIndex = useCallback(async (id: string): Promise<PageIndex | null> => {
    try {
      const root = await navigator.storage.getDirectory()
      const docsDir = await root.getDirectoryHandle('docs')
      const paperDir = await docsDir.getDirectoryHandle(id)
      const fileHandle = await paperDir.getFileHandle('index.json')
      const file = await fileHandle.getFile()
      const text = await file.text()
      return JSON.parse(text) as PageIndex
    } catch {
      return null
    }
  }, [])

  const paperExists = useCallback(async (id: string): Promise<boolean> => {
    try {
      const root = await navigator.storage.getDirectory()
      const docsDir = await root.getDirectoryHandle('docs')
      const paperDir = await docsDir.getDirectoryHandle(id)
      await paperDir.getFileHandle('content.html')
      return true
    } catch {
      return false
    }
  }, [])

  const deletePaperFiles = useCallback(async (id: string) => {
    try {
      const root = await navigator.storage.getDirectory()
      const docsDir = await root.getDirectoryHandle('docs')
      const paperDir = await docsDir.getDirectoryHandle(id)
      await docsDir.removeEntry(id, { recursive: true })
    } catch {
      // Silently fail if directory doesn't exist
    }
  }, [])

  return {
    initializeOPFS,
    savePaperHTML,
    getPaperHTML,
    savePaperIndex,
    getPaperIndex,
    paperExists,
    deletePaperFiles
  }
}
