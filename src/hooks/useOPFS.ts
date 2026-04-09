import { useCallback } from 'react'

export function useOPFS() {
  const initializeOPFS = useCallback(async () => {
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      console.warn('OPFS not supported in this browser')
      return null
    }

    try {
      const root = await navigator.storage.getDirectory()
      const modelsDir = await root.getDirectoryHandle('models', { create: true })
      const docsDir = await root.getDirectoryHandle('docs', { create: true })

      return { root, modelsDir, docsDir }
    } catch (error) {
      console.error('Failed to initialize OPFS:', error)
      return null
    }
  }, [])

  const saveModel = useCallback(async (modelName: string, data: Blob) => {
    const root = await navigator.storage.getDirectory()
    const modelsDir = await root.getDirectoryHandle('models', { create: true })
    const fileHandle = await modelsDir.getFileHandle(modelName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(data)
    await writable.close()
  }, [])

  const getModel = useCallback(async (modelName: string) => {
    try {
      const root = await navigator.storage.getDirectory()
      const modelsDir = await root.getDirectoryHandle('models')
      const fileHandle = await modelsDir.getFileHandle(modelName)
      return fileHandle
    } catch {
      return null
    }
  }, [])

  return { initializeOPFS, saveModel, getModel }
}
