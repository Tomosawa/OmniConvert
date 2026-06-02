import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreRaw from '@ffmpeg/core-mt?raw'
import coreWasmUrl from '@ffmpeg/core-mt/wasm?url'
import workerRaw from '@ffmpeg/core-mt/worker?raw'
import type { MediaOptions } from '@/types/mediaOptions'
import { buildFfmpegArgs, targetMime } from '@/utils/ffmpegArgs'
import { useWasmPreload } from '@/composables/useWasmPreload'

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: MediaOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

let ffmpegSingleton: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null
const isReady = ref(false)

async function ensureFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton
  if (!loadPromise) {
    loadPromise = (async () => {
      const ff = new FFmpeg()

      // 检查是否有预加载的 WASM 数据
      const { getPreloadedWasm } = useWasmPreload()
      const preloadedWasm = getPreloadedWasm('ffmpeg')

      let finalWasmUrl = coreWasmUrl
      let blobUrl: string | null = null

      if (preloadedWasm) {
        const wasmBlob = new Blob([preloadedWasm], { type: 'application/wasm' })
        finalWasmUrl = URL.createObjectURL(wasmBlob)
        blobUrl = finalWasmUrl
        console.log('[media] using preloaded WASM')
      }

      const coreBlobUrl = URL.createObjectURL(
        new Blob([coreRaw], { type: 'text/javascript' }),
      )
      const workerBlobUrl = URL.createObjectURL(
        new Blob([workerRaw], { type: 'application/javascript' }),
      )

      await ff.load({
        coreURL: coreBlobUrl,
        wasmURL: finalWasmUrl,
        workerURL: workerBlobUrl,
      })

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }

      ffmpegSingleton = ff
      isReady.value = true
      return ff
    })()
  }
  return loadPromise
}

/**
 * FFmpeg-based media conversion. The package ships its own multi-threaded
 * worker, so we don't wrap it in another Worker — the page already runs in
 * a cross-origin-isolated context (COOP/COEP set in nuxt.config + vercel.json)
 * which is what `core-mt` requires.
 *
 * One FFmpeg instance is reused across calls for cheaper warm-up. Concurrent
 * calls are serialised by the store's `concurrency = 1` (set on mount when
 * the page detects a media file present); see Phase 6 for richer queueing.
 */
export function useMediaConversion() {
  async function convert(args: ConvertArgs): Promise<Blob> {
    const ff = await ensureFfmpeg()
    const sourceExt = args.sourceExt.toLowerCase() || 'bin'
    const targetExt = args.targetExt.toLowerCase()

    const inputName = `in_${Date.now()}.${sourceExt}`
    const outputName = `out_${Date.now()}.${targetExt}`

    const onProgress = args.onProgress
    const handler = ({ progress }: { progress: number }) => {
      console.log('[media] ffmpeg progress event:', progress)
      if (typeof progress === 'number' && Number.isFinite(progress)) {
        onProgress?.(Math.round(Math.max(0, Math.min(1, progress)) * 100))
      }
    }
    ff.on('progress', handler)

    const logHandler = ({ message }: { message: string }) => {
      console.log('[media] ffmpeg log:', message)
    }
    ff.on('log', logHandler)

    const signal = args.signal
    let aborted = false
    const onAbort = () => {
      aborted = true
      ff.terminate()
      ffmpegSingleton = null
      loadPromise = null
      isReady.value = false
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      const data = await fetchFile(args.file)
      await ff.writeFile(inputName, data)
      onProgress?.(5)

      const ffArgs = buildFfmpegArgs({
        inputName,
        outputName,
        targetExt,
        options: args.options ?? {},
      })

      console.log('[media] exec args:', ffArgs)
      await ff.exec(ffArgs, -1, { signal })
      console.log('[media] exec done')

      if (aborted) throw new DOMException('Conversion cancelled', 'AbortError')

      const out = await ff.readFile(outputName)
      onProgress?.(100)

      const buf = out instanceof Uint8Array ? out : new TextEncoder().encode(out)
      const copy = new Uint8Array(buf.byteLength)
      copy.set(buf)
      return new Blob([copy.buffer], { type: targetMime(targetExt) })
    } finally {
      signal?.removeEventListener('abort', onAbort)
      ff.off('progress', handler)
      ff.off('log', logHandler)
      if (!aborted) {
        try {
          await ff.deleteFile(inputName)
        } catch {
          /* file may not exist on early failure */
        }
        try {
          await ff.deleteFile(outputName)
        } catch {
          /* file may not exist on early failure */
        }
      }
    }
  }

  return { convert, isReady }
}
