import { useState } from 'react'
import { Send, AlertCircle, Zap } from 'lucide-react'

interface PaperInputProps {
  onSubmit: (arxivId: string) => void
  loading: boolean
  error: string | null
}

export function PaperInput({ onSubmit, loading, error }: PaperInputProps) {
  const [arxivId, setArxivId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (arxivId.trim()) {
      onSubmit(arxivId.trim())
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="arxiv" className="block text-sm font-medium text-cyan-300 mb-2">
            arXiv Paper ID
          </label>
          <input
            id="arxiv"
            type="text"
            placeholder="e.g., 2301.12345 or 2301.12345v1"
            value={arxivId}
            onChange={(e) => setArxivId(e.target.value)}
            className="w-full px-4 py-3 border border-cyan-500/30 bg-white/5 text-cyan-100 placeholder-cyan-300/50 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all duration-300"
            disabled={loading}
          />
          <p className="text-xs text-cyan-300/60 mt-2">
            Find papers at{' '}
            <a
              href="https://arxiv.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              arxiv.org
            </a>
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !arxivId.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-500 disabled:to-slate-600 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <Send size={18} />
          <span>{loading ? 'Analyzing...' : 'Analyze Paper'}</span>
        </button>
      </form>

      <div className="mt-8 backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-cyan-400" />
          <h2 className="text-lg font-semibold text-cyan-100">How it works</h2>
        </div>
        <ul className="space-y-3 text-sm text-cyan-300/80">
          <li className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold min-w-fit">1.</span>
            <span>Paste an arXiv paper ID and let the app fetch the HTML-rendered paper</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold min-w-fit">2.</span>
            <span>The paper's sections are extracted and organized for easy browsing</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold min-w-fit">3.</span>
            <span>Click any section to generate an AI-powered summary</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold min-w-fit">4.</span>
            <span>Listen to the summary with your browser's speech synthesis</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
