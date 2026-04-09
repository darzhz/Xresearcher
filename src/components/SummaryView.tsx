import { useState } from 'react'
import { PaperData } from '../types'
import { SectionSummary } from './SectionSummary'

interface SummaryViewProps {
  paper: PaperData
}

export function SummaryView({ paper }: SummaryViewProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{paper.title}</h2>
        {paper.authors.length > 0 && (
          <p className="text-sm text-gray-600">
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
          />
        ))}
      </div>
    </div>
  )
}
