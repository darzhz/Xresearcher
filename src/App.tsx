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
  const { initialized, error: llmError, initProgress, initLoadingPercent, isDownloading, activeModel, downloadModel } = useLLM()

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-purple-500/20 blur-3xl" />
      </div>

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

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-7xl mx-auto">
          {activeView === 'inbox' && (
            <InboxView onOpenPaper={handleOpenPaper} />
          )}

          {activeView === 'library' && (
            <LibraryView onOpenPaper={handleOpenPaper} />
          )}

          {activeView === 'reader' && readerPaper ? (
            <div className="space-y-6">
              {/* Paper search bar in reader */}
              <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-xl p-4 sm:p-6 shadow-2xl hover:border-cyan-500/40 transition-all duration-300">
                <PaperInput
                  onSubmit={handlePaperInputSubmit}
                  loading={readerLoading}
                  error={readerError}
                />
              </div>

              {/* Reader grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <aside className="lg:col-span-1">
                  <PaperOutline paper={readerPaper} />
                </aside>
                <div className="lg:col-span-3">
                  <SummaryView paper={readerPaper} />
                </div>
              </div>
            </div>
          ) : activeView === 'reader' && readerLoading ? (
            <div className="flex items-center justify-center py-20 sm:py-32">
              <div className="backdrop-blur-md bg-white/5 border border-cyan-500/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                  <p className="text-center text-cyan-300 font-medium">Loading paper...</p>
                </div>
              </div>
            </div>
          ) : activeView === 'reader' && readerError ? (
            <div className="max-w-2xl mx-auto">
              <div className="backdrop-blur-md bg-red-500/10 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <p className="text-red-300 text-sm sm:text-base mb-6">{readerError}</p>
                <button
                  onClick={handleExitReader}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-medium rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                >
                  ← Back
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default App
