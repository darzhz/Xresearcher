import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { PaperData, ArxivMetadata } from '../types'
import { SectionSummary } from './SectionSummary'

interface SummaryViewProps {
  paper: PaperData
  metadata: ArxivMetadata | null
  isSaved: boolean
  onSave: () => void
  initialized: boolean
  llmError: string | null
  summarize: (text: string, onToken?: (token: string) => void) => Promise<{ summary: string; metrics: any }>
}

export function SummaryView({ 
  paper, 
  metadata,
  isSaved,
  onSave,
  initialized, 
  llmError, 
  summarize 
}: SummaryViewProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-white/5 border border-black rounded-xl p-8 transition-all duration-300 relative group">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-display font-bold leading-tight italic mb-3">
              {paper.title}
            </h2>
            {paper.authors.length > 0 && (
              <p className="text-sm text-black/60 transition-all ">
                By {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
              </p>
            )}
          </div>
          
          {metadata && (
            <button
              onClick={onSave}
              disabled={isSaved}
              className={`flex items-center gap-2 px-4 py-2 border-2 border-ink font-mono text-[10px] uppercase font-bold tracking-widest transition-all ${
                isSaved 
                  ? 'bg-ink text-paper opacity-50 cursor-default' 
                  : 'bg-paper text-ink hover:bg-editorial hover:text-paper hover:border-editorial'
              }`}
            >
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              <span>{isSaved ? 'Archived' : 'Save to Archive'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {paper.sections.map((section) => (
          <SectionSummary
            key={section.id}
            section={section}
            isExpanded={expandedSectionId === section.id}
            onToggle={() =>
              setExpandedSectionId(
                expandedSectionId === section.id ? null : section.id
              )
            }
            initialized={initialized}
            llmError={llmError}
            summarize={summarize}
          />
        ))}
      </div>
    </div>
  )
}
