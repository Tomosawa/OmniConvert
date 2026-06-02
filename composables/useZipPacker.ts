import { zip } from 'fflate'
import { createLogger } from '@/utils/logger'

const log = createLogger('zip')

export interface PackEntry {
  name: string
  blob: Blob
}

/**
 * fflate-based ZIP packer. We use the streaming `zip()` API rather than\n * `zipSync` to avoid blocking the main thread on large multi-file archives.
 *
 * Phase 6 wires this into BatchActions: when more than one task is selected\n * for download, results pack into a single `omniconvert-<timestamp>.zip`.
 */
export function useZipPacker() {
  async function pack(entries: PackEntry[]): Promise<Blob> {
    if (entries.length === 0) {
      throw new Error('No entries to pack')
    }

    log.info('packing', { count: entries.length })

    const fileMap: Record<string, Uint8Array> = {}
    for (const entry of entries) {
      const buf = new Uint8Array(await entry.blob.arrayBuffer())
      const safe = sanitiseName(entry.name, fileMap)
      log.debug('adding entry', { name: entry.name, safeName: safe, size: buf.byteLength })
      fileMap[safe] = buf
    }

    return new Promise<Blob>((resolve, reject) => {
      zip(fileMap, { level: 6 }, (err, data) => {
        if (err) {
          log.error('zip failed', err)
          reject(err)
          return
        }
        const copy = new Uint8Array(data.length)
        copy.set(data)
        log.info('pack done', { outputSize: copy.byteLength })
        resolve(new Blob([copy.buffer], { type: 'application/zip' }))
      })
    })
  }

  return { pack }
}

/**
 * Make sure each entry has a unique name in the zip; fflate would otherwise
 * silently overwrite duplicates. Format: `name (2).ext`.
 */
function sanitiseName(name: string, taken: Record<string, unknown>): string {
  if (!(name in taken)) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 2
  while (`${stem} (${i})${ext}` in taken) i++
  return `${stem} (${i})${ext}`
}
