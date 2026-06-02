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
  epub: 'document',
  tex: 'document',
  latex: 'document',
  rst: 'document',
  txt: 'document',
  pdf: 'document',
}

/**
 * Per-source target-format recommendations, ordered by typical user demand.
 * Phase 3-5 will tighten/expand these once each engine lands.
 */
export const FORMAT_RECOMMENDATIONS: Readonly<Record<string, readonly string[]>> = {
  // image targets — self included for resize / compress
  jpg: ['png', 'webp', 'gif', 'bmp', 'tif', 'ico', 'jpg'],
  jpeg: ['png', 'webp', 'gif', 'bmp', 'tif', 'ico', 'jpg'],
  png: ['jpg', 'webp', 'gif', 'bmp', 'tif', 'ico', 'png'],
  gif: ['png', 'jpg', 'webp', 'bmp', 'gif'],
  webp: ['png', 'jpg', 'gif', 'bmp', 'webp'],
  bmp: ['png', 'jpg', 'webp', 'gif', 'bmp'],
  tif: ['png', 'jpg', 'webp', 'bmp', 'tif'],
  tiff: ['png', 'jpg', 'webp', 'bmp', 'tif'],
  ico: ['png', 'jpg', 'webp', 'ico'],
  heic: ['jpg', 'png', 'webp'],
  heif: ['jpg', 'png', 'webp'],
  svg: ['png', 'jpg', 'webp'],

  // audio targets — self included for bitrate / codec change
  mp3: ['wav', 'aac', 'flac', 'ogg', 'm4a', 'mp3'],
  wav: ['mp3', 'aac', 'flac', 'ogg', 'wav'],
  aac: ['mp3', 'wav', 'flac', 'ogg', 'aac'],
  flac: ['mp3', 'wav', 'aac', 'ogg', 'flac'],
  ogg: ['mp3', 'wav', 'aac', 'flac', 'ogg'],
  m4a: ['mp3', 'wav', 'aac', 'flac', 'm4a'],

  // video targets — self included for resolution / bitrate change; also offer audio extraction
  mp4: ['webm', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'mp4'],
  mov: ['mp4', 'webm', 'mkv', 'avi', 'mp3', 'wav', 'mov'],
  webm: ['mp4', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'webm'],
  mkv: ['mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'mkv'],
  avi: ['mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav', 'avi'],
  m4v: ['mp4', 'webm', 'mov', 'mkv', 'm4v'],

  // document targets — PDF deferred to desktop app (LaTeX/Pandoc CLI not available in WASM).
  md: ['docx', 'html', 'epub', 'tex'],
  markdown: ['docx', 'html', 'epub', 'tex'],
  docx: ['md', 'html', 'epub', 'tex'],
  html: ['md', 'docx', 'epub'],
  htm: ['md', 'docx', 'epub'],
  pdf: ['md', 'docx', 'html', 'txt'],
  epub: ['md', 'html', 'docx'],
  tex: ['md', 'docx', 'html'],
  latex: ['md', 'docx', 'html'],
  rst: ['md', 'docx', 'html'],
  txt: ['md', 'docx', 'html'],
}

/**
 * Desktop-specific format recommendations. Adds PDF as a target for all
 * document source formats, since the desktop Pandoc CLI can produce PDF.
 */
export const FORMAT_RECOMMENDATIONS_DESKTOP: Readonly<Record<string, readonly string[]>> = {
  ...FORMAT_RECOMMENDATIONS,
  md: ['docx', 'html', 'pdf', 'epub', 'tex'],
  markdown: ['docx', 'html', 'pdf', 'epub', 'tex'],
  docx: ['md', 'html', 'pdf', 'epub', 'tex'],
  html: ['md', 'docx', 'pdf', 'epub'],
  htm: ['md', 'docx', 'pdf', 'epub'],
  epub: ['md', 'html', 'pdf', 'docx'],
  tex: ['md', 'docx', 'html', 'pdf'],
  latex: ['md', 'docx', 'html', 'pdf'],
  rst: ['md', 'docx', 'html', 'pdf'],
  txt: ['md', 'docx', 'html', 'pdf'],
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

export function recommendTargets(ext: string, isDesktop?: boolean): string[] {
  const table = isDesktop ? FORMAT_RECOMMENDATIONS_DESKTOP : FORMAT_RECOMMENDATIONS
  const list = table[normaliseExt(ext)]
  return list ? [...list] : []
}
