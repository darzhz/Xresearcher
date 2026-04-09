import type { ArxivMetadata } from '../types'

interface PaperCardProps {
  paper: ArxivMetadata
  isSaved: boolean
  isCached?: boolean
  onSave: () => void
  onOpen: () => void
  onRemove?: () => void
}

export function PaperCard({
  paper,
  isSaved,
  isCached,
  onSave,
  onOpen,
  onRemove
}: PaperCardProps) {
  const truncateText = (text: string, lines: number = 3) => {
    const lineArray = text.split('\n').slice(0, lines)
    return lineArray.join(' ').substring(0, 300) + (text.length > 300 ? '...' : '')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-indigo-600">
          {paper.title}
        </h3>

        {/* Authors and Date */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>
            {paper.authors.slice(0, 3).join(', ')}
            {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
          </span>
          {paper.published && <span className="text-gray-400">•</span>}
          {paper.published && <span>{paper.published}</span>}
        </div>

        {/* Categories */}
        {paper.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {paper.categories.slice(0, 3).map(cat => (
              <span
                key={cat}
                className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
              >
                {cat}
              </span>
            ))}
            {paper.categories.length > 3 && (
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{paper.categories.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Abstract/Summary */}
        <p className="text-sm text-gray-700 line-clamp-3">
          {truncateText(paper.summary)}
        </p>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {isSaved && (
            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
              ✓ Saved
            </span>
          )}
          {isCached && (
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
              💾 Cached
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onOpen}
            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Open
          </button>

          {isSaved ? (
            <>
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium text-sm hover:bg-red-200 transition-colors"
                >
                  Remove
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onSave}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
