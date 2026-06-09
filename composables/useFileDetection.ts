import type { DetectedFile, FileCategory, ImageDimensions } from '@/types/file'
import type { MediaMetadata } from '@/types/mediaOptions'
import { categoryOf, normaliseExt } from '@/utils/formatTable'
import { extensionOf } from '@/utils/fileSize'
import { probeMagic } from '@/utils/magicNumber'
import { createLogger } from '@/utils/logger'

const log = createLogger('detect')

/**
 * How many leading bytes to read for magic-number probing.
 * 64 bytes is plenty for every signature in the table.
 */
const PROBE_BYTES = 64

/**
 * Detect a file's category, MIME and extension using extension + magic-number
 * checks. Pure async function — safe to call from any context.
 *
 * Strategy:
 * 1. Read leading bytes and probe the magic table.
 * 2. Take the file's declared extension as the strong signal for routing
 *    (users may rename files; we still trust their intent).
 * 3. If a magic match exists, mark `magicMatch = true` when it agrees with
 *    the declared extension family, otherwise `false` (UI can warn).
 */
export async function detectFile(file: File): Promise<DetectedFile> {
  const declaredExt = normaliseExt(extensionOf(file.name))
  const declaredCategory: FileCategory = categoryOf(declaredExt)

  log.debug('detecting', { name: file.name, declaredExt, declaredCategory, declaredMime: file.type, size: file.size })

  const head = await readHead(file, PROBE_BYTES)
  const matches = probeMagic(head)

  let magicMatch = false
  let mime = file.type || ''
  let ext = declaredExt

  if (matches.length > 0) {
    const sameFamily = matches.find((m) => normaliseExt(m.ext) === declaredExt)
    if (sameFamily) {
      magicMatch = true
      mime = sameFamily.mime || mime
    } else {
      const firstMatch = matches[0]
      if (firstMatch) {
        mime = firstMatch.mime || mime
        if (!declaredExt) ext = normaliseExt(firstMatch.ext)
      }
      log.warn('magic mismatch', { name: file.name, declaredExt, magicExts: matches.map((m) => m.ext) })
    }
  } else if (declaredCategory === 'document') {
    // Plain-text-y documents (md/html/txt/...) rarely have magic numbers,
    // so trust the extension when its category is 'document'.
    magicMatch = true
  }

  const category = categoryOf(ext)

  let imageDimensions: ImageDimensions | undefined
  if (category === 'image') {
    imageDimensions = await loadImageDimensions(file)
    if (imageDimensions) {
      log.debug('image dimensions', { name: file.name, width: imageDimensions.width, height: imageDimensions.height })
    }
  }

  let mediaMetadata: MediaMetadata | undefined
  if (category === 'media') {
    mediaMetadata = await probeMediaMetadata(file)
    if (mediaMetadata) {
      log.debug('media metadata', { name: file.name, ...mediaMetadata })
    }
  }

  const result: DetectedFile = {
    file,
    category,
    mime,
    ext,
    magicMatch,
    imageDimensions,
    mediaMetadata,
  }

  log.info('detected', { name: file.name, ext, category, mime, magicMatch, imageDimensions, mediaMetadata })
  return result
}

function loadImageDimensions(file: File): Promise<ImageDimensions | undefined> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(undefined)
      return
    }
    const img = new Image()
    let settled = false
    const done = (dims?: ImageDimensions) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(dims)
    }
    const timer = setTimeout(() => done(undefined), 1000)
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      done({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      done(undefined)
    }
    img.src = url
  })
}

async function readHead(file: File, length: number): Promise<Uint8Array> {
  const slice = file.slice(0, Math.min(length, file.size))
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

async function probeMediaMetadata(file: File): Promise<MediaMetadata | undefined> {
  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { fetchFile } = await import('@ffmpeg/util')

    const { useWasmPreload } = await import('@/composables/useWasmPreload')
    const { getPreloadedWasm } = useWasmPreload()
    const preloadedWasm = getPreloadedWasm('ffmpeg')

    let finalWasmUrl: string
    let blobUrl: string | null = null

    const coreUrl = (await import('@ffmpeg/core?url')).default

    if (preloadedWasm) {
      const wasmBlob = new Blob([preloadedWasm], { type: 'application/wasm' })
      finalWasmUrl = URL.createObjectURL(wasmBlob)
      blobUrl = finalWasmUrl
      log.info('using preloaded WASM for probe')
    } else {
      finalWasmUrl = (await import('@ffmpeg/core/wasm?url')).default
    }

    const ff = new FFmpeg()
    await ff.load({
      coreURL: coreUrl,
      wasmURL: finalWasmUrl,
    })

    const ext = file.name.split('.').pop() || 'bin'
    const inputName = `probe_${Date.now()}.${ext}`
    await ff.writeFile(inputName, await fetchFile(file))

    const outName = `probe_out_${Date.now()}.txt`
    await ff.ffprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputName,
      '-o', outName,
    ])

    const raw = await ff.readFile(outName)
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)

    try { await ff.deleteFile(inputName) } catch {}
    try { await ff.deleteFile(outName) } catch {}

    // 清理 blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
    }

    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(text) } catch { return undefined }

    const streams = Array.isArray(parsed.streams) ? parsed.streams as Record<string, unknown>[] : []
    const format = parsed.format as Record<string, unknown> | undefined

    const result: MediaMetadata = {}
    const videoStream = streams.find((s) => s.codec_type === 'video')
    const audioStream = streams.find((s) => s.codec_type === 'audio')

    if (videoStream) {
      result.width = Number(videoStream.width) || undefined
      result.height = Number(videoStream.height) || undefined
      result.videoCodec = String(videoStream.codec_name || '')
      if (videoStream.r_frame_rate) {
        const parts = String(videoStream.r_frame_rate).split('/')
        if (parts.length === 2 && Number(parts[1]) > 0) {
          result.fps = Math.round(Number(parts[0]) / Number(parts[1]))
        }
      }
      if (videoStream.bit_rate) {
        result.videoBitrate = Math.round(Number(videoStream.bit_rate) / 1000)
      }
    }

    if (audioStream) {
      result.audioCodec = String(audioStream.codec_name || '')
      result.sampleRate = Number(audioStream.sample_rate) || undefined
      if (audioStream.bit_rate) {
        result.audioBitrate = Math.round(Number(audioStream.bit_rate) / 1000)
      }
      result.bitDepth = Number(audioStream.bits_per_sample) || undefined
    }

    if (format?.duration) {
      result.duration = Math.round(Number(format.duration))
    }

    return result
  } catch (e) {
    log.warn('media probe failed', { name: file.name, error: String(e) })
    return undefined
  }
}

export function useFileDetection() {
  return { detectFile }
}
