import type { ArxivMetadata, ArxivSearchParams } from '../types'

const ARXIV_API = 'https://export.arxiv.org/api/query?'
const CORS_PROXIES = [
  'https://proxie.darsh2001rocks.workers.dev/?url=',
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
]

/**
 * Fetch with automatic CORS fallback.
 * Tries direct fetch first; if it fails, retries through CORS proxies.
 */
async function withCORSFallback(url: string): Promise<Response> {
  // First, try direct fetch
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8'
      }
    })
    if (response.ok) {
      return response
    }
  } catch (error) {
    console.warn('Direct fetch failed, trying CORS proxy...', error)
  }

  // Try each CORS proxy in sequence
  for (const proxyBase of CORS_PROXIES) {
    try {
      const encoded = encodeURIComponent(url)
      const proxyUrl = `${proxyBase}${encoded}`
      const proxyResponse = await fetch(proxyUrl)

      if (!proxyResponse.ok) {
        console.warn(`Proxy ${proxyBase} failed with status ${proxyResponse.status}`)
        continue
      }

      // Handle different proxy response formats
      let content: string

      if (proxyBase.includes('allorigins')) {
        const data = await proxyResponse.json()
        content = data.contents
      } else if (proxyBase.includes('corsproxy')) {
        content = await proxyResponse.text()
      } else {
        content = await proxyResponse.text()
      }

      return new Response(content, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    } catch (error) {
      console.warn(`Proxy ${proxyBase} error:`, error)
      continue
    }
  }

  // All proxies failed
  throw new Error('CORS error: Unable to reach arXiv API. Please check your internet connection or try again later.')
}

/**
 * Parse Atom/XML feed from arXiv API into normalized metadata.
 */
function parseAtomFeed(xmlText: string): ArxivMetadata[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  if (doc.documentElement.tagName === 'parsererror') {
    console.error('XML parse error:', doc.documentElement.textContent)
    return []
  }

  const entries = doc.querySelectorAll('entry')
  const papers: ArxivMetadata[] = []

  entries.forEach((entry) => {
    try {
      const idElement = entry.querySelector('id')
      const rawId = idElement?.textContent?.trim() || ''
      const id = normalizeArxivId(rawId)

      const title = entry.querySelector('title')?.textContent?.trim()
        .replace(/\n\s+/g, ' ') || 'Untitled'

      const authors: string[] = []
      entry.querySelectorAll('author > name').forEach((author) => {
        const name = author.textContent?.trim()
        if (name) authors.push(name)
      })

      const published = entry.querySelector('published')?.textContent?.slice(0, 10) || ''

      const summary = entry.querySelector('summary')?.textContent?.trim()
        .replace(/\n\s+/g, ' ') || ''

      const categories: string[] = []
      entry.querySelectorAll('category').forEach((cat) => {
        const term = cat.getAttribute('term')
        if (term) categories.push(term)
      })

      const pdfLink = entry.querySelector('link[title="pdf"]')
      const pdfUrl = pdfLink?.getAttribute('href') || ''

      const htmlUrl = `https://arxiv.org/html/${id}`

      if (id) {
        papers.push({
          id,
          title,
          authors,
          published,
          summary,
          categories,
          pdfUrl,
          htmlUrl
        })
      }
    } catch (error) {
      console.error('Error parsing entry:', error)
    }
  })

  return papers
}

/**
 * Normalize arXiv ID by stripping URL prefix.
 */
function normalizeArxivId(rawId: string): string {
  const match = rawId.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/)
  return match ? match[1] : rawId
}

/**
 * Build arXiv API query string from search params.
 */
function buildArxivQuery(params: ArxivSearchParams): string {
  const parts: string[] = []

  if (params.categories && params.categories.length > 0) {
    const catQuery = params.categories.map(cat => `cat:${cat}`).join('+OR+')
    parts.push(`(${catQuery})`)
  }

  if (params.authors && params.authors.length > 0) {
    const authQuery = params.authors.map(au => `au:"${au}"`).join('+OR+')
    parts.push(`(${authQuery})`)
  }

  if (params.abstract) {
    parts.push(`abs:"${params.abstract}"`)
  }

  if (params.query) {
    parts.push(`all:${params.query}`)
  }

  const search = parts.length > 0 ? `search_query=${parts.join('+AND+')}` : 'search_query=all'

  const sortBy = params.sortBy || 'submittedDate'
  const sortOrder = params.sortOrder || 'descending'
  const maxResults = params.maxResults || 20
  const start = params.start || 0

  return `${search}&sortBy=${sortBy}&sortOrder=${sortOrder}&start=${start}&max_results=${maxResults}`
}

/**
 * Search arXiv papers with filters.
 */
export async function searchArxiv(params: ArxivSearchParams): Promise<ArxivMetadata[]> {
  const query = buildArxivQuery(params)
  const url = `${ARXIV_API}${query}`

  try {
    const response = await withCORSFallback(url)
    const xmlText = await response.text()
    return parseAtomFeed(xmlText)
  } catch (error) {
    console.error('ArXiv search failed:', error)
    return []
  }
}

/**
 * Get daily feed of new papers by categories.
 */
export async function fetchDailyFeed(
  categories: string[],
  maxResults = 20
): Promise<ArxivMetadata[]> {
  if (categories.length === 0) {
    return []
  }

  return searchArxiv({
    categories,
    sortBy: 'submittedDate',
    sortOrder: 'descending',
    maxResults
  })
}

function detectSectionType(title: string, id: string): 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion' | 'references' | 'other' {
  const t = title.toLowerCase()
  const i = id.toLowerCase()

  if (t.includes('abstract') || i.includes('abstract')) return 'abstract'
  if (t.includes('introduction') || i.includes('introduction')) return 'introduction'
  if (t.includes('method') || t.includes('approach') || t.includes('experiment') || i.includes('method')) return 'methodology'
  if (t.includes('result') || t.includes('finding') || i.includes('result')) return 'results'
  if (t.includes('discussion') || i.includes('analysis') || i.includes('discussion')) return 'discussion'
  if (t.includes('conclusion') || i.includes('conclusion')) return 'conclusion'
  if (t.includes('reference') || t.includes('bibliography') || i.includes('bib')) return 'references'
  
  return 'other'
}

/**
 * Fetch paper HTML from ar5iv and parse it into PaperData.
 */
export async function fetchAr5ivPaper(arxivId: string) {
  const ar5ivUrl = `https://arxiv.org/html/${arxivId}`

  let response: Response
  try {
    response = await fetch(ar5ivUrl)
  } catch (error) {
    // If ar5iv fetch fails, try through CORS proxy
    console.warn('Direct ar5iv fetch failed, trying CORS proxy...')
    response = await withCORSFallback(ar5ivUrl)
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch paper: ${response.statusText}`)
  }

  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title = doc.querySelector('.ltx_title_document')?.textContent?.trim() || 'Untitled'

  // Target the specific person name class used by LaTeXML/ar5iv
  const authors = Array.from(doc.querySelectorAll('.ltx_personname'))
    .map(el => el.textContent?.trim())
    .filter(Boolean) as string[]

  // Handle sections more accurately
  const sections = Array.from(doc.querySelectorAll('section, .ltx_section, .ltx_abstract')).map(section => {
    const id = section.id || `section-${Math.random()}`
    const sTitle = section.querySelector('.ltx_title, h1, h2, h3')?.textContent?.trim() || 
                  (section.classList.contains('ltx_abstract') ? 'Abstract' : 'Untitled')
    const content = section.textContent || ''
    
    return {
      id,
      title: sTitle,
      content,
      full_text: content,
      type: detectSectionType(sTitle, id)
    }
  })

  return {
    id: arxivId,
    title,
    authors,
    sections,
    url: ar5ivUrl,
    fetchedAt: new Date()
  }
}
