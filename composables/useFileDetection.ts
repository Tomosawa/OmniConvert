import type { DetectedFile, FileCategory } from '@/types/file'
import { categoryOf, normaliseExt } from '@/utils/formatTable'
import { extensionOf } from '@/utils/fileSize'
import { probeMagic } from '@/utils/magicNumber'

/**
 * How many leading bytes to read for magic-number probing.
 * 64 bytes is plenty for every signature in the table.
 */
const PROBE_BYTES = 64

/**
 * Detect a file's category, MIME and extension using extension + magic-number
 * checks. Pure async function — safe to call from any context.
 *
 * Strategy:
 * 1. Read leading bytes and probe the magic table.
 * 2. Take the file's declared extension as the strong signal for routing
 *    (users may rename files; we still trust their intent).
 * 3. If a magic match exists, mark `magicMatch = true` when it agrees with
 *    the declared extension family, otherwise `false` (UI can warn).
 */
export async function detectFile(file: File): Promise<DetectedFile> {
  const declaredExt = normaliseExt(extensionOf(file.name))
  const declaredCategory: FileCategory = categoryOf(declaredExt)

  const head = await readHead(file, PROBE_BYTES)
  const matches = probeMagic(head)

  let magicMatch = false
  let mime = file.type || ''
  let ext = declaredExt

  if (matches.length > 0) {
    const sameFamily = matches.find((m) => normaliseExt(m.ext) === declaredExt)
    if (sameFamily) {
      magicMatch = true
      mime = sameFamily.mime || mime
    } else {
      const firstMatch = matches[0]
      if (firstMatch) {
        mime = firstMatch.mime || mime
        if (!declaredExt) ext = normaliseExt(firstMatch.ext)
      }
    }
  } else if (declaredCategory === 'document') {
    // Plain-text-y documents (md/html/txt/...) rarely have magic numbers,
    // so trust the extension when its category is 'document'.
    magicMatch = true
  }

  const category = categoryOf(ext)

  return {
    file,
    category,
    mime,
    ext,
    magicMatch,
  }
}

async function readHead(file: File, length: number): Promise<Uint8Array> {
  const slice = file.slice(0, Math.min(length, file.size))
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

export function useFileDetection() {
  return { detectFile }
}
