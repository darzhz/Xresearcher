import { useState, useEffect } from 'react'
import { NavBar } from './components/NavBar'
import { InboxView } from './components/InboxView'
import { LibraryView } from './components/LibraryView'
import { PaperInput } from './components/PaperInput'
import { PaperOutline } from './components/PaperOutline'
import { SummaryView } from './components/SummaryView'
import { ModelDownloadModal } from './components/ModelDownloadModal'
import { useOPFS } from './hooks/useOPFS'
import { useLLM } from './hooks/useLLM'
import type { PaperData, AppView } from './types'
import type { ModelConfig } from './lib/models'
import { fetchAr5ivPaper } from './lib/arxiv'
import { loadPaperFromOPFS, initializePaperStorage } from './lib/paperStorage'

function App() {
  const [activeView, setActiveView] = useState<AppView>('inbox')
  const [readerPaper, setReaderPaper] = useState<PaperData | null>(null)
  const [readerLoading, setReaderLoading] = useState(false)
  const [readerError, setReaderError] = useState<string | null>(null)
  const [showModelModal, setShowModelModal] = useState(true)
  const opfsHooks = useOPFS()
  const { initialized, error: llmError, initProgress, initLoadingPercent, isDownloading, activeModel, downloadModel, summarize } = useLLM()

  // Initialize OPFS and paperStorage on mount
  useEffect(() => {
    const init = async () => {
      await opfsHooks.initializeOPFS()
      initializePaperStorage({
        savePaperHTML: opfsHooks.savePaperHTML,
        getPaperHTML: opfsHooks.getPaperHTML,
        savePaperIndex: opfsHooks.savePaperIndex,
        getPaperIndex: opfsHooks.getPaperIndex,
        paperExists: opfsHooks.paperExists,
        deletePaperFiles: opfsHooks.deletePaperFiles
      })
    }
    init()
  }, [opfsHooks])

  /**
   * Open a paper in reader mode.
   * Tries OPFS first (offline), falls back to network.
   */
  const handleOpenPaper = async (arxivId: string) => {
    setReaderLoading(true)
    setReaderError(null)
    try {
      // Try to load from OPFS first (offline)
      let paperData = await loadPaperFromOPFS(arxivId)

      // If not cached, fetch from ar5iv (network)
      if (!paperData) {
        paperData = await fetchAr5ivPaper(arxivId)
      }

      setReaderPaper(paperData)
      setActiveView('reader')
    } catch (err) {
      setReaderError(err instanceof Error ? err.message : 'Failed to load paper')
    } finally {
      setReaderLoading(false)
    }
  }

  /**
   * Handle paper submission from PaperInput (direct ID search).
   */
  const handlePaperInputSubmit = async (arxivId: string) => {
    await handleOpenPaper(arxivId)
  }

  const handleExitReader = () => {
    setReaderPaper(null)
    setActiveView('inbox')
  }

  const handleDownloadModel = (config: ModelConfig) => {
    downloadModel(config)
  }

  const handleSkipDownload = () => {
    setShowModelModal(false)
  }

  const handleRetryDownload = () => {
    setShowModelModal(true)
  }

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-editorial selection:text-paper">
      {/* Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] newsprint-texture" />

      {/* Model Download Modal */}
      <ModelDownloadModal
        isOpen={showModelModal && !initialized}
        isDownloading={isDownloading}
        progress={initLoadingPercent}
        progressMessage={initProgress}
        error={llmError}
        currentModel={activeModel}
        onDownload={handleDownloadModel}
        onSkip={handleSkipDownload}
        onRetry={handleRetryDownload}
      />

      <NavBar
        activeTab={activeView as Exclude<AppView, 'reader'>}
        onTabChange={(tab) => setActiveView(tab as AppView)}
        isReaderMode={activeView === 'reader'}
        onExitReader={handleExitReader}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {activeView === 'inbox' && (
            <div className="newsprint-grid bg-paper">
              <InboxView onOpenPaper={handleOpenPaper} />
            </div>
          )}

          {activeView === 'library' && (
            <div className="newsprint-grid bg-paper">
              <LibraryView onOpenPaper={handleOpenPaper} />
            </div>
          )}

          {activeView === 'reader' && readerPaper ? (
            <div className="flex flex-col gap-12">
              

              {/* Reader grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border-ink border-l border-t">
                <aside className="lg:col-span-1 border-ink border-r border-b p-6 bg-paper/50">
                  <div className="sticky top-32">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-4">Navigation Index</p>
                    <PaperOutline paper={readerPaper} />
                  </div>
                </aside>
                <div className="lg:col-span-3 border-ink border-r border-b p-6 sm:p-10 bg-paper">
                   <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-6">Editorial Summary — Ref. {readerPaper.arxivId}</p>
                  <SummaryView 
                    paper={readerPaper} 
                    initialized={initialized}
                    llmError={llmError}
                    summarize={summarize}
                  />
                </div>
              </div>
              {/* Paper search bar in reader */}
              <div className="border-4 border-ink p-6 sm:p-10 bg-paper hard-shadow-hover transition-all">
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-8 w-2 bg-editorial" />
                  <h2 className="font-mono uppercase tracking-[0.2em] text-sm font-bold">Document Archive Query</h2>
                </div>
                <PaperInput
                  onSubmit={handlePaperInputSubmit}
                  loading={readerLoading}
                  error={readerError}
                />
              </div>
            </div>
          ) : activeView === 'reader' && readerLoading ? (
            <div className="flex items-center justify-center py-20 sm:py-32">
              <div className="border-2 border-ink p-12 bg-paper text-center max-w-sm w-full">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-4 border-divider border-t-ink animate-spin" />
                  <p className="font-mono uppercase tracking-widest text-xs font-bold">Retrieving Publication...</p>
                </div>
              </div>
            </div>
          ) : activeView === 'reader' && readerError ? (
            <div className="max-w-2xl mx-auto">
              <div className="border-4 border-editorial p-8 sm:p-12 bg-paper">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-editorial flex items-center justify-center text-paper font-bold text-2xl">!</div>
                  <h2 className="text-3xl font-display font-black uppercase text-editorial">Access Denied</h2>
                </div>
                <p className="font-body text-lg mb-8 text-ink/80 leading-relaxed italic">{readerError}</p>
                <button
                  onClick={handleExitReader}
                  className="px-8 py-4 bg-ink text-paper hover:bg-editorial transition-colors font-mono uppercase tracking-widest text-sm font-bold"
                >
                  Return to Archive
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t-4 border-ink mt-20 bg-paper py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-ink border-l border-t newsprint-grid">
          <div className="p-8">
             <h3 className="font-display font-black text-2xl uppercase mb-4">xresearcher</h3>
             <p className="text-sm text-ink/60 italic">A modern publication dedicated to the dissemination of AI-summarized scientific knowledge.</p>
          </div>
          <div className="p-8">
             <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] font-black mb-4">Contact</h4>
             <p className="text-xs font-mono">hi@darzh.xyz</p>
          </div>
          <div className="p-8">
             <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] font-black mb-4">Edition</h4>
             <p className="text-xs font-mono">v0.1.0-alpha</p>
             <p className="text-xs font-mono">Digital Research Newsprint Aggregator</p>
          </div>
          <div className="p-8 bg-editorial/5">
             <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] font-black mb-4 text-editorial">Notice</h4>
             <p className="text-[10px] leading-relaxed">All summaries are generated by on-device AI. Accuracy is subject to model parameters.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
