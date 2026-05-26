import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { useZipPacker } from '@/composables/useZipPacker'

describe('composables/useZipPacker', () => {
  it('packs multiple blobs into a valid ZIP', async () => {
    const { pack } = useZipPacker()
    const zipBlob = await pack([
      { name: 'a.txt', blob: new Blob(['hello']) },
      { name: 'b.txt', blob: new Blob(['world']) },
    ])

    expect(zipBlob.type).toBe('application/zip')
    expect(zipBlob.size).toBeGreaterThan(0)

    const buf = new Uint8Array(await zipBlob.arrayBuffer())
    const entries = unzipSync(buf)
    expect(Object.keys(entries).sort()).toEqual(['a.txt', 'b.txt'])
    expect(new TextDecoder().decode(entries['a.txt']!)).toBe('hello')
    expect(new TextDecoder().decode(entries['b.txt']!)).toBe('world')
  })

  it('renames duplicate filenames so nothing is lost', async () => {
    const { pack } = useZipPacker()
    const zipBlob = await pack([
      { name: 'photo.jpg', blob: new Blob(['one']) },
      { name: 'photo.jpg', blob: new Blob(['two']) },
      { name: 'photo.jpg', blob: new Blob(['three']) },
    ])
    const entries = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()))
    expect(Object.keys(entries).sort()).toEqual([
      'photo (2).jpg',
      'photo (3).jpg',
      'photo.jpg',
    ])
    expect(new TextDecoder().decode(entries['photo.jpg']!)).toBe('one')
    expect(new TextDecoder().decode(entries['photo (2).jpg']!)).toBe('two')
    expect(new TextDecoder().decode(entries['photo (3).jpg']!)).toBe('three')
  })

  it('throws when given no entries', async () => {
    const { pack } = useZipPacker()
    await expect(pack([])).rejects.toThrow(/no entries/i)
  })
})
