import { useState } from 'react'
import { Send, AlertCircle, Info } from 'lucide-react'

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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="arxiv" className="block font-mono text-[10px] uppercase font-black tracking-[0.2em] text-ink/60">
            Document Archive Identifier (arXiv ID)
          </label>
          <div className="relative group">
            <input
              id="arxiv"
              type="text"
              placeholder="e.g., 2301.12345"
              value={arxivId}
              onChange={(e) => setArxivId(e.target.value)}
              className="w-full px-4 py-4 border-b-2 border-ink bg-transparent font-mono text-lg focus:outline-none focus:bg-neutral-100 transition-colors placeholder:text-ink/20"
              disabled={loading}
            />
            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-editorial group-focus-within:w-full transition-all duration-500" />
          </div>
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-tight">
            Reference source: {' '}
            <a
              href="https://arxiv.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink hover:text-editorial underline transition-colors"
            >
              ARCHIVE.ORG / ARXIV
            </a>
          </p>
        </div>

        {error && (
          <div className="p-4 border-2 border-editorial bg-editorial/5 flex items-start gap-3">
            <AlertCircle size={18} className="text-editorial mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-mono font-black uppercase text-editorial tracking-widest">Access Error</p>
              <p className="text-sm font-body text-ink/80 leading-snug">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !arxivId.trim()}
          className="group relative w-full py-4 bg-ink text-paper hover:bg-editorial transition-colors disabled:opacity-30 disabled:hover:bg-ink"
        >
          <div className="flex items-center justify-center gap-3 relative z-10 font-mono text-[10px] uppercase font-black tracking-[0.2em]">
            <Send size={14} />
            <span>{loading ? 'Retrieving Publication...' : 'Fetch & Analyze Document'}</span>
          </div>
          <div className="absolute inset-0 border-2 border-ink group-hover:border-editorial translate-x-1 translate-y-1 -z-0 transition-colors" />
        </button>
      </form>

      {/* Protocol Box */}
      <div className="mt-12 bg-neutral-100 border border-ink p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <Info size={120} strokeWidth={1} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6 border-b border-ink/10 pb-4">
            <Info size={20} className="text-ink" />
            <h2 className="text-xl font-display font-black uppercase tracking-tight italic text-ink">Operational Protocol</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {[
              { step: "01", title: "Archive Retrieval", desc: "Submit an arXiv ID to trigger a secure fetch of the HTML-rendered document from our distributed mirrors." },
              { step: "02", title: "Structural Analysis", desc: "Our engine decomposes the document into its constituent sections, maintaining original editorial hierarchy." },
              { step: "03", title: "Synthesized Digest", desc: "Select any chapter to initiate on-device AI synthesis, producing a concise editorial summary." },
              { step: "04", title: "Auditory Playback", desc: "Enable the auditory relay to listen to synthesized summaries via local speech processing." }
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-black bg-ink text-paper px-1.5 py-0.5">{item.step}</span>
                  <h3 className="font-display font-bold text-sm uppercase tracking-tight italic">{item.title}</h3>
                </div>
                <p className="text-xs font-body text-ink/70 leading-relaxed text-justify">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
