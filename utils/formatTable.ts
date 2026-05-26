import type { FileCategory } from '@/types/file'

/**
 * Mapping from canonical extension → high-level category.
 * Used by detection to bucket a file into the right engine domain.
 */
export const EXT_TO_CATEGORY: Readonly<Record<string, FileCategory>> = {
  // images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  tif: 'image',
  tiff: 'image',
  ico: 'image',
  heic: 'image',
  heif: 'image',
  svg: 'image',
  // audio + video
  mp3: 'media',
  wav: 'media',
  aac: 'media',
  flac: 'media',
  ogg: 'media',
  m4a: 'media',
  mp4: 'media',
  mov: 'media',
  webm: 'media',
  mkv: 'media',
  avi: 'media',
  m4v: 'media',
  // documents
  md: 'document',
  markdown: 'document',
  docx: 'document',
  doc: 'document',
  html: 'document',
  htm: 'document',
  pdf: 'document',
  epub: 'document',
  tex: 'document',
  latex: 'document',
  rst: 'document',
  txt: 'document',
}

/**
 * Per-source target-format recommendations, ordered by typical user demand.
 * Phase 3-5 will tighten/expand these once each engine lands.
 */
export const FORMAT_RECOMMENDATIONS: Readonly<Record<string, readonly string[]>> = {
  // image targets
  jpg: ['png', 'webp', 'gif', 'bmp', 'tif', 'ico'],
  jpeg: ['png', 'webp', 'gif', 'bmp', 'tif', 'ico'],
  png: ['jpg', 'webp', 'gif', 'bmp', 'tif', 'ico'],
  gif: ['png', 'jpg', 'webp', 'bmp'],
  webp: ['png', 'jpg', 'gif', 'bmp'],
  bmp: ['png', 'jpg', 'webp', 'gif'],
  tif: ['png', 'jpg', 'webp', 'bmp'],
  tiff: ['png', 'jpg', 'webp', 'bmp'],
  ico: ['png', 'jpg', 'webp'],
  heic: ['jpg', 'png', 'webp'],
  heif: ['jpg', 'png', 'webp'],
  svg: ['png', 'jpg', 'webp'],

  // audio targets
  mp3: ['wav', 'aac', 'flac', 'ogg', 'm4a'],
  wav: ['mp3', 'aac', 'flac', 'ogg'],
  aac: ['mp3', 'wav', 'flac', 'ogg'],
  flac: ['mp3', 'wav', 'aac', 'ogg'],
  ogg: ['mp3', 'wav', 'aac', 'flac'],
  m4a: ['mp3', 'wav', 'aac', 'flac'],

  // video targets — also offer audio extraction
  mp4: ['webm', 'mov', 'mkv', 'avi', 'mp3', 'wav'],
  mov: ['mp4', 'webm', 'mkv', 'avi', 'mp3', 'wav'],
  webm: ['mp4', 'mov', 'mkv', 'avi', 'mp3', 'wav'],
  mkv: ['mp4', 'webm', 'mov', 'avi', 'mp3', 'wav'],
  avi: ['mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav'],
  m4v: ['mp4', 'webm', 'mov', 'mkv'],

  // document targets — PDF deferred to Phase 8 desktop (LaTeX/Pandoc CLI).
  md: ['docx', 'html', 'epub', 'tex'],
  markdown: ['docx', 'html', 'epub', 'tex'],
  docx: ['md', 'html', 'epub', 'tex'],
  html: ['md', 'docx', 'epub'],
  htm: ['md', 'docx', 'epub'],
  pdf: ['md', 'docx', 'html'],
  epub: ['md', 'html', 'docx'],
  tex: ['md', 'docx', 'html'],
  latex: ['md', 'docx', 'html'],
  rst: ['md', 'docx', 'html'],
  txt: ['md', 'docx', 'html'],
}

/** Lowercased & normalised; treats 'jpeg' as 'jpg' for lookup convenience. */
export function normaliseExt(ext: string): string {
  const e = ext.toLowerCase().trim().replace(/^\./, '')
  if (e === 'jpeg') return 'jpg'
  if (e === 'tiff') return 'tif'
  if (e === 'markdown') return 'md'
  if (e === 'htm') return 'html'
  if (e === 'latex') return 'tex'
  return e
}

export function categoryOf(ext: string): FileCategory {
  return EXT_TO_CATEGORY[normaliseExt(ext)] ?? 'unknown'
}

export function recommendTargets(ext: string): string[] {
  const list = FORMAT_RECOMMENDATIONS[normaliseExt(ext)]
  return list ? [...list] : []
}
