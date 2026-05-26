/**
 * Magic-number signatures for the file types we need to recognise.
 *
 * Each entry pairs a known extension with one or more byte-prefix patterns.
 * Some formats (RIFF-based: WebP/AVI/WAV) need to look at bytes beyond the
 * leading signature, so we model that with `offset` + `value` pairs.
 *
 * We deliberately keep this list small: it covers what the three engines
 * (ImageMagick, FFmpeg, Pandoc) can convert in MVP. Phase 3-5 will extend.
 */

export interface MagicCheck {
  /** Offset (in bytes) where the pattern starts. Defaults to 0. */
  offset?: number
  /** Bytes to compare. */
  value: number[]
}

export interface MagicEntry {
  ext: string
  mime: string
  /** All checks must match for the entry to be considered a hit. */
  checks: MagicCheck[]
}

export const MAGIC_TABLE: readonly MagicEntry[] = [
  // -- Images --
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    checks: [{ value: [0xff, 0xd8, 0xff] }],
  },
  {
    ext: 'png',
    mime: 'image/png',
    checks: [{ value: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    // 'GIF87a' or 'GIF89a'
    checks: [{ value: [0x47, 0x49, 0x46, 0x38] }],
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    // 'RIFF' .... 'WEBP'
    checks: [
      { value: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, value: [0x57, 0x45, 0x42, 0x50] },
    ],
  },
  {
    ext: 'bmp',
    mime: 'image/bmp',
    checks: [{ value: [0x42, 0x4d] }],
  },
  {
    ext: 'tif',
    mime: 'image/tiff',
    // little-endian
    checks: [{ value: [0x49, 0x49, 0x2a, 0x00] }],
  },
  {
    ext: 'tif',
    mime: 'image/tiff',
    // big-endian
    checks: [{ value: [0x4d, 0x4d, 0x00, 0x2a] }],
  },
  {
    ext: 'ico',
    mime: 'image/x-icon',
    checks: [{ value: [0x00, 0x00, 0x01, 0x00] }],
  },
  {
    ext: 'heic',
    mime: 'image/heic',
    // 'ftypheic' / 'ftypheix' at offset 4
    checks: [{ offset: 4, value: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69] }],
  },

  // -- Audio --
  {
    ext: 'mp3',
    mime: 'audio/mpeg',
    // ID3 tag
    checks: [{ value: [0x49, 0x44, 0x33] }],
  },
  {
    ext: 'mp3',
    mime: 'audio/mpeg',
    // Frame sync (MPEG ADTS)
    checks: [{ value: [0xff, 0xfb] }],
  },
  {
    ext: 'wav',
    mime: 'audio/wav',
    checks: [
      { value: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, value: [0x57, 0x41, 0x56, 0x45] },
    ],
  },
  {
    ext: 'flac',
    mime: 'audio/flac',
    checks: [{ value: [0x66, 0x4c, 0x61, 0x43] }],
  },
  {
    ext: 'ogg',
    mime: 'audio/ogg',
    checks: [{ value: [0x4f, 0x67, 0x67, 0x53] }],
  },
  {
    ext: 'aac',
    mime: 'audio/aac',
    checks: [{ value: [0xff, 0xf1] }],
  },

  // -- Video --
  {
    ext: 'mp4',
    mime: 'video/mp4',
    // 'ftypmp4' / 'ftypisom' / 'ftypmp42' at offset 4
    checks: [{ offset: 4, value: [0x66, 0x74, 0x79, 0x70] }],
  },
  {
    ext: 'mov',
    mime: 'video/quicktime',
    checks: [{ offset: 4, value: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74] }],
  },
  {
    ext: 'webm',
    mime: 'video/webm',
    // EBML header (Matroska family)
    checks: [{ value: [0x1a, 0x45, 0xdf, 0xa3] }],
  },
  {
    ext: 'mkv',
    mime: 'video/x-matroska',
    checks: [{ value: [0x1a, 0x45, 0xdf, 0xa3] }],
  },
  {
    ext: 'avi',
    mime: 'video/x-msvideo',
    checks: [
      { value: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, value: [0x41, 0x56, 0x49, 0x20] },
    ],
  },

  // -- Documents --
  {
    ext: 'pdf',
    mime: 'application/pdf',
    checks: [{ value: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
  },
  {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // ZIP container; refined separately by extension when ZIP is detected
    checks: [{ value: [0x50, 0x4b, 0x03, 0x04] }],
  },
  {
    ext: 'epub',
    mime: 'application/epub+zip',
    checks: [{ value: [0x50, 0x4b, 0x03, 0x04] }],
  },
] as const

/**
 * Try every entry in `MAGIC_TABLE` against the given byte view.
 * Returns the matching entries (a single buffer can match multiple — e.g.
 * any ZIP-container Office format), or an empty array.
 */
export function probeMagic(bytes: Uint8Array): MagicEntry[] {
  const matches: MagicEntry[] = []
  for (const entry of MAGIC_TABLE) {
    const ok = entry.checks.every((check) => {
      const offset = check.offset ?? 0
      if (bytes.length < offset + check.value.length) return false
      for (let i = 0; i < check.value.length; i++) {
        if (bytes[offset + i] !== check.value[i]) return false
      }
      return true
    })
    if (ok) matches.push(entry)
  }
  return matches
}
