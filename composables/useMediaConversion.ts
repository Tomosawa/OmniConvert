import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreUrl from '@ffmpeg/core-mt?url'
import coreWasmUrl from '@ffmpeg/core-mt/wasm?url'
import coreWorkerUrl from '@ffmpeg/core-mt/worker?url'
import type { MediaOptions } from '@/types/mediaOptions'
import { buildFfmpegArgs, targetMime } from '@/utils/ffmpegArgs'

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: MediaOptions
  onProgress?: (progress: number) => void
}

let ffmpegSingleton: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null
const isReady = ref(false)

async function ensureFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton
  if (!loadPromise) {
    loadPromise = (async () => {
      const ff = new FFmpeg()
      await ff.load({
        coreURL: coreUrl,
        wasmURL: coreWasmUrl,
        workerURL: coreWorkerUrl,
      })
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
      if (typeof progress === 'number' && Number.isFinite(progress)) {
        onProgress?.(Math.round(Math.max(0, Math.min(1, progress)) * 100))
      }
    }
    ff.on('progress', handler)

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

      const out = await ff.readFile(outputName)
      onProgress?.(100)

      const buf = out instanceof Uint8Array ? out : new TextEncoder().encode(out)
      // Copy into a fresh ArrayBuffer so the Blob doesn't reference SharedArrayBuffer
      // (FFmpeg's mt build returns Uint8Array views over a SAB; Blob refuses that).
      const copy = new Uint8Array(buf.byteLength)
      copy.set(buf)
      return new Blob([copy.buffer], { type: targetMime(targetExt) })
    } finally {
      ff.off('progress', handler)
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

  return { convert, isReady }
}
