import { PageIndex } from '../types'
import { db } from './db'

/**
 * Create a PageIndex from a parsed ar5iv document or PaperData.
 */
export const createPageIndex = (id: string, sections: any[]): PageIndex => {
  return {
    id,
    sections: sections.map(sec => ({
      id: sec.id,
      title: sec.title || 'Untitled Section',
      content: sec.content || '',
      tokenCount: Math.ceil((sec.content || '').length / 4), // Rough estimate: 4 chars per token
      type: sec.type
    }))
  }
}

/**
 * Save a PageIndex to Dexie.
 */
export const savePageIndex = async (index: PageIndex): Promise<void> => {
  await db.pageIndices.put(index)
}

/**
 * Get a PageIndex from Dexie.
 */
export const getPageIndex = async (id: string): Promise<PageIndex | undefined> => {
  return db.pageIndices.get(id)
}

/**
 * Basic keyword-based relevance matching for section selection.
 */
export const isRelevant = (query: string, section: { title: string; content: string }): boolean => {
  const q = query.toLowerCase()
  const t = section.title.toLowerCase()
  const c = section.content.toLowerCase().slice(0, 1000) // Only check first 1000 chars for speed
  
  // Split query into keywords
  const keywords = q.split(/\s+/).filter(k => k.length > 3)
  
  if (keywords.length === 0) return t.includes(q) || c.includes(q)
  
  // Check if title or content matches keywords
  const titleMatches = keywords.filter(k => t.includes(k)).length
  const contentMatches = keywords.filter(k => c.includes(k)).length
  
  return titleMatches > 0 || contentMatches > keywords.length / 2
}
