import { useState, useEffect } from 'react'
import { PaperInput } from './components/PaperInput'
import { PaperOutline } from './components/PaperOutline'
import { SummaryView } from './components/SummaryView'
import { useOPFS } from './hooks/useOPFS'
import type { PaperData } from './types'

function App() {
  const [paper, setPaper] = useState<PaperData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { initializeOPFS } = useOPFS()

  useEffect(() => {
    initializeOPFS()
  }, [initializeOPFS])

  const handlePaperSubmit = async (arxivId: string) => {
    setLoading(true)
    setError(null)
    try {
      const paperData = await fetchAr5ivPaper(arxivId)
      setPaper(paperData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch paper')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            ArXiv Local-Voice
          </h1>
          <p className="text-gray-600 mt-2">
            Privacy-centric research summarizer with on-device AI
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!paper ? (
          <PaperInput onSubmit={handlePaperSubmit} loading={loading} error={error} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <PaperOutline paper={paper} />
            </aside>
            <div className="lg:col-span-3">
              <SummaryView paper={paper} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

async function fetchAr5ivPaper(arxivId: string): Promise<PaperData> {
  const ar5ivUrl = `https://ar5iv.org/html/${arxivId}`

  const response = await fetch(ar5ivUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch paper: ${response.statusText}`)
  }

  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title = doc.querySelector('h1')?.textContent?.trim() || 'Untitled'
  const authors = Array.from(doc.querySelectorAll('[class*="author"]'))
    .map(el => el.textContent?.trim())
    .filter(Boolean) as string[]

  const sections = Array.from(doc.querySelectorAll('section')).map(section => ({
    id: section.id || `section-${Math.random()}`,
    title: section.querySelector('h1, h2, h3')?.textContent?.trim() || 'Untitled',
    content: section.textContent || ''
  }))

  return {
    id: arxivId,
    title,
    authors,
    sections,
    url: ar5ivUrl,
    fetchedAt: new Date()
  }
}

export default App
