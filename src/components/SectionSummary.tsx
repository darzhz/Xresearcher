import { useRef, useState } from 'react'
import { ChevronDown, Volume2, Loader, AlertCircle, Download, BookText, Sparkles } from 'lucide-react'
import { Section } from '../types'
import { splitIntoSentences, queueSpeechSentences } from '../lib/textChunking'

interface SectionSummaryProps {
  section: Section
  isExpanded: boolean
  onToggle: () => void
  initialized: boolean
  llmError: string | null
  summarize: (text: string, sectionId: string) => Promise<string>
}

type TabType = 'content' | 'summary'

export function SectionSummary({ 
  section, 
  isExpanded, 
  onToggle,
  initialized,
  llmError,
  summarize
}: SectionSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const speechControllerRef = useRef<{ cancel: () => void } | null>(null)

  const generateSummary = async () => {
    if (summary) return

    if (!initialized) {
      setError('Model is still loading. Please wait...')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await summarize(section.content, section.id)
      setSummary(result)
      setActiveTab('summary')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
      console.error('Failed to generate summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSpeech = async () => {
    if (isSpeaking) {
      speechControllerRef.current?.cancel()
      speechControllerRef.current = null
      setIsSpeaking(false)
      return
    }

    if (!summary) {
      await generateSummary()
    }

    if (summary) {
      setIsSpeaking(true)
      const sentences = splitIntoSentences(summary)
      speechControllerRef.current = queueSpeechSentences(sentences, () => {
        // Optional: track progress as sentences complete
      })

      // Listen for when all sentences finish
      const checkCompletion = setInterval(() => {
        if (window.speechSynthesis.speaking === false) {
          clearInterval(checkCompletion)
          setIsSpeaking(false)
          speechControllerRef.current = null
        }
      }, 100)
    }
  }

  return (
    <div
      id={section.id}
      className="bg-paper border-ink border hover:border-neutral-400 transition-colors"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 text-left hover:bg-neutral-50 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs font-black text-editorial opacity-40">§</span>
          <h3 className="text-xl font-display font-black uppercase tracking-tight group-hover:text-editorial transition-colors">
            {section.title}
          </h3>
        </div>
        <ChevronDown
          size={20}
          className={`text-ink transition-transform duration-300 group-hover:text-editorial ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-ink">
          {/* Tab Navigation */}
          <div className="flex border-b border-ink bg-neutral-50">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase font-black tracking-widest transition-colors border-r border-ink ${
                activeTab === 'content' ? 'bg-paper text-ink' : 'text-ink/40 hover:text-ink hover:bg-paper/50'
              }`}
            >
              <BookText size={12} />
              <span>Full Text</span>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase font-black tracking-widest transition-colors ${
                activeTab === 'summary' ? 'bg-paper text-ink' : 'text-ink/40 hover:text-ink hover:bg-paper/50'
              }`}
            >
              <Sparkles size={12} className={summary ? 'text-editorial' : ''} />
              <span>Editorial Summary</span>
            </button>
          </div>

          <div className="px-6 py-8 space-y-6">
            {activeTab === 'content' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                   <p className="font-mono text-[9px] uppercase font-black text-ink/30 tracking-[0.2em]">Original Manuscript Extract</p>
                   {!summary && initialized && (
                     <button 
                       onClick={generateSummary}
                       className="font-mono text-[9px] uppercase font-black text-editorial hover:underline tracking-widest"
                     >
                       Synthesize Summary →
                     </button>
                   )}
                </div>
                <div 
                  className="font-body text-ink/90 leading-relaxed text-justify hyphens-auto prose-sm max-w-none prose-p:mb-4"
                  dangerouslySetInnerHTML={{ __html: section.content }} 
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* LLM initialization status */}
                {!initialized && (
                  <div className="p-4 border-2 border-divider bg-divider/10 flex items-start gap-4">
                    <Loader size={20} className="text-ink animate-spin flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-black uppercase tracking-widest">System Notice</p>
                      <p className="text-sm font-body italic text-ink/70">
                        Initializing local AI engine for summarization. This may take a moment on first run.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error messages */}
                {(llmError || error) && (
                  <div className="p-4 border-2 border-editorial bg-editorial/5 flex items-start gap-4">
                    <AlertCircle size={20} className="text-editorial flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-black uppercase text-editorial tracking-widest">Editorial Error</p>
                      <p className="text-sm font-body text-ink/80">{llmError || error}</p>
                    </div>
                  </div>
                )}

                {/* Summary display */}
                {summary ? (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="relative">
                      <div className="absolute -left-2 top-0 w-1 h-full bg-editorial opacity-20" />
                      <p className="text-lg font-body text-ink leading-relaxed text-justify editorial-drop-cap italic">
                        {summary}
                      </p>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-divider">
                      <button
                        onClick={toggleSpeech}
                        className={`flex items-center gap-3 px-6 py-3 font-mono text-[10px] uppercase font-black tracking-[0.2em] transition-all ${
                          isSpeaking
                            ? 'bg-editorial text-paper'
                            : 'bg-ink text-paper hover:bg-editorial'
                        }`}
                      >
                        <Volume2 size={14} />
                        <span>{isSpeaking ? 'Halt Audio' : 'Play Audio'}</span>
                      </button>
                    </div>
                  </div>
                ) : !initialized ? (
                  <div className="p-8 border-2 border-divider border-dashed text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Download size={24} className="text-ink/20" />
                      <div className="space-y-2">
                        <p className="text-sm font-display font-black uppercase tracking-widest">Model Required</p>
                        <p className="text-[10px] font-mono text-ink/40 max-w-xs mx-auto">
                          A compatible AI model must be installed locally to perform editorial summarization.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <button
                      onClick={generateSummary}
                      disabled={loading || !!error}
                      className="group relative px-8 py-4 bg-ink text-paper hover:bg-editorial transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 relative z-10 font-mono text-[10px] uppercase font-black tracking-[0.2em]">
                        {loading ? (
                          <>
                            <Loader size={14} className="animate-spin" />
                            <span>Synthesizing...</span>
                          </>
                        ) : (
                          <span>Generate Editorial Summary</span>
                        )}
                      </div>
                      <div className="absolute inset-0 border-2 border-ink group-hover:border-editorial translate-x-1 translate-y-1 -z-0 transition-colors" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
