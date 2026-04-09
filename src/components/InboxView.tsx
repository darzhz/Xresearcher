import { useState } from 'react'
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
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">My Interests</h2>
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            + Add
          </button>
        </div>

        {interests.length === 0 ? (
          <p className="text-sm text-gray-600">
            No interests selected. Click "Add" to get started.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {interests.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
              >
                {cat}
                <button
                  onClick={() => removeInterest(cat)}
                  className="hover:text-indigo-900 font-bold"
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
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? '⏳ Loading...' : '🔄 Load Daily Feed'}
        </button>
      )}

      {/* Offline warning */}
      {isOffline && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            📡 You're offline. Inbox requires an internet connection.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
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
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-300 transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && interests.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No papers found for your interests.</p>
          <button
            onClick={handleLoadFeed}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
