export interface Section {
  id: string
  title: string
  content: string
}

export interface PaperData {
  id: string
  title: string
  authors: string[]
  sections: Section[]
  url: string
  fetchedAt: Date
  summary?: string
  arxivId?: string
}

export interface LLMState {
  loaded: boolean
  model?: string
  error?: string
}

export interface SummarySection {
  sectionId: string
  summary: string
  audio?: Blob
}

export interface ArxivMetadata {
  id: string
  title: string
  authors: string[]
  published: string
  summary: string
  categories: string[]
  pdfUrl: string
  htmlUrl: string
}

export interface SavedPaper extends ArxivMetadata {
  savedAt: number
  collectionIds: number[]
  opfsReady: boolean
}

export interface Collection {
  id?: number
  name: string
  createdAt: number
}

export interface InterestCategory {
  category: string
  addedAt: number
}

export interface PageIndex {
  [sectionId: string]: {
    title: string
    content: string
  }
}

export type AppView = 'inbox' | 'library' | 'reader'

export interface ArxivSearchParams {
  query?: string
  categories?: string[]
  authors?: string[]
  abstract?: string
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate'
  sortOrder?: 'ascending' | 'descending'
  maxResults?: number
  start?: number
}
