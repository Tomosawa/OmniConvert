import { describe, expect, it } from 'vitest'
import { probeMagic, MAGIC_TABLE } from '@/utils/magicNumber'

function bytesFrom(...nums: number[]): Uint8Array {
  return new Uint8Array(nums)
}

describe('utils/magicNumber', () => {
  it('exports a non-empty table', () => {
    expect(MAGIC_TABLE.length).toBeGreaterThan(10)
  })

  it('detects PNG signature', () => {
    const bytes = bytesFrom(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0)
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'png')).toBe(true)
  })

  it('detects JPG signature', () => {
    const bytes = bytesFrom(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10)
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'jpg')).toBe(true)
  })

  it('detects GIF signature', () => {
    const bytes = bytesFrom(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'gif')).toBe(true)
  })

  it('detects WebP via RIFF + WEBP at offset 8', () => {
    const bytes = bytesFrom(
      0x52, 0x49, 0x46, 0x46, // RIFF
      0, 0, 0, 0,             // size placeholder
      0x57, 0x45, 0x42, 0x50, // WEBP
    )
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'webp')).toBe(true)
  })

  it('detects WAV via RIFF + WAVE at offset 8', () => {
    const bytes = bytesFrom(
      0x52, 0x49, 0x46, 0x46,
      0, 0, 0, 0,
      0x57, 0x41, 0x56, 0x45,
    )
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'wav')).toBe(true)
  })

  it('detects PDF', () => {
    const bytes = bytesFrom(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37)
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'pdf')).toBe(true)
  })

  it('detects MP4 ftyp at offset 4', () => {
    const bytes = bytesFrom(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32)
    const matches = probeMagic(bytes)
    expect(matches.some((m) => m.ext === 'mp4')).toBe(true)
  })

  it('returns empty array for unknown bytes', () => {
    const bytes = bytesFrom(0xde, 0xad, 0xbe, 0xef, 0x00, 0x00)
    expect(probeMagic(bytes)).toEqual([])
  })

  it('handles short buffers without throwing', () => {
    const bytes = bytesFrom(0xff)
    expect(() => probeMagic(bytes)).not.toThrow()
  })
})
