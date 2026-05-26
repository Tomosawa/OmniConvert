import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

export interface HistoryRecord {
  id: string
  fileName: string
  sourceFormat: string
  targetFormat: string
  category: 'image' | 'media' | 'document' | 'unknown'
  sizeBytes: number
  outputBytes: number
  durationMs: number
  status: 'success' | 'error'
  error?: string
  completedAt: number
}

interface OmniHistoryDB extends DBSchema {
  history: {
    key: string
    value: HistoryRecord
    indexes: { 'by-completedAt': number }
  }
}

const DB_NAME = 'omniconvert'
const DB_VERSION = 1
const STORE = 'history'
const DEFAULT_LIMIT = 200

let dbPromise: Promise<IDBPDatabase<OmniHistoryDB>> | null = null

function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

async function getDb(): Promise<IDBPDatabase<OmniHistoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OmniHistoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('by-completedAt', 'completedAt')
      },
    })
  }
  return dbPromise
}

/**
 * Test-only seam: lets specs swap in fake-indexeddb implementations
 * (or reset between tests) without exposing the cached promise.
 */
export function __resetHistoryDbForTests(): void {
  dbPromise = null
}

/**
 * Local-first conversion history persisted in IndexedDB.
 *
 * Privacy: we only persist *metadata* (filename, formats, sizes, timing) —
 * never the file contents themselves. That keeps history useful for "did
 * I already convert this?" lookups without turning the browser store into
 * an unsupervised file cache.
 *
 * Phase 6 hooks `append` into the conversion store on completion (success or
 * error) so users can browse a chronological log on the History page.
 */
export function useHistory() {
  async function append(record: HistoryRecord): Promise<void> {
    if (!isAvailable()) return
    try {
      const db = await getDb()
      await db.put(STORE, record)
      await prune(db)
    } catch (err) {
      console.warn('[history] append failed', err)
    }
  }

  async function list(limit = DEFAULT_LIMIT): Promise<HistoryRecord[]> {
    if (!isAvailable()) return []
    try {
      const db = await getDb()
      const all = await db.getAllFromIndex(STORE, 'by-completedAt')
      return all.reverse().slice(0, limit)
    } catch {
      return []
    }
  }

  async function remove(id: string): Promise<void> {
    if (!isAvailable()) return
    try {
      const db = await getDb()
      await db.delete(STORE, id)
    } catch {
      /* swallow */
    }
  }

  async function clear(): Promise<void> {
    if (!isAvailable()) return
    try {
      const db = await getDb()
      await db.clear(STORE)
    } catch {
      /* swallow */
    }
  }

  async function prune(
    db: IDBPDatabase<OmniHistoryDB>,
    keep = DEFAULT_LIMIT,
  ): Promise<void> {
    const total = await db.count(STORE)
    if (total <= keep) return
    const cursor = await db.transaction(STORE, 'readwrite').store.index('by-completedAt').openCursor()
    let toDelete = total - keep
    let cur = cursor
    while (cur && toDelete > 0) {
      await cur.delete()
      toDelete--
      cur = await cur.continue()
    }
  }

  return { append, list, remove, clear }
}
