import { PaperData } from '../types'

interface PaperOutlineProps {
  paper: PaperData
}

export function PaperOutline({ paper }: PaperOutlineProps) {
  return (
    <div className="sticky top-8 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Paper Info</h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</p>
            <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-3">
              {paper.title}
            </p>
          </div>

          {paper.authors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Authors</p>
              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                {paper.authors.join(', ')}
              </p>
            </div>
          )}

          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-indigo-600 hover:underline"
          >
            View on ar5iv →
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sections</h3>

        <nav className="space-y-2">
          {paper.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 rounded-lg truncate transition-colors"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
