import { ref } from 'vue'
import type { DocumentOptions } from '@/types/documentOptions'
import {
  buildPandocOptions,
  documentMime,
  isBinaryWriter,
  readerFor,
  writerFor,
} from '@/utils/pandocFormats'

/**
 * Pandoc WASM signature exposed by `pandoc-wasm`. Re-declared locally so we
 * don't depend on the package shipping its own `.d.ts` (it doesn't).
 */
interface PandocConvertResult {
  stdout: string
  stderr: string
  warnings?: unknown[]
  files?: Record<string, Blob>
  mediaFiles?: Record<string, Blob>
}

interface PandocApi {
  convert: (
    options: Record<string, unknown>,
    stdin: string,
    files: Record<string, Blob | string>,
  ) => Promise<PandocConvertResult>
}

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: DocumentOptions
  onProgress?: (progress: number) => void
}

let pandocPromise: Promise<PandocApi> | null = null
const isReady = ref(false)

async function ensurePandoc(): Promise<PandocApi> {
  if (!pandocPromise) {
    pandocPromise = (async () => {
      // Dynamic import keeps the 50+ MB WASM out of the initial bundle.
      const mod = (await import('pandoc-wasm')) as unknown as PandocApi
      isReady.value = true
      return mod
    })()
  }
  return pandocPromise
}

/**
 * Pandoc-based document conversion. The package ships a single browser
 * entry that lazy-loads its own WASM, so we just import it dynamically and
 * call `convert(options, stdin, files)`.
 *
 * Binary readers (docx/epub) need the input as a Blob in the in-memory
 * filesystem and an `input-files` flag instead of stdin. Binary writers
 * (docx/epub) need an `output-file` so Pandoc emits real bytes; otherwise
 * the result lands in stdout as text.
 */
export function useDocumentConversion() {
  async function convert(args: ConvertArgs): Promise<Blob> {
    const sourceExt = args.sourceExt.toLowerCase()
    const targetExt = args.targetExt.toLowerCase()
    const reader = readerFor(sourceExt)
    const writer = writerFor(targetExt)
    if (!reader) throw new Error(`Unsupported source format: ${sourceExt}`)
    if (!writer) throw new Error(`Unsupported target format: ${targetExt}`)

    args.onProgress?.(5)
    const pandoc = await ensurePandoc()
    args.onProgress?.(20)

    const inputName = `input.${sourceExt}`
    const outputName = `output.${targetExt}`
    const writerIsBinary = isBinaryWriter(targetExt)
    const readerIsBinary = sourceExt === 'docx' || sourceExt === 'epub'

    const opts = buildPandocOptions({
      from: reader,
      to: writer,
      inputFile: readerIsBinary ? inputName : undefined,
      outputFile: writerIsBinary ? outputName : undefined,
      doc: args.options ?? {},
    })

    const stdin = readerIsBinary ? '' : await args.file.text()
    const files: Record<string, Blob | string> = {}
    if (readerIsBinary) {
      files[inputName] = args.file
    }

    args.onProgress?.(50)
    const result = await pandoc.convert(opts, stdin, files)
    args.onProgress?.(85)

    if (writerIsBinary) {
      const outBlob = result.files?.[outputName]
      if (!outBlob) {
        const stderr = result.stderr || 'No output produced'
        throw new Error(stderr)
      }
      args.onProgress?.(100)
      return new Blob([await outBlob.arrayBuffer()], { type: documentMime(targetExt) })
    }

    if (!result.stdout) {
      const stderr = result.stderr || 'Empty conversion output'
      throw new Error(stderr)
    }
    args.onProgress?.(100)
    return new Blob([result.stdout], { type: documentMime(targetExt) })
  }

  return { convert, isReady }
}
