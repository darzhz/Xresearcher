import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Wifi, AlertCircle, Loader } from 'lucide-react'
import { useArxiv } from '../hooks/useArxiv'
import { useInterests } from '../hooks/useInterests'
import { useLibrary } from '../hooks/useLibrary'
import { CategoryPicker } from './CategoryPicker'
import { PaperCard } from './PaperCard'

interface InboxViewProps {
  onOpenPaper: (id: string) => void
}

export function InboxView({ onOpenPaper }: InboxViewProps) {
  const { results, loading, error, hasMore, loadDailyFeed, loadMore } = useArxiv()
  const { interests, addInterest, removeInterest } = useInterests()
  const { savePaper, isPaperSaved } = useLibrary()
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
    <div className="space-y-6">
      {/* Category selection */}
      <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-cyan-100">My Interests</h2>
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/40 hover:border-cyan-500/60 rounded-lg text-sm font-medium transition-all duration-300"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {interests.length === 0 ? (
          <p className="text-sm text-cyan-300/60">
            No interests selected. Click "Add" to get started.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {interests.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 rounded-full text-sm hover:border-cyan-500/50 transition-all duration-300"
              >
                {cat}
                <button
                  onClick={() => removeInterest(cat)}
                  className="text-cyan-400 hover:text-red-400 font-bold transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Refresh button */}
      {interests.length > 0 && (
        <button
          onClick={handleLoadFeed}
          disabled={loading || isOffline}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-500 disabled:to-slate-600 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Loading...' : 'Load Daily Feed'}</span>
        </button>
      )}

      {/* Offline warning */}
      {isOffline && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <Wifi size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            You're offline. Inbox requires an internet connection.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Papers list */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {results.map(paper => (
              <PaperCard
                key={paper.id}
                paper={paper}
                isSaved={isPaperSaved(paper.id)}
                onSave={() => handleSavePaper(paper.id)}
                onOpen={() => onOpenPaper(paper.id)}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <button
              onClick={() => loadMore()}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/5 border border-cyan-500/20 text-cyan-300 hover:bg-white/10 hover:border-cyan-500/40 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader size={18} className="animate-spin" />}
              <span>{loading ? 'Loading...' : 'Load More'}</span>
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && interests.length > 0 && (
        <div className="text-center py-12">
          <p className="text-cyan-300/60 mb-4">No papers found for your interests.</p>
          <button
            onClick={handleLoadFeed}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
          >
            Try again
          </button>
        </div>
      )}

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
