import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithProgress, type FetchProgress } from '@/utils/fetchWithProgress'

/**
 * Create a mock ReadableStream that delivers chunks sequentially.
 */
function createMockStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index]!)
        index++
      } else {
        controller.close()
      }
    },
  })
}

describe('utils/fetchWithProgress', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks byte-level progress via ReadableStream chunks', async () => {
    const chunk1 = new Uint8Array([1, 2, 3, 4])
    const chunk2 = new Uint8Array([5, 6, 7, 8])

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Length': '8' }),
        body: createMockStream([chunk1, chunk2]),
      }),
    )

    const progressEvents: FetchProgress[] = []
    const blob = await fetchWithProgress('https://example.com/test.wasm', (p) => {
      progressEvents.push({ ...p })
    })

    // Should have progress for each chunk + final done event
    expect(progressEvents.length).toBe(3) // chunk1 + chunk2 + done
    expect(progressEvents[0]!.loaded).toBe(4)
    expect(progressEvents[0]!.percent).toBe(50)
    expect(progressEvents[0]!.done).toBe(false)
    expect(progressEvents[1]!.loaded).toBe(8)
    expect(progressEvents[1]!.percent).toBe(100)
    expect(progressEvents[2]!.done).toBe(true)

    // Result should be a Blob with concatenated content
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBe(8)
    const arr = new Uint8Array(await blob.arrayBuffer())
    expect(arr).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
  })

  it('uses knownTotal when Content-Length is absent', async () => {
    const mockBlob = new Blob([new Uint8Array(1000)])
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(), // No Content-Length
        body: null,
        blob: () => Promise.resolve(mockBlob),
      }),
    )

    const progressEvents: FetchProgress[] = []
    const blob = await fetchWithProgress(
      'https://example.com/test.wasm',
      (p) => progressEvents.push({ ...p }),
      1000, // knownTotal
    )

    // No body → reads entire response as blob, reports 100%
    expect(progressEvents.length).toBe(1)
    expect(progressEvents[0]!.percent).toBe(100)
    expect(progressEvents[0]!.done).toBe(true)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBe(1000)
  })

  it('falls back to knownTotal for percent when Content-Length is missing but body exists', async () => {
    const chunk = new Uint8Array(500)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(), // No Content-Length
        body: createMockStream([chunk]),
      }),
    )

    const progressEvents: FetchProgress[] = []
    await fetchWithProgress(
      'https://example.com/test.wasm',
      (p) => progressEvents.push({ ...p }),
      1000, // knownTotal
    )

    // Should use knownTotal (1000) for percent calculation: 500/1000 = 50%
    const firstProgress = progressEvents.find((e) => !e.done)
    expect(firstProgress).toBeDefined()
    expect(firstProgress!.total).toBe(1000)
    expect(firstProgress!.percent).toBe(50)
  })

  it('throws on non-OK responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }))

    await expect(
      fetchWithProgress('https://example.com/missing.wasm', () => {}),
    ).rejects.toThrow('HTTP 404')
  })

  it('caps percent at 100 when loaded exceeds total', async () => {
    const chunk = new Uint8Array(100)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Length': '50' }), // Server lied about size
        body: createMockStream([chunk]),
      }),
    )

    const progressEvents: FetchProgress[] = []
    await fetchWithProgress('https://example.com/test.wasm', (p) => {
      progressEvents.push({ ...p })
    })

    // Percent should be capped at 100, not 200
    expect(progressEvents[0]!.percent).toBe(100)
  })

  it('sends cache: no-cache to force network request', async () => {
    const mockBlob = new Blob([new Uint8Array(100)])
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      body: null,
      blob: () => Promise.resolve(mockBlob),
    })
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithProgress('https://example.com/test.wasm', () => {})

    // Verify cache: 'no-cache' is passed
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/test.wasm',
      expect.objectContaining({ cache: 'no-cache' }),
    )
  })
})
