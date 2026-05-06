import { useState } from 'react'
import { Bookmark, BookmarkCheck, Trash2, Loader, Mic2 } from 'lucide-react'
import { PaperData, ArxivMetadata } from '../types'
import { SectionSummary } from './SectionSummary'
import { PodcastView } from './PodcastView'

interface SummaryViewProps {
  paper: PaperData
  metadata: ArxivMetadata | null
  isSaved: boolean
  onSave: () => Promise<void>
  onRemove?: () => Promise<void>
  initialized: boolean
  llmError: string | null
  summarize: (text: string, onToken?: (token: string) => void) => Promise<{ summary: string; metrics: any }>
  createPodcastScript?: (paper: PaperData, onToken?: (token: string) => void) => Promise<{ script: string; metrics: any }>
}

export function SummaryView({ 
  paper, 
  metadata,
  isSaved,
  onSave,
  onRemove,
  initialized, 
  llmError, 
  summarize,
  createPodcastScript
}: SummaryViewProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [podcastScript, setPodcastScript] = useState<string | null>(null)
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)
  const [showPodcast, setShowPodcast] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePodcast = async () => {
    if (podcastScript && !isGeneratingPodcast) {
      setShowPodcast(true)
      return
    }

    if (!createPodcastScript || !initialized) return

    setIsGeneratingPodcast(true)
    setShowPodcast(true)
    setPodcastScript('') // Start with empty string to trigger live display if we want
    const startTime = performance.now()
    try {
      const { script } = await createPodcastScript(paper, (token) => {
        setPodcastScript(prev => (prev || '') + token)
      })
      const duration = (performance.now() - startTime).toFixed(2)
      console.log(`[Podcast Script Generated in ${duration}ms]:`, script)
      setPodcastScript(script)
    } catch (err) {
      console.error('Failed to generate podcast script:', err)
      setPodcastScript(null)
      setShowPodcast(false)
    } finally {
      setIsGeneratingPodcast(false)
    }
  }

  return (
    <div className="space-y-12">
      {showPodcast && (podcastScript !== null) && (
        <PodcastView 
          paper={paper} 
          script={podcastScript} 
          isGenerating={isGeneratingPodcast}
          onClose={() => setShowPodcast(false)} 
        />
      )}

      {/* Title Header */}
      <div className="border-b-4 border-ink pb-8 relative group">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex-1 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-display font-black leading-[1.1] uppercase tracking-tighter italic">
              {paper.title}
            </h2>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {paper.authors.length > 0 && (
                <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-ink/60">
                  By {paper.authors.slice(0, 3).join(', ')}
                  {paper.authors.length > 3 && ` et al.`}
                </p>
              )}
              <div className="h-4 w-px bg-divider hidden sm:block" />
              <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-ink/60">
                Ref: {paper.arxivId}
              </p>
              <div className="h-4 w-px bg-divider hidden sm:block" />
              <button
                onClick={handleGeneratePodcast}
                disabled={!initialized || isGeneratingPodcast}
                className="flex items-center gap-2 font-mono text-[10px] uppercase font-black tracking-widest text-editorial hover:underline transition-all disabled:opacity-40"
              >
                {isGeneratingPodcast ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <Mic2 size={12} />
                )}
                <span>{isGeneratingPodcast ? 'Synthesizing Script...' : podcastScript ? 'Open Podcast' : 'Generate Podcast'}</span>
              </button>
            </div>
          </div>
          
          {metadata && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleSave}
                disabled={isSaved || isSaving}
                className={`flex items-center justify-center gap-2 px-6 py-3 border-2 border-ink font-mono text-xs uppercase font-black tracking-widest transition-all ${
                  isSaved 
                    ? 'bg-ink text-paper cursor-default' 
                    : 'bg-paper text-ink hover:bg-editorial hover:text-paper hover:border-editorial'
                } ${isSaving ? 'opacity-70' : ''}`}
              >
                {isSaving ? (
                  <Loader size={16} className="animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck size={16} />
                ) : (
                  <Bookmark size={16} />
                )}
                <span>{isSaving ? 'Archiving...' : isSaved ? 'Archived' : 'Save to Archive'}</span>
              </button>

              {isSaved && onRemove && (
                <button
                  onClick={onRemove}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-editorial text-editorial hover:bg-editorial hover:text-paper font-mono text-xs uppercase font-black tracking-widest transition-all"
                  title="Remove from Archive"
                >
                  <Trash2 size={16} />
                  <span className="sm:hidden">Remove</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-4 w-1 bg-editorial" />
          <h3 className="font-mono text-[10px] uppercase font-black tracking-[0.3em] text-ink/40">Synthesized Sections</h3>
        </div>
        
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
