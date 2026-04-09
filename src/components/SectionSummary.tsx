import { useState } from 'react'
import { Section } from '../types'
import { useLLM } from '../hooks/useLLM'

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
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    if (!summary) {
      await generateSummary()
    }

    if (summary) {
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(summary)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div
      id={section.id}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
          {/* LLM initialization status */}
          {!initialized && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Loading AI model... This only happens once.
              </p>
            </div>
          )}

          {/* Error messages */}
          {llmError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{llmError}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Summary display */}
          {summary ? (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">{summary}</p>
              </div>
              <button
                onClick={toggleSpeech}
                className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isSpeaking
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
              </button>
            </div>
          ) : !initialized ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-sm text-amber-700 mb-3">
                AI model not downloaded yet. Download it to enable summarization.
              </p>
              <p className="text-xs text-amber-600">
                You'll see the download dialog at the top of the page.
              </p>
            </div>
          ) : (
            <button
              onClick={generateSummary}
              disabled={loading || !!error}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '⏳ Summarizing...' : 'Generate Summary'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
