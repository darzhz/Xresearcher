import { useState } from 'react'

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
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="arxiv" className="block text-sm font-medium text-gray-700 mb-2">
            Enter arXiv Paper ID
          </label>
          <input
            id="arxiv"
            type="text"
            placeholder="e.g., 2301.12345 or 2301.12345v1"
            value={arxivId}
            onChange={(e) => setArxivId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-2">
            Find papers at <a href="https://arxiv.org" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">arxiv.org</a>
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !arxivId.trim()}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Analyze Paper'}
        </button>
      </form>

      <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="text-indigo-600 mr-3">1.</span>
            <span>Paste an arXiv paper ID and let the app fetch the HTML-rendered paper</span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-3">2.</span>
            <span>The paper's sections are extracted and organized for easy browsing</span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-3">3.</span>
            <span>Click any section to generate an AI-powered summary</span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-3">4.</span>
            <span>Listen to the summary with your browser's speech synthesis</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
