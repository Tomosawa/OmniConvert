import { describe, expect, it } from 'vitest'
import { detectFile } from '@/composables/useFileDetection'

function makeFile(name: string, bytes: number[], type = ''): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('composables/useFileDetection', () => {
  it('detects a PNG by magic + extension agreement', async () => {
    const file = makeFile(
      'photo.png',
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0],
      'image/png',
    )
    const result = await detectFile(file)
    expect(result.category).toBe('image')
    expect(result.ext).toBe('png')
    expect(result.magicMatch).toBe(true)
    expect(result.mime).toBe('image/png')
  })

  it('detects a JPG via magic numbers', async () => {
    const file = makeFile('image.jpg', [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 'image/jpeg')
    const result = await detectFile(file)
    expect(result.category).toBe('image')
    expect(result.ext).toBe('jpg')
    expect(result.magicMatch).toBe(true)
  })

  it('flags magicMatch=false when extension lies', async () => {
    // PNG bytes but .jpg extension
    const file = makeFile(
      'fake.jpg',
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0],
    )
    const result = await detectFile(file)
    expect(result.magicMatch).toBe(false)
  })

  it('handles unknown bytes gracefully', async () => {
    const file = makeFile('mystery.xyz', [0xde, 0xad, 0xbe, 0xef])
    const result = await detectFile(file)
    expect(result.category).toBe('unknown')
    expect(result.magicMatch).toBe(false)
  })

  it('treats text-y document extensions as documents even without magic', async () => {
    const file = makeFile('notes.md', [0x23, 0x20, 0x48, 0x69]) // "# Hi"
    const result = await detectFile(file)
    expect(result.category).toBe('document')
    expect(result.ext).toBe('md')
    expect(result.magicMatch).toBe(true)
  })
})
