import { computed, ref } from 'vue'
import { useRuntimeConfig } from '#app'
import { usePlatform } from './usePlatform'
import { fetchWithProgress } from '@/utils/fetchWithProgress'

// WASM URLs — Vite resolves these to hashed asset URLs at build time.
import ffmpegWasmUrl from '@ffmpeg/core/wasm?url'
import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'
import pandocWasmUrl from 'virtual:pandoc-wasm-url'

export interface EngineStatus {
  key: string
  name: string
  totalBytes: number
  loadedBytes: number
  percent: number
  state: 'pending' | 'loading' | 'done' | 'error'
  error?: string
}

// ─── Module-level singleton state ────────────────────────────────────────────

const WASM_URLS: Record<string, string> = {}
const INITIAL_SIZES: Record<string, number> = {
  ffmpeg: 32_232_419,
  magick: 14_420_293,
  pandoc: 58_379_729,
}

// 内存缓存：预加载的二进制数据，供引擎直接使用（仅在当前会话有效）
const wasmBinaryCache = new Map<string, ArrayBuffer>()

const engines = ref<EngineStatus[]>(
  Object.entries(INITIAL_SIZES).map(([key, totalBytes]) => ({
    key,
    name: { ffmpeg: 'FFmpeg', magick: 'ImageMagick', pandoc: 'Pandoc' }[key]!,
    totalBytes,
    loadedBytes: 0,
    percent: 0,
    state: 'pending' as const,
  })),
)

const totalPercent = ref(0)
const allReady = ref(false)
let preloadStarted = false

// ─── Composable ──────────────────────────────────────────────────────────────

export function useWasmPreload() {
  const { isDesktop } = usePlatform()

  // Desktop sidecar engines are bundled — no WASM download needed.
  // Set allReady=true immediately so convert.vue skips the preload screen.
  if (import.meta.client && isDesktop.value) {
    allReady.value = true
  }

  const totalLoadedMB = computed(() => {
    const bytes = engines.value.reduce((sum, e) => sum + e.loadedBytes, 0)
    return (bytes / 1_048_576).toFixed(1)
  })

  const totalSizeMB = computed(() => {
    const bytes = engines.value.reduce((sum, e) => sum + e.totalBytes, 0)
    return (bytes / 1_048_576).toFixed(0)
  })

  const hasErrors = computed(() => engines.value.some((e) => e.state === 'error'))

  async function preload(): Promise<void> {
    // Guard: SSR, desktop, already started
    if (!import.meta.client || isDesktop.value || preloadStarted) return
    preloadStarted = true

    try {
      // Initialize URL map
      WASM_URLS.ffmpeg = ffmpegWasmUrl
      WASM_URLS.magick = magickWasmUrl
      WASM_URLS.pandoc = pandocWasmUrl

      // ── Download all engines in parallel with progress ────────────
      const startTime = Date.now()
      console.log('[wasm-preload] starting download')

      const jobs = engines.value.map(async (eng) => {
        const url = WASM_URLS[eng.key]
        if (!url) {
          eng.state = 'error'
          eng.error = 'URL not resolved'
          return
        }
        eng.state = 'loading'
        try {
          const blob = await fetchWithProgress(
            url,
            (p) => {
              eng.loadedBytes = p.loaded
              if (p.total > 0) eng.totalBytes = p.total
              eng.percent = p.percent
              recalcTotal()
            },
            eng.totalBytes,
          )
          // 保存到内存缓存（仅在当前会话有效）
          const buffer = await blob.arrayBuffer()
          wasmBinaryCache.set(eng.key, buffer)
          eng.state = 'done'
          eng.percent = 100
          console.log(`[wasm-preload] ${eng.key} downloaded (${(buffer.byteLength / 1048576).toFixed(1)}MB)`)
        } catch (err) {
          eng.state = 'error'
          eng.error = err instanceof Error ? err.message : String(err)
          console.error(`[wasm-preload] ${eng.key} failed:`, err)
        }
      })

      await Promise.allSettled(jobs)
      recalcTotal()

      // Minimum display time
      const elapsed = Date.now() - startTime
      if (elapsed < 300) {
        await new Promise((r) => setTimeout(r, 300 - elapsed))
      }

      allReady.value = true
      console.log('[wasm-preload] complete, cached in memory for this session')
    } catch (err) {
      console.error('[wasm-preload] unexpected error:', err)
      allReady.value = true
    }
  }

  function recalcTotal(): void {
    const total = engines.value.reduce((s, e) => s + e.totalBytes, 0)
    const loaded = engines.value.reduce((s, e) => s + e.loadedBytes, 0)
    totalPercent.value = total > 0 ? Math.round((loaded / total) * 100) : 0
  }

  function getPreloadedWasm(key: string): ArrayBuffer | undefined {
    return wasmBinaryCache.get(key)
  }

  const CATEGORY_ENGINE: Record<string, string> = {
    media: 'ffmpeg',
    image: 'magick',
    document: 'pandoc',
  }

  function isEngineReady(category: string): boolean {
    // Desktop uses sidecar CLI — WASM engines not needed
    if (import.meta.client && isDesktop.value) return true
    const engineKey = CATEGORY_ENGINE[category]
    if (!engineKey) return true
    const engine = engines.value.find((e) => e.key === engineKey)
    return engine?.state === 'done'
  }

  function enginePercent(category: string): number {
    // Desktop uses sidecar CLI — no WASM download progress
    if (import.meta.client && isDesktop.value) return 100
    const engineKey = CATEGORY_ENGINE[category]
    if (!engineKey) return 100
    const engine = engines.value.find((e) => e.key === engineKey)
    return engine?.percent ?? 0
  }

  return {
    engines,
    totalPercent,
    totalLoadedMB,
    totalSizeMB,
    allReady,
    hasErrors,
    preload,
    getPreloadedWasm,
    isEngineReady,
    enginePercent,
  }
}
