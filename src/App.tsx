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
import { fetchAr5ivPaper } from './lib/arxiv'
import { loadPaperFromOPFS, initializePaperStorage } from './lib/paperStorage'

function App() {
  const [activeView, setActiveView] = useState<AppView>('inbox')
  const [readerPaper, setReaderPaper] = useState<PaperData | null>(null)
  const [readerLoading, setReaderLoading] = useState(false)
  const [readerError, setReaderError] = useState<string | null>(null)
  const [showModelModal, setShowModelModal] = useState(true)
  const opfsHooks = useOPFS()
  const { initialized, error: llmError, initProgress, initLoadingPercent, isDownloading, downloadModel } = useLLM()

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

  const handleDownloadModel = () => {
    downloadModel()
  }

  const handleSkipDownload = () => {
    setShowModelModal(false)
  }

  const handleRetryDownload = () => {
    setShowModelModal(true)
    downloadModel()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Model Download Modal */}
      <ModelDownloadModal
        isOpen={showModelModal && !initialized}
        isDownloading={isDownloading}
        progress={initLoadingPercent}
        progressMessage={initProgress}
        error={llmError}
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'inbox' && (
          <InboxView onOpenPaper={handleOpenPaper} />
        )}

        {activeView === 'library' && (
          <LibraryView onOpenPaper={handleOpenPaper} />
        )}

        {activeView === 'reader' && readerPaper ? (
          <div className="space-y-4">
            {/* Paper search bar in reader */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <PaperInput
                onSubmit={handlePaperInputSubmit}
                loading={readerLoading}
                error={readerError}
              />
            </div>

            {/* Reader grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <aside className="lg:col-span-1">
                <PaperOutline paper={readerPaper} />
              </aside>
              <div className="lg:col-span-3">
                <SummaryView paper={readerPaper} />
              </div>
            </div>
          </div>
        ) : activeView === 'reader' && readerLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading paper...</p>
          </div>
        ) : activeView === 'reader' && readerError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{readerError}</p>
            <button
              onClick={handleExitReader}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default App
