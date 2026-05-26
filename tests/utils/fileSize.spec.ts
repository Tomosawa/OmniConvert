import { describe, expect, it } from 'vitest'
import { extensionOf, formatBytes, uid } from '@/utils/fileSize'

describe('utils/fileSize#formatBytes', () => {
  it('formats sub-KB values in bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('formats KB / MB / GB correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('respects fractionDigits', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB')
    expect(formatBytes(1536, 2)).toBe('1.50 KB')
  })

  it('handles negative / NaN gracefully', () => {
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('utils/fileSize#extensionOf', () => {
  it('returns lowercase extension', () => {
    expect(extensionOf('photo.JPG')).toBe('jpg')
    expect(extensionOf('a.b.c.MD')).toBe('md')
  })

  it('returns empty when no extension', () => {
    expect(extensionOf('README')).toBe('')
    expect(extensionOf('trailing.')).toBe('')
  })
})

describe('utils/fileSize#uid', () => {
  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()))
    expect(ids.size).toBe(50)
  })

  it('honours the prefix', () => {
    expect(uid('task').startsWith('task_')).toBe(true)
  })
})
