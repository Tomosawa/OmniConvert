/**
 * Conversion options for the FFmpeg engine. All fields are optional —
 * the worker chooses sensible defaults when omitted.
 */
export interface MediaOptions {
  /** Audio bitrate, e.g. '128k', '192k', '320k'. */
  audioBitrate?: string
  /** Video bitrate, e.g. '1M', '2M', '5M'. */
  videoBitrate?: string
  /** Output frame rate (video only). */
  fps?: number
  /** Output sample rate (audio only). */
  sampleRate?: number
  /** Output dimensions; both must be specified together. */
  resolution?: { width: number; height: number }
  /** When true, drop the video stream and produce audio-only output. */
  audioOnly?: boolean
}

/** Family of the target format — drives default codec / args picking. */
export type MediaTargetKind = 'audio' | 'video'

export interface MediaArgsContext {
  inputName: string
  outputName: string
  targetExt: string
  options: MediaOptions
}
