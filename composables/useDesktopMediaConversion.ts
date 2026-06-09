import type { MediaOptions } from '@/types/mediaOptions'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
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
 * Writes input to temp (using BaseDirectory.Temp + relative filename),
 * invokes `ffmpeg`, reads the output.
 */
export function useDesktopMediaConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const id = uid('deskmedia')
    const inputFileName = `${id}_input.${sourceExt}`
    const outputFileName = `${id}_output.${targetExt}`
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, inputFileName)
    const outputPath = await path.join(tmpBase, outputFileName)

    log.info('convert start', { file: file.name, source: sourceExt, target: targetExt, size: file.size })
    args.onProgress?.(3)

    try {
      const inputBuf = new Uint8Array(await file.arrayBuffer())
      await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(8)

      // Verify file was written
      const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
      if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

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

      const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
      if (!outputExists) {
        throw new Error('FFmpeg produced no output file')
      }

      const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })
      if (outBuf.byteLength === 0) {
        throw new Error('FFmpeg produced empty output')
      }

      args.onProgress?.(100)
      log.info('convert done', { file: file.name, outputSize: outBuf.byteLength })
      return new Blob([outBuf], { type: targetMime(targetExt) })
    } finally {
      try { await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
      try { await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
    }
  }

  return { convert }
}
