import type { DocumentOptions } from '@/types/documentOptions'

/**
 * Map our normalised extension to the Pandoc reader/writer name. Pandoc
 * uses slightly different names than file extensions (e.g. `markdown` not `md`,
 * `docx` not `doc`). The flags emitted to `convert(options, ...)` use the
 * snake_case JSON shape that the Pandoc Haskell entry point expects.
 */
const READER_BY_EXT: Readonly<Record<string, string>> = {
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  docx: 'docx',
  epub: 'epub',
  tex: 'latex',
  latex: 'latex',
  rst: 'rst',
  txt: 'markdown',
  org: 'org',
}

const WRITER_BY_EXT: Readonly<Record<string, string>> = {
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  docx: 'docx',
  epub: 'epub',
  tex: 'latex',
  latex: 'latex',
  rst: 'rst',
  org: 'org',
  txt: 'plain',
}

/** Whether the chosen output format produces a binary (non-UTF-8) file. */
const BINARY_WRITERS = new Set(['docx', 'epub'])

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  tex: 'application/x-tex',
  latex: 'application/x-tex',
  rst: 'text/x-rst',
  txt: 'text/plain',
  org: 'text/plain',
  pdf: 'application/pdf',
}

export function readerFor(ext: string): string | null {
  return READER_BY_EXT[ext.toLowerCase()] ?? null
}

export function writerFor(ext: string): string | null {
  return WRITER_BY_EXT[ext.toLowerCase()] ?? null
}

export function isBinaryWriter(ext: string): boolean {
  return BINARY_WRITERS.has(ext.toLowerCase())
}

export function documentMime(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream'
}

export interface PandocConvertOptions {
  /** Pandoc `--from` reader format. */
  from: string
  /** Pandoc `--to` writer format. */
  to: string
  /** Optional input filename (only needed for binary readers like docx/epub). */
  inputFile?: string
  /** Optional output filename (required for binary writers). */
  outputFile?: string
  /** Whether the source is a binary format that may embed media (docx/epub). */
  extractMedia?: boolean
  /** Domain-level options the user toggled. */
  doc?: DocumentOptions
}

/**
 * Build the JSON option blob the Pandoc WASM `convert(opts, stdin, files)`
 * function expects. Pandoc's WASM build accepts the same long-form CLI flags
 * as a JSON object; that's the contract we serialise here.
 *
 * Pure function — easy to unit-test.
 */
export function buildPandocOptions(args: PandocConvertOptions): Record<string, unknown> {
  const opts: Record<string, unknown> = {
    from: args.from,
    to: args.to,
  }
  if (args.inputFile) opts['input-files'] = [args.inputFile]
  if (args.outputFile) opts['output-file'] = args.outputFile
  if (args.extractMedia) opts['extract-media'] = '/media'
  if (args.doc?.standalone) opts.standalone = true
  if (args.doc?.toc) opts.toc = true
  if (args.doc?.css) opts.css = [args.doc.css]
  return opts
}
