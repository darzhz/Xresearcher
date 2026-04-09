import { ExternalLink } from 'lucide-react'
import { PaperData } from '../types'

interface PaperOutlineProps {
  paper: PaperData
}

export function PaperOutline({ paper }: PaperOutlineProps) {
  return (
    <div className="sticky top-24 space-y-4">
      <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-5 hover:border-cyan-500/40 transition-all duration-300">
        <h2 className="text-lg font-semibold text-cyan-100 mb-4">Paper Info</h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Title</p>
            <p className="text-sm font-medium text-cyan-100 mt-2 line-clamp-3">
              {paper.title}
            </p>
          </div>

          {paper.authors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Authors</p>
              <p className="text-sm text-cyan-300/80 mt-2 line-clamp-2">
                {paper.authors.join(', ')}
              </p>
            </div>
          )}

          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors group"
          >
            View on ar5iv
            <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>

      <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-5 hover:border-cyan-500/40 transition-all duration-300">
        <h3 className="text-lg font-semibold text-cyan-100 mb-4">Sections</h3>

        <nav className="space-y-1 max-h-96 overflow-y-auto">
          {paper.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block px-3 py-2.5 text-sm text-cyan-300/80 hover:text-cyan-200 hover:bg-white/10 rounded-lg truncate transition-all duration-300 border border-transparent hover:border-cyan-500/30"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
