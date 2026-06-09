import type { ImageOptions } from '@/types/imageOptions'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { useSidecar } from '@/composables/useSidecar'
import { uid } from '@/utils/fileSize'
import { createLogger } from '@/utils/logger'

async function getFs() {
  return import('@tauri-apps/plugin-fs')
}
async function getPath() {
  return import('@tauri-apps/api/path')
}

const log = createLogger('desktop-image')

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: ImageOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Desktop image conversion via ImageMagick sidecar (`magick` CLI).
 * Writes input to temp (using BaseDirectory.Temp + relative filename),
 * invokes `magick convert`, reads the output.
 */
export function useDesktopImageConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const id = uid('deskimg')
    const inputFileName = `${id}_input.${sourceExt}`
    const outputFileName = `${id}_output.${targetExt}`
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, inputFileName)
    const outputPath = await path.join(tmpBase, outputFileName)

    log.info('convert start', { file: file.name, source: sourceExt, target: targetExt })
    args.onProgress?.(5)

    try {
      // Write input file to temp with explicit baseDir
      const inputBuf = new Uint8Array(await file.arrayBuffer())
      await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(15)

      // Verify file was written
      const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
      if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

      // Build magick args
      const magickArgs: string[] = []

      if (options?.quality && options.quality > 0) {
        magickArgs.push('-quality', String(options.quality))
      }
      if (options?.width || options?.height) {
        const w = options.width || ''
        const h = options.height || ''
        magickArgs.push('-resize', `${w}x${h}`)
      }

      magickArgs.push(inputPath, outputPath)

      await sidecar.run('binaries/magick', {
        args: magickArgs,
        signal,
        onStderr: (line) => log.debug('magick', { line: line.slice(0, 200) }),
      })

      args.onProgress?.(85)

      if (signal?.aborted) {
        throw new DOMException('Conversion cancelled', 'AbortError')
      }

      const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
      if (!outputExists) {
        throw new Error('ImageMagick produced no output')
      }

      const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(100)

      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', bmp: 'image/bmp',
        tif: 'image/tiff', tiff: 'image/tiff',
        ico: 'image/x-icon',
      }
      const mime = mimeMap[targetExt.toLowerCase()] ?? 'application/octet-stream'
      log.info('convert done', { file: file.name, outputSize: outBuf.byteLength })
      return new Blob([outBuf], { type: mime })
    } finally {
      try { await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
      try { await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
    }
  }

  return { convert }
}
