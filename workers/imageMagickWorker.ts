/// <reference lib="webworker" />
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

const logPrefix = '[omni:image-worker]'

function logDebug(...args: unknown[]): void {
  console.log(logPrefix, ...args)
}
function logError(...args: unknown[]): void {
  console.error(logPrefix, ...args)
}

let initPromise: Promise<void> | null = null
let preloadedWasmBuffer: ArrayBuffer | null = null

/** Initialize with a preloaded ArrayBuffer (skips network fetch). */
function ensureInitFromBuffer(buffer: ArrayBuffer): Promise<void> {
  if (!initPromise) {
    logDebug('initializing ImageMagick WASM from preloaded buffer...')
    initPromise = initializeImageMagick(buffer).then(() => {
      logDebug('ImageMagick WASM initialized (from preload)')
    }).catch((e) => {
      logError('ImageMagick WASM init failed', e)
      initPromise = null
      throw e
    })
  }
  return initPromise
}

/** Initialize by fetching the WASM URL (fallback when no preload). */
function ensureInitFromUrl(): Promise<void> {
  if (!initPromise) {
    logDebug('initializing ImageMagick WASM from URL...')
    initPromise = initializeImageMagick(new URL(wasmUrl, self.location.href)).then(() => {
      logDebug('ImageMagick WASM initialized (from URL)')
    }).catch((e) => {
      logError('ImageMagick WASM init failed', e)
      initPromise = null
      throw e
    })
  }
  return initPromise
}

function ensureInit(): Promise<void> {
  if (preloadedWasmBuffer) {
    return ensureInitFromBuffer(preloadedWasmBuffer)
  }
  return ensureInitFromUrl()
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

  logDebug('convert', { id: req.id, source: req.sourceExt, target: req.targetExt, inputSize: bytes.byteLength })

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
      logDebug('convert done', { id: req.id, outputSize: out.byteLength, mime })
      post({ type: 'done', id: req.id, buffer: out.buffer, mime }, [out.buffer])
    })
  })
}

self.addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data

  // Handle preloaded WASM binary from main thread
  if (msg?.type === 'init-wasm') {
    preloadedWasmBuffer = msg.buffer as ArrayBuffer
    logDebug('received preloaded WASM buffer', { size: preloadedWasmBuffer.byteLength })
    // Eagerly initialize now that we have the buffer
    ensureInit().catch(() => {})
    return
  }

  if (msg?.type !== 'convert') return
  try {
    await convert(msg as ImageConvertRequest)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logError('convert failed', { id: msg.id, message }, err)
    post({ type: 'error', id: msg.id, message })
  }
})

// Hint to the main thread that the worker module is loaded. Actual WASM init
// is lazy and happens on the first `convert` call (or when preloaded buffer arrives).
post({ type: 'ready' })

// Suppress "unused variable" for Percentage which we may use later.
void Percentage
