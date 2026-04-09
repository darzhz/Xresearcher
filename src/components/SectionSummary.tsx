import { useRef, useState } from 'react'
import { ChevronDown, Volume2, Loader, AlertCircle, Download } from 'lucide-react'
import { Section } from '../types'
import { useLLM } from '../hooks/useLLM'
import { splitIntoSentences, queueSpeechSentences } from '../lib/textChunking'

interface SectionSummaryProps {
  section: Section
  isExpanded: boolean
  onToggle: () => void
}

export function SectionSummary({ section, isExpanded, onToggle }: SectionSummaryProps) {
  const { initialized, error: llmError, summarize } = useLLM()
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl overflow-hidden hover:border-cyan-500/40 transition-all duration-300"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors flex items-center justify-between group"
      >
        <h3 className="text-lg font-semibold text-cyan-100 group-hover:text-cyan-300 transition-colors">
          {section.title}
        </h3>
        <ChevronDown
          size={20}
          className={`text-cyan-400 transition-transform duration-300 group-hover:text-cyan-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-cyan-500/20 px-6 py-4 space-y-4">
          {/* LLM initialization status */}
          {!initialized && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-start gap-3">
              <Loader size={18} className="text-cyan-400 mt-0.5 animate-spin flex-shrink-0" />
              <p className="text-sm text-cyan-300">
                Loading AI model... This only happens once.
              </p>
            </div>
          )}

          {/* Error messages */}
          {llmError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{llmError}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Summary display */}
          {summary ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-sm text-cyan-100 leading-relaxed">{summary}</p>
              </div>
              <button
                onClick={toggleSpeech}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300 ${
                  isSpeaking
                    ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-500/40 text-cyan-300 hover:from-cyan-500/40 hover:to-purple-500/40'
                }`}
              >
                <Volume2 size={18} />
                <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
              </button>
            </div>
          ) : !initialized ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Download size={18} className="text-amber-400" />
                <p className="text-sm text-amber-300 font-medium">
                  AI model not downloaded yet
                </p>
              </div>
              <p className="text-xs text-amber-300/70">
                Download it to enable instant summarization.
              </p>
            </div>
          ) : (
            <button
              onClick={generateSummary}
              disabled={loading || !!error}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-500 disabled:to-slate-600 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <span>Summarizing...</span>
                </>
              ) : (
                <span>Generate Summary</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
