import type { MediaArgsContext, MediaTargetKind } from '@/types/mediaOptions'

/** Audio-only output extensions. Everything else is treated as video. */
const AUDIO_TARGETS = new Set(['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'])

/** Default video codec per output container. */
const VIDEO_CODEC_BY_EXT: Readonly<Record<string, string>> = {
  mp4: 'libx264',
  mov: 'libx264',
  mkv: 'libx264',
  webm: 'libvpx-vp9',
  avi: 'mpeg4',
}

/** Default audio codec per output container. */
const AUDIO_CODEC_BY_EXT: Readonly<Record<string, string>> = {
  mp3: 'libmp3lame',
  wav: 'pcm_s16le',
  aac: 'aac',
  m4a: 'aac',
  flac: 'flac',
  ogg: 'libvorbis',
  // video container audio defaults
  mp4: 'aac',
  mov: 'aac',
  mkv: 'aac',
  webm: 'libopus',
  avi: 'libmp3lame',
}

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
}

export function targetKind(ext: string): MediaTargetKind {
  return AUDIO_TARGETS.has(ext.toLowerCase()) ? 'audio' : 'video'
}

export function targetMime(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Build the FFmpeg argument list for a single conversion.
 *
 * Pure function — no FFmpeg runtime touched. Easy to unit-test.
 *
 * Layout: `-i <input> [video opts] [audio opts] [filters] <output>`.
 * Default behaviours:
 * - Audio targets: drop video stream (`-vn`), apply audio codec
 * - Video targets: keep both streams, default codec by container
 * - `audioOnly = true` forces drop video even on video container
 * - Resolution / fps via `-vf scale=W:H,fps=N` filter chain
 */
export function buildFfmpegArgs(ctx: MediaArgsContext): string[] {
  const ext = ctx.targetExt.toLowerCase()
  const kind = targetKind(ext)
  const opts = ctx.options
  const args: string[] = ['-i', ctx.inputName, '-y']

  const audioOnly = kind === 'audio' || opts.audioOnly === true

  if (audioOnly) {
    args.push('-vn')
  } else {
    args.push('-c:v', VIDEO_CODEC_BY_EXT[ext] ?? 'libx264')
    if (opts.videoBitrate) args.push('-b:v', opts.videoBitrate)
    const filters: string[] = []
    if (opts.resolution?.width && opts.resolution?.height) {
      filters.push(`scale=${opts.resolution.width}:${opts.resolution.height}`)
    }
    if (opts.fps && opts.fps > 0) {
      filters.push(`fps=${opts.fps}`)
    }
    if (filters.length > 0) {
      args.push('-vf', filters.join(','))
    }
  }

  args.push('-c:a', AUDIO_CODEC_BY_EXT[ext] ?? 'aac')
  if (opts.audioBitrate) args.push('-b:a', opts.audioBitrate)
  if (opts.sampleRate && opts.sampleRate > 0) args.push('-ar', String(opts.sampleRate))

  args.push(ctx.outputName)
  return args
}

/** Common bitrate suggestions exposed to the UI. */
export const AUDIO_BITRATES = ['96k', '128k', '192k', '256k', '320k'] as const
export const VIDEO_BITRATES = ['500k', '1M', '2M', '5M', '10M'] as const
export const SAMPLE_RATES = [22050, 44100, 48000] as const
export const FRAME_RATES = [24, 25, 30, 50, 60] as const
