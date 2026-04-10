import { ExternalLink, Info, List } from 'lucide-react'
import { PaperData } from '../types'

interface PaperOutlineProps {
  paper: PaperData
}

export function PaperOutline({ paper }: PaperOutlineProps) {
  return (
    <div className="space-y-8">
      {/* Paper Metadata Block */}
      <div className="bg-paper border-2 border-ink p-6 relative">
        <div className="flex items-center gap-2 mb-6 border-b border-divider pb-3">
          <Info size={16} className="text-ink" />
          <h2 className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/60">Publication Metadata</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase font-black text-editorial tracking-tighter">Archive Title</p>
            <p className="text-sm font-display font-bold leading-tight italic">
              {paper.title}
            </p>
          </div>

          {paper.authors.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[9px] uppercase font-black text-editorial tracking-tighter">Contributor Registry</p>
              <p className="text-xs font-sans font-semibold text-ink/60 leading-relaxed uppercase tracking-wide">
                {paper.authors.join('; ')}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-divider">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group font-mono text-[10px] uppercase font-black tracking-widest text-ink hover:text-editorial transition-colors"
            >
              <span>Source Repository</span>
              <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Sections Index Block */}
      <div className="bg-paper border-2 border-ink p-6 relative">
        <div className="flex items-center gap-2 mb-6 border-b border-divider pb-3">
          <List size={16} className="text-ink" />
          <h2 className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/60">Chapter Directory</h2>
        </div>

        <nav className="space-y-px newsprint-grid border-ink border-l border-t max-h-[50vh] overflow-y-auto">
          {paper.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block px-4 py-3 text-xs font-mono font-black uppercase tracking-tight text-ink/60 hover:bg-ink hover:text-paper transition-colors truncate border-r border-b border-ink"
            >
              <span className="text-editorial mr-2">§</span>
              {section.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
