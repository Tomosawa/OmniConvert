import { describe, expect, it } from 'vitest'
import {
  buildPandocOptions,
  documentMime,
  isBinaryWriter,
  readerFor,
  writerFor,
} from '@/utils/pandocFormats'

describe('utils/pandocFormats#readerFor / writerFor', () => {
  it('maps common extensions to canonical Pandoc names', () => {
    expect(readerFor('md')).toBe('markdown')
    expect(readerFor('docx')).toBe('docx')
    expect(readerFor('html')).toBe('html')
    expect(readerFor('htm')).toBe('html')
    expect(readerFor('TEX')).toBe('latex')
    expect(writerFor('md')).toBe('markdown')
    expect(writerFor('txt')).toBe('plain')
    expect(writerFor('epub')).toBe('epub')
  })

  it('returns null for unknown extensions', () => {
    expect(readerFor('xyz')).toBe(null)
    expect(writerFor('xyz')).toBe(null)
  })
})

describe('utils/pandocFormats#isBinaryWriter', () => {
  it('flags docx and epub as binary', () => {
    expect(isBinaryWriter('docx')).toBe(true)
    expect(isBinaryWriter('epub')).toBe(true)
  })

  it('treats text formats as non-binary', () => {
    expect(isBinaryWriter('md')).toBe(false)
    expect(isBinaryWriter('html')).toBe(false)
    expect(isBinaryWriter('tex')).toBe(false)
  })
})

describe('utils/pandocFormats#documentMime', () => {
  it('returns sensible MIME types', () => {
    expect(documentMime('md')).toBe('text/markdown')
    expect(documentMime('html')).toBe('text/html')
    expect(documentMime('docx')).toContain('officedocument')
    expect(documentMime('epub')).toBe('application/epub+zip')
  })

  it('falls back to octet-stream for unknown', () => {
    expect(documentMime('xyz')).toBe('application/octet-stream')
  })
})

describe('utils/pandocFormats#buildPandocOptions', () => {
  it('emits from + to as the minimal payload', () => {
    const opts = buildPandocOptions({ from: 'markdown', to: 'html' })
    expect(opts.from).toBe('markdown')
    expect(opts.to).toBe('html')
    expect(opts.standalone).toBeUndefined()
    expect(opts.toc).toBeUndefined()
  })

  it('adds input-files when inputFile is given', () => {
    const opts = buildPandocOptions({
      from: 'docx',
      to: 'markdown',
      inputFile: 'in.docx',
    })
    expect(opts['input-files']).toEqual(['in.docx'])
  })

  it('adds output-file when outputFile is given', () => {
    const opts = buildPandocOptions({
      from: 'markdown',
      to: 'docx',
      outputFile: 'out.docx',
    })
    expect(opts['output-file']).toBe('out.docx')
  })

  it('flips standalone and toc when requested', () => {
    const opts = buildPandocOptions({
      from: 'markdown',
      to: 'html',
      doc: { standalone: true, toc: true },
    })
    expect(opts.standalone).toBe(true)
    expect(opts.toc).toBe(true)
  })

  it('passes css through as an array', () => {
    const opts = buildPandocOptions({
      from: 'markdown',
      to: 'html',
      doc: { css: 'https://example.com/s.css' },
    })
    expect(opts.css).toEqual(['https://example.com/s.css'])
  })

  it('omits css when blank', () => {
    const opts = buildPandocOptions({
      from: 'markdown',
      to: 'html',
      doc: { standalone: true },
    })
    expect(opts.css).toBeUndefined()
  })
})
