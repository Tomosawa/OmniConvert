import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreUrl from '@ffmpeg/core?url'
import coreWasmUrl from '@ffmpeg/core/wasm?url'
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

      const { getPreloadedWasm } = useWasmPreload()
      const preloadedWasm = getPreloadedWasm('ffmpeg')

      let finalWasmUrl = coreWasmUrl
      let blobUrl: string | null = null

      if (preloadedWasm) {
        const wasmBlob = new Blob([preloadedWasm], { type: 'application/wasm' })
        finalWasmUrl = URL.createObjectURL(wasmBlob)
        blobUrl = finalWasmUrl
      }

      await ff.load({
        coreURL: coreUrl,
        wasmURL: finalWasmUrl,
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
      if (typeof progress === 'number' && Number.isFinite(progress) && progress >= 0 && progress <= 1) {
        const mapped = Math.round(progress * 100)
        onProgress?.(mapped)
        console.log('[media] onProgress called with:', mapped)
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

      await ff.exec(ffArgs)

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