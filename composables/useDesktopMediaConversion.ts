import type { MediaOptions } from '@/types/mediaOptions'
import { useSidecar } from '@/composables/useSidecar'
import { buildFfmpegArgs, targetMime } from '@/utils/ffmpegArgs'
import { uid } from '@/utils/fileSize'
import { createLogger } from '@/utils/logger'

async function getFs() {
  return import('@tauri-apps/plugin-fs')
}
async function getPath() {
  return import('@tauri-apps/api/path')
}

const log = createLogger('desktop-media')

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: MediaOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Estimate media duration from file size for progress parsing.
 * This is a rough heuristic; FFmpeg outputs the real duration in its logs.
 */
function estimateDuration(fileSize: number): number {
  // Rough: assume 1Mbps bitrate → ~125KB/s
  return Math.max(1, Math.round(fileSize / 125_000))
}

/**
 * Desktop media conversion via FFmpeg sidecar.
 * Writes input to a temp file, invokes `ffmpeg`, reads the output.
 */
export function useDesktopMediaConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const id = uid('deskmedia')
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, `${id}_input.${sourceExt}`)
    const outputPath = await path.join(tmpBase, `${id}_output.${targetExt}`)

    log.info('convert start', { file: file.name, source: sourceExt, target: targetExt, size: file.size })
    args.onProgress?.(3)

    try {
      const inputBuf = new Uint8Array(await file.arrayBuffer())
      await fs.writeFile(inputPath, inputBuf)
      args.onProgress?.(8)

      const ffArgs = buildFfmpegArgs({
        inputName: inputPath,
        outputName: outputPath,
        targetExt,
        options: options ?? {},
        desktop: true,
      })

      const estimatedDuration = estimateDuration(file.size)

      await sidecar.run(
        'binaries/ffmpeg',
        {
          args: ffArgs,
          signal,
          onProgress: (p) => {
            args.onProgress?.(Math.max(8, Math.min(95, p.percent)))
          },
          onStderr: (line) => {
            log.debug('ffmpeg', { line: line.slice(0, 300) })
          },
        },
        estimatedDuration,
      )

      if (signal?.aborted) {
        throw new DOMException('Conversion cancelled', 'AbortError')
      }

      args.onProgress?.(95)

      const outputExists = await fs.exists(outputPath)
      if (!outputExists) {
        throw new Error('FFmpeg produced no output file')
      }

      const outBuf = await fs.readFile(outputPath)
      if (outBuf.byteLength === 0) {
        throw new Error('FFmpeg produced empty output')
      }

      args.onProgress?.(100)
      log.info('convert done', { file: file.name, outputSize: outBuf.byteLength })
      return new Blob([outBuf], { type: targetMime(targetExt) })
    } finally {
      try { await fs.remove(inputPath) } catch { /* ok */ }
      try { await fs.remove(outputPath) } catch { /* ok */ }
    }
  }

  return { convert }
}
