/**
 * Download a URL with byte-level progress tracking via ReadableStream.
 *
 * Uses `fetch()` with `cache: 'no-cache'` to force a network request even when
 * the browser's HTTP cache has the file. This ensures the ReadableStream
 * delivers data in chunks so progress events fire. Without `no-cache`, a
 * cached response may arrive as a single chunk (one `reader.read()` → done),
 * making progress tracking impossible.
 *
 * The caller is responsible for caching the result (e.g. via Cache API) so
 * subsequent requests by other code (engine WASM loaders) hit the cache and
 * load instantly.
 *
 * @param url        - The URL to download
 * @param onProgress - Callback fired on every chunk read
 * @param knownTotal - Fallback total size (bytes) when Content-Length is absent
 */

export interface FetchProgress {
  loaded: number
  total: number // -1 when total is unknown
  percent: number // 0–100
  done: boolean
}

export async function fetchWithProgress(
  url: string,
  onProgress: (p: FetchProgress) => void,
  knownTotal?: number,
): Promise<Blob> {
  const resp = await fetch(url, { cache: 'no-cache' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`)

  const contentLength = resp.headers.get('Content-Length')
  const total = contentLength ? Number(contentLength) : (knownTotal ?? -1)

  // No body or unknown size — read entire response as blob, report 100%
  if (!resp.body || total <= 0) {
    const blob = await resp.blob()
    onProgress({ loaded: blob.size, total: blob.size, percent: 100, done: true })
    return blob
  }

  const reader = resp.body.getReader()
  let loaded = 0
  const chunks: Uint8Array[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        loaded += value.byteLength
        onProgress({
          loaded,
          total,
          percent: Math.min(100, Math.round((loaded / total) * 100)),
          done: false,
        })
      }
    }
  } finally {
    reader.releaseLock()
  }

  onProgress({ loaded, total, percent: 100, done: true })
  return new Blob(chunks)
}
