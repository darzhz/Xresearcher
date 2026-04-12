import { useState } from 'react'
import { PaperData } from '../types'
import { SectionSummary } from './SectionSummary'
interface SummaryViewProps {
  paper: PaperData
  initialized: boolean
  llmError: string | null
  summarize: (text: string, onToken?: (token: string) => void) => Promise<{ summary: string; metrics: any }>
}

export function SummaryView({ paper, initialized, llmError, summarize }: SummaryViewProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-white/5 border border-black rounded-xl p-8  transition-all duration-300">
        <h2 className="text-3xl font-display font-bold leading-tight italic  mb-3">
          {paper.title}
        </h2>
        {paper.authors.length > 0 && (
          <p className="text-sm text-black/60 transition-all ">
            By {paper.authors.slice(0, 3).join(', ')}
            {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
          </p>
        )}
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
