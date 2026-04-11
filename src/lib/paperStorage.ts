import type { ArxivMetadata, SavedPaper, PageIndex, PaperData, Section } from '../types'
import { savePaperMetadata, deletePaper as dbDeletePaper } from './db'
import { fetchAr5ivPaper } from './arxiv'
import { createPageIndex, savePageIndex } from './indexer'

/**
 * OPFS and Dexie operations are passed in via closures to avoid tight coupling with hooks.
 * In production, these would be injected or accessed through a context.
 */

let opfsOps: {
  savePaperHTML: (id: string, html: string) => Promise<void>
  getPaperHTML: (id: string) => Promise<string | null>
  savePaperIndex: (id: string, index: PageIndex) => Promise<void>
  getPaperIndex: (id: string) => Promise<PageIndex | null>
  paperExists: (id: string) => Promise<boolean>
  deletePaperFiles: (id: string) => Promise<void>
} | null = null

/**
 * Initialize paperStorage with OPFS operations from the hook.
 */
export function initializePaperStorage(ops: typeof opfsOps) {
  opfsOps = ops
}

/**
 * Orchestrate the full "Save for Later" workflow:
 * 1. Save metadata to Dexie
 * 2. Fetch ar5iv HTML in background
 * 3. Write HTML to OPFS
 * 4. Build and save PageIndex to Dexie & OPFS
 * 5. Update Dexie with opfsReady flag
 */
export async function savePaper(meta: ArxivMetadata): Promise<PaperData | null> {
  if (!opfsOps) {
    throw new Error('paperStorage not initialized')
  }

  // 1. Save metadata to Dexie
  const savedPaper: SavedPaper = {
    ...meta,
    savedAt: Date.now(),
    collectionIds: [],
    opfsReady: false
  }
  await savePaperMetadata(savedPaper)

  try {
    // 2. Fetch ar5iv HTML
    const paperData = await fetchAr5ivPaper(meta.id)

    // 3. Save HTML to OPFS
    const htmlString = `<html><head><title>${paperData.title}</title></head><body>${
      paperData.sections.map(s => `<section id="${s.id}" data-type="${s.type}"><h2>${s.title}</h2><p>${s.content}</p></section>`).join('')
    }</body></html>`
    await opfsOps.savePaperHTML(meta.id, htmlString)

    // 4. Build and save PageIndex
    const pageIndex = createPageIndex(meta.id, paperData.sections)
    await savePageIndex(pageIndex) // Save to Dexie
    await opfsOps.savePaperIndex(meta.id, pageIndex) // Also save to OPFS for backup

    // 5. Update opfsReady flag
    savedPaper.opfsReady = true
    await savePaperMetadata(savedPaper)

    return paperData
  } catch (error) {
    console.error(`Failed to save paper ${meta.id} to OPFS:`, error)
    // Keep the metadata in Dexie even if OPFS save fails; user can try again
    return null
  }
}

/**
 * Load a paper from OPFS (offline).
 */
export async function loadPaperFromOPFS(id: string): Promise<PaperData | null> {
  if (!opfsOps) {
    throw new Error('paperStorage not initialized')
  }

  try {
    const html = await opfsOps.getPaperHTML(id)
    if (!html) return null

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const title = doc.querySelector('title')?.textContent || 'Untitled'
    const sections: Section[] = Array.from(doc.querySelectorAll('section')).map(section => {
      const id = section.id || `section-${Math.random()}`
      const sTitle = section.querySelector('h2')?.textContent?.trim() || 'Untitled'
      const content = section.querySelector('p')?.textContent || ''
      const type = section.getAttribute('data-type') as any
      
      return {
        id,
        title: sTitle,
        content,
        full_text: content,
        type: type || 'other'
      }
    })

    return {
      id,
      title,
      authors: [],
      sections,
      url: `https://arxiv.org/html/${id}`,
      fetchedAt: new Date()
    }
  } catch (error) {
    console.error(`Failed to load paper from OPFS:`, error)
    return null
  }
}

/**
 * Load PageIndex for a paper from OPFS.
 */
export async function loadPageIndex(id: string): Promise<PageIndex | null> {
  if (!opfsOps) {
    throw new Error('paperStorage not initialized')
  }

  return opfsOps.getPaperIndex(id)
}

/**
 * Check if a paper is cached in OPFS.
 */
export async function isPaperCached(id: string): Promise<boolean> {
  if (!opfsOps) {
    return false
  }

  return opfsOps.paperExists(id)
}

/**
 * Delete a paper from both Dexie and OPFS.
 */
export async function deletePaperCompletely(id: string): Promise<void> {
  if (!opfsOps) {
    throw new Error('paperStorage not initialized')
  }

  await dbDeletePaper(id)
  await opfsOps.deletePaperFiles(id)
}
