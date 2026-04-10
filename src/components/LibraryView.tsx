import { useEffect, useState } from 'react'
import { Archive } from 'lucide-react'
import { useOPFS } from '../hooks/useOPFS'
import { PaperCard } from './PaperCard'
import type { useLibrary } from '../hooks/useLibrary'

interface LibraryViewProps {
  onOpenPaper: (id: string) => void
  library: ReturnType<typeof useLibrary>
}

export function LibraryView({ onOpenPaper, library }: LibraryViewProps) {
  const { savedPapers, loading, removePaper } = library
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
    if (confirm('Are you sure you wish to remove this record from the permanent archive?')) {
      try {
        await removePaper(id)
      } catch (err) {
        console.error('Failed to remove paper:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="border-2 border-ink p-12 bg-paper text-center max-w-sm w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-divider border-t-ink animate-spin" />
            <p className="font-mono uppercase tracking-widest text-xs font-black">Accessing Library Records...</p>
          </div>
        </div>
      </div>
    )
  }

  if (savedPapers.length === 0) {
    return (
      <div className="text-center py-24 border-2 border-divider border-dashed bg-paper/50">
        <Archive size={48} className="mx-auto text-ink/10 mb-6" />
        <h2 className="text-2xl font-display font-black uppercase italic mb-2">Archive Vacant</h2>
        <p className="font-body text-sm text-ink/40 max-w-xs mx-auto italic">
          Your personal repository contains no records. Save documents from the Topic Dispatches to build your archive.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="bg-paper border-4 border-ink p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Archive size={120} strokeWidth={1} />
        </div>
        
        <div className="relative z-10 border-b-2 border-ink pb-4 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">Personal Archive Index</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 italic">Registry of Curated Scientific Intelligence</p>
          </div>
          <div className="font-mono text-[10px] font-black uppercase bg-ink text-paper px-3 py-1">
            Total Records: {savedPapers.length}
          </div>
        </div>
        <p className="font-body text-sm text-ink/60 leading-relaxed italic max-w-2xl">
          The following documents have been curated for offline accessibility. Records marked as <span className="font-black text-ink uppercase">Offline</span> are stored within the Local Persistence Layer.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {savedPapers.map(paper => (
          <div key={paper.id} className="w-full">
            <PaperCard
              paper={paper}
              isSaved={true}
              isCached={cachedPapers.has(paper.id)}
              onSave={() => {}} // Already saved
              onOpen={() => onOpenPaper(paper.id)}
              onRemove={() => handleRemove(paper.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
