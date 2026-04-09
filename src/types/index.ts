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
