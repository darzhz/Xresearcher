import Dexie, { Table } from 'dexie'
import type { SavedPaper, Collection, InterestCategory } from '../types'

export class AppDatabase extends Dexie {
  papers!: Table<SavedPaper>
  collections!: Table<Collection>
  interests!: Table<InterestCategory>

  constructor() {
    super('xresearch-db')
    this.version(1).stores({
      papers: 'id, title, published, savedAt, *authors, *categories, *collectionIds, opfsReady',
      collections: '++id, name, createdAt',
      interests: 'category, addedAt'
    })
  }
}

// Singleton instance
export const db = new AppDatabase()

/**
 * Save paper metadata to Dexie.
 */
export async function savePaperMetadata(paper: SavedPaper): Promise<void> {
  await db.papers.put(paper)
}

/**
 * Get a single saved paper by ID.
 */
export async function getPaper(id: string): Promise<SavedPaper | undefined> {
  return db.papers.get(id)
}

/**
 * Get all saved papers.
 */
export async function getAllSavedPapers(): Promise<SavedPaper[]> {
  return db.papers.toArray()
}

/**
 * Delete a paper from the library.
 */
export async function deletePaper(id: string): Promise<void> {
  await db.papers.delete(id)
}

/**
 * Get all user interest categories.
 */
export async function getInterests(): Promise<string[]> {
  const interests = await db.interests.toArray()
  return interests.map(i => i.category)
}

/**
 * Add an interest category.
 */
export async function setInterest(category: string): Promise<void> {
  await db.interests.put({
    category,
    addedAt: Date.now()
  })
}

/**
 * Remove an interest category.
 */
export async function removeInterest(category: string): Promise<void> {
  await db.interests.delete(category)
}

/**
 * Get all user collections.
 */
export async function getCollections(): Promise<Collection[]> {
  return db.collections.toArray()
}

/**
 * Create a new collection.
 */
export async function createCollection(name: string): Promise<number> {
  return db.collections.add({
    name,
    createdAt: Date.now()
  })
}

/**
 * Delete a collection.
 */
export async function deleteCollection(id: number): Promise<void> {
  await db.collections.delete(id)
}

/**
 * Add a paper to a collection.
 */
export async function addPaperToCollection(paperId: string, collectionId: number): Promise<void> {
  const paper = await db.papers.get(paperId)
  if (paper) {
    if (!paper.collectionIds.includes(collectionId)) {
      paper.collectionIds.push(collectionId)
      await db.papers.put(paper)
    }
  }
}

/**
 * Remove a paper from a collection.
 */
export async function removePaperFromCollection(paperId: string, collectionId: number): Promise<void> {
  const paper = await db.papers.get(paperId)
  if (paper) {
    paper.collectionIds = paper.collectionIds.filter(id => id !== collectionId)
    await db.papers.put(paper)
  }
}
