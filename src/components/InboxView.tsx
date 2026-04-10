import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Wifi, AlertCircle, Loader, Hash } from 'lucide-react'
import { useArxiv } from '../hooks/useArxiv'
import { useInterests } from '../hooks/useInterests'
import { CategoryPicker } from './CategoryPicker'
import { PaperCard } from './PaperCard'
import type { useLibrary } from '../hooks/useLibrary'

interface InboxViewProps {
  onOpenPaper: (id: string) => void
  library: ReturnType<typeof useLibrary>
}

export function InboxView({ onOpenPaper, library }: InboxViewProps) {
  const { results, loading, error, hasMore, loadDailyFeed, loadMore } = useArxiv()
  const { interests, addInterest, removeInterest } = useInterests()
  const { savePaper, isPaperSaved } = library
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const handleLoadFeed = async () => {
    await loadDailyFeed(interests)
  }
  useEffect(() => {
    if (interests.length > 0) {
      handleLoadFeed()
    }
  }, [interests])

  const handleSavePaper = async (paperId: string) => {
    const paper = results.find(p => p.id === paperId)
    if (!paper) return

    setSavingId(paperId)
    try {
      await savePaper(paper)
    } catch (err) {
      console.error('Failed to save paper:', err)
    } finally {
      setSavingId(null)
    }
  }

  const isOffline = !navigator.onLine

  return (
    <div className="flex flex-col gap-8">
      {/* Category selection */}
      <div className="bg-paper border-4 border-ink p-6 sm:p-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b-2 border-ink">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-black uppercase tracking-tighter italic">Topic Subscriptions</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Select subject areas for daily dispatch</p>
          </div>
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper hover:bg-editorial transition-colors font-mono uppercase text-xs font-black tracking-widest"
          >
            <Plus size={14} />
            Add Topic
          </button>
        </div>

        {interests.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-divider">
            <p className="font-body text-sm italic text-ink/40">
              No active subscriptions. Please select topics to populate your feed.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {interests.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-ink bg-neutral-50 font-mono text-[10px] uppercase font-black tracking-tight"
              >
                <Hash size={10} className="text-editorial" />
                {cat}
                <button
                  onClick={() => removeInterest(cat)}
                  className="ml-1 text-ink/30 hover:text-editorial transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-mono text-[10px] uppercase font-black tracking-[0.3em] text-ink/40">Current Dispatch</h3>
          <div className="h-px flex-1 mx-4 bg-divider hidden sm:block" />
          {interests.length > 0 && (
            <button
              onClick={handleLoadFeed}
              disabled={loading || isOffline}
              className="flex items-center gap-2 font-mono text-[10px] uppercase font-black tracking-widest text-ink hover:text-editorial transition-colors disabled:opacity-30"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Transmitting...' : 'Refresh Archive'}</span>
            </button>
          )}
        </div>

        {/* Offline warning */}
        {isOffline && (
          <div className="p-4 border-2 border-ink bg-neutral-100 flex items-start gap-4">
            <Wifi size={20} className="text-ink flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-mono font-black uppercase">Offline Mode</p>
              <p className="text-sm font-body italic text-ink/70">Archive synchronization unavailable. Check transmission line.</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 border-2 border-editorial bg-editorial/5 flex items-start gap-4">
            <AlertCircle size={20} className="text-editorial flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-mono font-black uppercase text-editorial">Archive Error</p>
              <p className="text-sm font-body text-ink/80">{error}</p>
            </div>
          </div>
        )}

        {/* Papers list */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 gap-8">
            {results.map(paper => (
              <div key={paper.id} className="w-full overflow-hidden">
                <PaperCard
                  paper={paper}
                  isSaved={isPaperSaved(paper.id)}
                  onSave={() => handleSavePaper(paper.id)}
                  onOpen={() => onOpenPaper(paper.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && results.length > 0 && (
          <div className="flex justify-center pt-8 border-t border-divider">
            <button
              onClick={() => loadMore()}
              disabled={loading}
              className="group relative px-12 py-4 bg-paper text-ink hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3 relative z-10 font-mono text-[10px] uppercase font-black tracking-[0.2em]">
                {loading && <Loader size={14} className="animate-spin" />}
                <span>{loading ? 'Fetching Records...' : 'Load More From Archive'}</span>
              </div>
              <div className="absolute inset-0 border-2 border-ink translate-x-1 translate-y-1 -z-0" />
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && interests.length > 0 && (
          <div className="text-center py-20 border-2 border-divider border-dashed">
            <p className="font-body text-lg italic text-ink/40 mb-8">No matching records found in the current period.</p>
            <button
              onClick={handleLoadFeed}
              className="px-8 py-4 bg-ink text-paper hover:bg-editorial transition-colors font-mono uppercase text-xs font-black tracking-widest"
            >
              Retry Retrieval
            </button>
          </div>
        )}
      </div>

      {/* Category picker modal */}
      {showCategoryPicker && (
        <CategoryPicker
          selectedCategories={interests}
          onAdd={addInterest}
          onRemove={removeInterest}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}
    </div>
  )
}
