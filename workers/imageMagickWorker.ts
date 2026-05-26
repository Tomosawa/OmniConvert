/// <reference lib="webworker" />
/**
 * ImageMagick Web Worker.
 *
 * Loads the magick-wasm module on first use, then processes `convert` requests
 * from the main thread. We deliberately keep this worker tiny — all the
 * branching (engine selection, queue, retry, etc.) lives in the main thread
 * stores so the worker stays trivially restartable.
 */
import {
  ImageMagick,
  MagickFormat,
  MagickGeometry,
  Percentage,
  initializeImageMagick,
} from '@imagemagick/magick-wasm'
import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'
import type {
  ImageConvertRequest,
  ImageOptions,
  ImageWorkerOutbound,
} from '@/types/imageOptions'

let initPromise: Promise<void> | null = null

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeImageMagick(new URL(wasmUrl, self.location.href))
  }
  return initPromise
}

const post = (msg: ImageWorkerOutbound, transfer: Transferable[] = []) => {
  ;(self as unknown as Worker).postMessage(msg, transfer)
}

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
  heic: 'image/heic',
}

function resolveFormat(ext: string): MagickFormat {
  const e = ext.toLowerCase()
  const table: Record<string, MagickFormat> = {
    jpg: MagickFormat.Jpg,
    jpeg: MagickFormat.Jpeg,
    png: MagickFormat.Png,
    gif: MagickFormat.Gif,
    webp: MagickFormat.WebP,
    bmp: MagickFormat.Bmp,
    tif: MagickFormat.Tiff,
    tiff: MagickFormat.Tiff,
    ico: MagickFormat.Ico,
    heic: MagickFormat.Heic,
  }
  const fmt = table[e]
  if (!fmt) throw new Error(`Unsupported image format: ${ext}`)
  return fmt
}

async function convert(req: ImageConvertRequest): Promise<void> {
  await ensureInit()
  post({ type: 'progress', id: req.id, progress: 5 })

  const sourceFormat = resolveFormat(req.sourceExt)
  const targetFormat = resolveFormat(req.targetExt)
  const opts: ImageOptions = req.options
  const bytes = new Uint8Array(req.buffer)

  await ImageMagick.read(bytes, sourceFormat, async (image) => {
    post({ type: 'progress', id: req.id, progress: 35 })

    if (opts.resize?.width || opts.resize?.height) {
      const w = opts.resize.width ?? 0
      const h = opts.resize.height ?? 0
      image.resize(new MagickGeometry(w, h))
    }

    if (typeof opts.quality === 'number' && opts.quality > 0 && opts.quality <= 100) {
      image.quality = opts.quality
    } else if (
      targetFormat === MagickFormat.Jpg ||
      targetFormat === MagickFormat.Jpeg ||
      targetFormat === MagickFormat.WebP
    ) {
      image.quality = 90
    }

    if (opts.stripMetadata) {
      image.strip()
    }

    image.format = targetFormat
    post({ type: 'progress', id: req.id, progress: 70 })

    await image.write(targetFormat, (data: Uint8Array) => {
      const out = new Uint8Array(data.length)
      out.set(data)
      post({ type: 'progress', id: req.id, progress: 100 })
      const mime = MIME_BY_EXT[req.targetExt.toLowerCase()] ?? 'application/octet-stream'
      post({ type: 'done', id: req.id, buffer: out.buffer, mime }, [out.buffer])
    })
  })
}

self.addEventListener('message', async (event: MessageEvent<ImageConvertRequest>) => {
  const req = event.data
  if (req?.type !== 'convert') return
  try {
    await convert(req)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    post({ type: 'error', id: req.id, message })
  }
})

// Hint to the main thread that the worker module is loaded. Actual WASM init
// is lazy and happens on the first `convert` call.
post({ type: 'ready' })

// Suppress "unused variable" for Percentage which we may use later.
void Percentage
