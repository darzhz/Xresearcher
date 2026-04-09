import { useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
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
      <div className="flex items-center justify-center py-20">
        <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-2xl p-8">
          <Loader size={32} className="text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-cyan-300">Loading library...</p>
        </div>
      </div>
    )
  }

  if (savedPapers.length === 0) {
    return (
      <div className="text-center py-16 backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-8">
        <p className="text-cyan-100 mb-4 text-lg font-medium">No papers in your library yet.</p>
        <p className="text-sm text-cyan-300/70">
          Save papers from the Inbox to build your personal research library.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all duration-300">
        <h2 className="text-lg font-semibold text-cyan-100 mb-1">
          My Library ({savedPapers.length})
        </h2>
        <p className="text-sm text-cyan-300/70">
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
