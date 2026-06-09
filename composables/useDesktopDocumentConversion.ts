import type { DocumentOptions } from '@/types/documentOptions'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { useSidecar } from '@/composables/useSidecar'
import {
  buildPandocOptions,
  documentMime,
  isBinaryWriter,
  readerFor,
  writerFor,
} from '@/utils/pandocFormats'
import { uid } from '@/utils/fileSize'
import { createLogger } from '@/utils/logger'

async function getFs() {
  return import('@tauri-apps/plugin-fs')
}
async function getPath() {
  return import('@tauri-apps/api/path')
}

const log = createLogger('desktop-document')

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: DocumentOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Build CLI args for Pandoc from our option structure.
 * Converts the JSON option blob into flat `--flag value` CLI arguments.
 */
function buildCliArgs(opts: Record<string, unknown>, inputPath: string, outputPath: string): string[] {
  const args: string[] = []

  if (opts.from) args.push('--from', String(opts.from))
  if (opts.to) args.push('--to', String(opts.to))

  if (opts.standalone) args.push('--standalone')
  if (opts.toc) args.push('--toc')

  if (Array.isArray(opts.css)) {
    for (const css of opts.css) {
      args.push('--css', String(css))
    }
  }

  // Extract media from binary inputs (docx/epub)
  if (opts['extract-media']) {
    args.push('--extract-media', String(opts['extract-media']))
  }

  args.push(inputPath)
  args.push('-o', outputPath)

  return args
}

/**
 * Desktop document conversion via Pandoc sidecar CLI.
 *
 * Handles two special cases beyond the WASM version:
 * 1. PDF output: Pandoc generates standalone HTML, which is the most
 *    portable output without bundling a LaTeX distribution.
 * 2. All other formats use the same reader/writer mapping as WASM.
 */
export function useDesktopDocumentConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const srcExt = sourceExt.toLowerCase()
    const tgtExt = targetExt.toLowerCase()

    const isPdfTarget = tgtExt === 'pdf'
    const effectiveTarget = isPdfTarget ? 'html' : tgtExt

    const reader = readerFor(srcExt)
    const writer = writerFor(effectiveTarget)
    if (!reader) throw new Error(`Unsupported source format: ${srcExt}`)
    if (!writer) throw new Error(`Unsupported target format: ${effectiveTarget}`)

    log.info('convert start', {
      file: file.name,
      source: srcExt,
      target: tgtExt,
      effectiveTarget,
      reader,
      writer,
    })
    args.onProgress?.(5)

    const id = uid('deskdoc')
    const inputFileName = `${id}_input.${srcExt}`
    const outExt = isPdfTarget ? 'html' : tgtExt
    const outputFileName = `${id}_output.${outExt}`
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, inputFileName)
    const outputPath = await path.join(tmpBase, outputFileName)

    const readerIsBinary = srcExt === 'docx' || srcExt === 'epub'
    const writerIsBinary = isBinaryWriter(effectiveTarget)

    try {
      // Write input file to temp with explicit baseDir
      if (readerIsBinary) {
        const inputBuf = new Uint8Array(await file.arrayBuffer())
        await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
      } else {
        const text = await file.text()
        const encoder = new TextEncoder()
        await fs.writeFile(inputFileName, encoder.encode(text), { baseDir: BaseDirectory.Temp })
      }

      // Verify file was written
      const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
      if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

      args.onProgress?.(15)

      const pandocOpts = buildPandocOptions({
        from: reader,
        to: writer,
        inputFile: readerIsBinary ? inputPath : undefined,
        outputFile: writerIsBinary ? outputPath : undefined,
        extractMedia: readerIsBinary,
        doc: options ?? {},
      })

      if (isPdfTarget) {
        pandocOpts.standalone = true
      }

      const cliArgs = buildCliArgs(pandocOpts, inputPath, outputPath)

      log.debug('pandoc cli args', { args: cliArgs.join(' ') })
      args.onProgress?.(30)

      const result = await sidecar.run('binaries/pandoc', {
        args: cliArgs,
        signal,
        onStderr: (line) => log.debug('pandoc', { line: line.slice(0, 200) }),
      })

      args.onProgress?.(85)

      if (signal?.aborted) {
        throw new DOMException('Conversion cancelled', 'AbortError')
      }

      if (result.code !== 0) {
        const err = result.stderr || 'Pandoc conversion failed'
        log.error('pandoc failed', { code: result.code, stderr: err })
        throw new Error(err)
      }

      const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
      if (!outputExists) {
        if (result.stdout) {
          const encoder = new TextEncoder()
          const mime = isPdfTarget ? 'text/html' : documentMime(tgtExt)
          const blob = new Blob([encoder.encode(result.stdout)], { type: mime })
          args.onProgress?.(100)
          log.info('convert done (stdout)', { file: file.name, outputSize: blob.size })
          return blob
        }
        throw new Error('Pandoc produced no output')
      }

      const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(100)

      const mime = isPdfTarget ? 'text/html' : documentMime(tgtExt)
      log.info('convert done', {
        file: file.name,
        outputSize: outBuf.byteLength,
        isPdfAsHtml: isPdfTarget,
      })
      return new Blob([outBuf], { type: mime })
    } finally {
      try { await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
      try { await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
    }
  }

  return { convert }
}
