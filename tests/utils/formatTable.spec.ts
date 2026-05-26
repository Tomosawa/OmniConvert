import { describe, expect, it } from 'vitest'
import {
  EXT_TO_CATEGORY,
  FORMAT_RECOMMENDATIONS,
  categoryOf,
  normaliseExt,
  recommendTargets,
} from '@/utils/formatTable'

describe('utils/formatTable#normaliseExt', () => {
  it('lowercases and trims', () => {
    expect(normaliseExt('PNG')).toBe('png')
    expect(normaliseExt(' JPG ')).toBe('jpg')
  })

  it('strips leading dot', () => {
    expect(normaliseExt('.png')).toBe('png')
  })

  it('canonicalises common aliases', () => {
    expect(normaliseExt('jpeg')).toBe('jpg')
    expect(normaliseExt('TIFF')).toBe('tif')
    expect(normaliseExt('markdown')).toBe('md')
    expect(normaliseExt('htm')).toBe('html')
    expect(normaliseExt('latex')).toBe('tex')
  })
})

describe('utils/formatTable#categoryOf', () => {
  it('buckets common image extensions', () => {
    expect(categoryOf('jpg')).toBe('image')
    expect(categoryOf('png')).toBe('image')
    expect(categoryOf('webp')).toBe('image')
  })

  it('buckets media extensions', () => {
    expect(categoryOf('mp3')).toBe('media')
    expect(categoryOf('mp4')).toBe('media')
    expect(categoryOf('wav')).toBe('media')
  })

  it('buckets document extensions', () => {
    expect(categoryOf('md')).toBe('document')
    expect(categoryOf('docx')).toBe('document')
    expect(categoryOf('pdf')).toBe('document')
  })

  it('returns unknown for unrecognised extensions', () => {
    expect(categoryOf('xyz')).toBe('unknown')
    expect(categoryOf('')).toBe('unknown')
  })
})

describe('utils/formatTable#recommendTargets', () => {
  it('returns a non-empty list for known extensions', () => {
    expect(recommendTargets('jpg').length).toBeGreaterThan(0)
    expect(recommendTargets('mp4').length).toBeGreaterThan(0)
    expect(recommendTargets('md').length).toBeGreaterThan(0)
  })

  it('returns a fresh array each call (callers may mutate)', () => {
    const a = recommendTargets('png')
    const b = recommendTargets('png')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('works through aliases (jpeg → jpg)', () => {
    expect(recommendTargets('jpeg')).toEqual(recommendTargets('jpg'))
  })

  it('returns empty list for unknown', () => {
    expect(recommendTargets('xyz')).toEqual([])
  })
})

describe('utils/formatTable shape', () => {
  it('every recommended target has at least one source mapping', () => {
    const knownExts = new Set(Object.keys(EXT_TO_CATEGORY))
    for (const [src, targets] of Object.entries(FORMAT_RECOMMENDATIONS)) {
      expect(knownExts.has(src)).toBe(true)
      for (const t of targets) {
        expect(knownExts.has(t)).toBe(true)
      }
    }
  })
})
