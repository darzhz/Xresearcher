import { Bookmark, BookmarkCheck, HardDrive } from 'lucide-react'
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
    <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-5 hover:border-cyan-500/40 transition-all duration-300 hover:bg-white/10">
      <div className="space-y-3">
        {/* Title */}
        <h3 className="text-lg font-semibold text-cyan-100 line-clamp-2 hover:text-cyan-300 transition-colors">
          {paper.title}
        </h3>

        {/* Authors and Date */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-cyan-300/70">
          <span>
            {paper.authors.slice(0, 3).join(', ')}
            {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
          </span>
          {paper.published && <span className="text-cyan-500/50">•</span>}
          {paper.published && <span>{paper.published}</span>}
        </div>

        {/* Categories */}
        {paper.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {paper.categories.slice(0, 3).map(cat => (
              <span
                key={cat}
                className="inline-block px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded-md"
              >
                {cat}
              </span>
            ))}
            {paper.categories.length > 3 && (
              <span className="inline-block px-2 py-1 bg-white/5 border border-cyan-500/20 text-cyan-300/60 text-xs rounded-md">
                +{paper.categories.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Abstract/Summary */}
        <p className="text-sm text-cyan-100/80 line-clamp-3 leading-relaxed">
          {truncateText(paper.summary)}
        </p>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {isSaved && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-300 text-xs rounded-md font-medium">
              <BookmarkCheck size={14} />
              Saved
            </span>
          )}
          {isCached && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs rounded-md font-medium">
              <HardDrive size={14} />
              Cached
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onOpen}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-medium text-sm transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            Open
          </button>

          {isSaved ? (
            <>
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 hover:border-red-500/50 rounded-lg font-medium text-sm transition-all duration-300"
                >
                  Remove
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onSave}
              className="px-3 py-2 bg-white/5 border border-cyan-500/20 text-cyan-300 hover:bg-white/10 hover:border-cyan-500/40 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2"
            >
              <Bookmark size={16} />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
