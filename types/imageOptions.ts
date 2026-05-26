/**
 * Conversion options for the ImageMagick engine. All fields are optional —
 * sensible defaults are applied by the worker when omitted.
 */
export interface ImageOptions {
  /** Output quality 1-100 (JPG / WebP / similar lossy formats). */
  quality?: number
  /** Optional resize. Width and/or height; aspect is preserved by default. */
  resize?: {
    width?: number
    height?: number
  }
  /** Strip metadata (EXIF, profiles) on output. */
  stripMetadata?: boolean
}

/** Per-task progress message emitted by the engine worker. */
export interface ImageProgressMessage {
  type: 'progress'
  id: string
  /** 0-100 */
  progress: number
}

/** Final success message emitted by the engine worker. */
export interface ImageDoneMessage {
  type: 'done'
  id: string
  /** Raw bytes of the converted image. */
  buffer: ArrayBuffer
  mime: string
}

/** Error message emitted by the engine worker. */
export interface ImageErrorMessage {
  type: 'error'
  id: string
  message: string
}

/** Engine-ready signal emitted once after WASM initialisation. */
export interface ImageReadyMessage {
  type: 'ready'
}

export type ImageWorkerOutbound =
  | ImageProgressMessage
  | ImageDoneMessage
  | ImageErrorMessage
  | ImageReadyMessage

/** Convert request sent from the main thread to the worker. */
export interface ImageConvertRequest {
  type: 'convert'
  id: string
  buffer: ArrayBuffer
  sourceExt: string
  targetExt: string
  options: ImageOptions
}

export type ImageWorkerInbound = ImageConvertRequest
