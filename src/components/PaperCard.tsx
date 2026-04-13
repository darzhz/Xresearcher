import { Bookmark, BookmarkCheck, HardDrive, ArrowRight } from 'lucide-react'
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
    const result = lineArray.join(' ').substring(0, 180)
    return result + (text.length > 180 ? '...' : '')
  }

  const getSummaryText = (data: any): string => {
    if (!data) return ''
    if (typeof data === 'string') return data
    if (data.summary) return data.summary
    return ''
  }

  return (
    <div className="group bg-paper p-6 border-ink hover:bg-neutral-50 transition-all duration-300 flex flex-col h-full relative overflow-hidden hard-shadow-hover">
      {/* Decorative Corner Accent */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-ink/10 group-hover:border-editorial transition-colors" />

      <div className="flex flex-col flex-1 gap-4">
        {/* Category & Date Metadata */}
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink/40 border-b border-divider pb-2">
          <div className="flex gap-3">
            {paper.categories.slice(0, 1).map(cat => (
              <span key={cat} className="text-editorial font-bold">{cat}</span>
            ))}
            <span>{paper.published || 'RECENT'}</span>
          </div>
          {isCached && (
            <div className="flex items-center gap-1 text-ink/60">
              <HardDrive size={10} />
              <span>OFFLINE</span>
            </div>
          )}
        </div>

        {/* Headline */}
        <h3 
          onClick={onOpen}
          className="text-2xl font-display font-bold text-ink leading-[1.1] group-hover:text-editorial cursor-pointer transition-colors"
        >
          {paper.title}
        </h3>

        {/* Authors */}
        <p className="text-xs font-sans font-semibold uppercase tracking-wider text-ink/60 italic">
          By {paper.authors.slice(0, 3).join(', ')}
          {paper.authors.length > 3 && ` [et al.]`}
        </p>

        {/* Abstract snippet or TLDR */}
        <p className="text-sm font-body text-ink/80 leading-relaxed text-justify hyphens-auto">
          {paper.tldr ? (
            <>
              <span className="font-mono text-[10px] uppercase font-black tracking-widest text-editorial mr-2">TLDR:</span>
              {getSummaryText(paper.tldr)}
            </>
          ) : truncateText(getSummaryText(paper.summary))}
        </p>

        <div className="mt-auto pt-6 flex items-center justify-between border-t border-divider">
          <div className="flex gap-4">
            <button
              onClick={onOpen}
              className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-widest text-ink hover:text-editorial transition-colors group/btn"
            >
              <span>Full Text</span>
              <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>

            {isSaved ? (
              <button
                onClick={onRemove || onSave}
                className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-widest text-editorial hover:underline"
              >
                <BookmarkCheck size={12} />
                <span>Saved</span>
              </button>
            ) : (
              <button
                onClick={onSave}
                className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-widest text-ink/40 hover:text-ink transition-colors"
              >
                <Bookmark size={12} />
                <span>Archive</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
