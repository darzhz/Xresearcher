import { useEffect, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { useOPFS } from '../hooks/useOPFS'
import { PaperCard } from './PaperCard'

interface LibraryViewProps {
  onOpenPaper: (id: string) => void
}

export function LibraryView({ onOpenPaper }: LibraryViewProps) {
  const { savedPapers, loading, removePaper } = useLibrary()
  const { paperExists } = useOPFS()
  const [cachedPapers, setCachedPapers] = useState<Set<string>>(new Set())

  // Check which papers are cached in OPFS
  useEffect(() => {
    const checkCached = async () => {
      const cached = new Set<string>()
      for (const paper of savedPapers) {
        if (await paperExists(paper.id)) {
          cached.add(paper.id)
        }
      }
      setCachedPapers(cached)
    }
    if (savedPapers.length > 0) {
      checkCached()
    }
  }, [savedPapers, paperExists])

  const handleRemove = async (id: string) => {
    if (confirm('Remove this paper from your library?')) {
      try {
        await removePaper(id)
      } catch (err) {
        console.error('Failed to remove paper:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading library...</p>
      </div>
    )
  }

  if (savedPapers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600 mb-4">No papers in your library yet.</p>
        <p className="text-sm text-gray-500">
          Save papers from the Inbox to build your personal research library.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          📚 My Library ({savedPapers.length})
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          All papers below are available offline once cached.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {savedPapers.map(paper => (
          <PaperCard
            key={paper.id}
            paper={paper}
            isSaved={true}
            isCached={cachedPapers.has(paper.id)}
            onSave={() => {}} // Already saved
            onOpen={() => onOpenPaper(paper.id)}
            onRemove={() => handleRemove(paper.id)}
          />
        ))}
      </div>
    </div>
  )
}
