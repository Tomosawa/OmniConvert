import type { AudioChannelLayout, AudioCodec, AudioRateMode, MediaArgsContext, MediaTargetKind, VideoCodec, VideoPreset, VideoProfile } from '@/types/mediaOptions'

const AUDIO_TARGETS = new Set(['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'])

const DEFAULT_VIDEO_CODEC_BY_EXT: Readonly<Record<string, VideoCodec>> = {
  mp4: 'libx264',
  mov: 'libx264',
  mkv: 'libx264',
  webm: 'libvpx-vp9',
  avi: 'mpeg4',
}

const DEFAULT_AUDIO_CODEC_BY_EXT: Readonly<Record<string, AudioCodec>> = {
  mp3: 'libmp3lame',
  wav: 'pcm_s16le',
  aac: 'aac',
  m4a: 'aac',
  flac: 'flac',
  ogg: 'libvorbis',
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

export const AVAILABLE_VIDEO_CODECS: Readonly<Record<string, readonly VideoCodec[]>> = {
  mp4: ['libx264', 'libx265', 'mpeg4'],
  mov: ['libx264', 'libx265', 'mpeg4'],
  mkv: ['libx264', 'libx265', 'libvpx-vp9', 'mpeg4'],
  webm: ['libvpx-vp9'],
  avi: ['libx264', 'mpeg4'],
}

export const AVAILABLE_AUDIO_CODECS: Readonly<Record<string, readonly AudioCodec[]>> = {
  mp4: ['aac', 'libmp3lame', 'ac3', 'flac'],
  mov: ['aac', 'libmp3lame', 'ac3'],
  mkv: ['aac', 'libmp3lame', 'flac', 'libvorbis', 'libopus', 'ac3'],
  webm: ['libopus', 'libvorbis'],
  avi: ['libmp3lame', 'aac', 'ac3'],
  mp3: ['libmp3lame'],
  wav: ['pcm_s16le', 'pcm_s24le', 'pcm_f32le'],
  aac: ['aac'],
  m4a: ['aac'],
  flac: ['flac'],
  ogg: ['libvorbis', 'libopus'],
}

export const VIDEO_PROFILES: Readonly<Record<string, readonly VideoProfile[]>> = {
  libx264: ['baseline', 'main', 'high', 'high10', 'high422', 'high444'],
  libx265: ['main', 'main10'],
}

export const VIDEO_PRESETS: readonly VideoPreset[] = [
  'ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow',
]

export const VIDEO_BITRATES = ['500k', '1M', '2M', '5M', '10M', '20M', '50M'] as const

export const VIDEO_CRF_RANGE: Readonly<{ min: number; max: number; default: number; step: number }> = {
  min: 0, max: 51, default: 23, step: 1,
}

export const VIDEO_GOP_SIZES = [24, 25, 30, 50, 60, 100, 120, 250] as const

export const FRAME_RATES = [15, 24, 25, 30, 48, 50, 60, 120] as const

export const RESOLUTION_PRESETS: ReadonlyArray<{ label: string; width: number; height: number }> = [
  { label: '4K UHD', width: 3840, height: 2160 },
  { label: '2K QHD', width: 2560, height: 1440 },
  { label: '1080p FHD', width: 1920, height: 1080 },
  { label: '720p HD', width: 1280, height: 720 },
  { label: '480p SD', width: 854, height: 480 },
  { label: '360p', width: 640, height: 360 },
]

export const PIX_FMTS: readonly string[] = [
  'yuv420p', 'yuv422p', 'yuv444p', 'yuv420p10le', 'yuv422p10le', 'yuv444p10le', 'nv12', 'nv21',
]

export const AUDIO_BITRATES_BY_FORMAT: Readonly<Record<string, readonly string[]>> = {
  mp3: ['64k', '96k', '128k', '160k', '192k', '256k', '320k'],
  aac: ['64k', '96k', '128k', '160k', '192k', '256k', '320k'],
  m4a: ['64k', '96k', '128k', '160k', '192k', '256k', '320k'],
  ogg: ['64k', '96k', '128k', '160k', '192k', '256k', '320k', '500k'],
  ac3: ['128k', '192k', '256k', '320k', '384k', '448k', '640k'],
  wav: [],
  flac: [],
}

export const AUDIO_VBR_QUALITY: Readonly<Record<string, readonly number[]>> = {
  libmp3lame: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  libvorbis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  libopus: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510],
}

export const AUDIO_RATE_MODES_BY_CODEC: Readonly<Record<string, readonly AudioRateMode[]>> = {
  libmp3lame: ['cbr', 'vbr', 'abr'],
  aac: ['cbr', 'vbr'],
  libopus: ['cbr', 'vbr'],
  libvorbis: ['vbr'],
  ac3: ['cbr'],
  flac: [],
  pcm_s16le: [],
  pcm_s24le: [],
  pcm_f32le: [],
}

export const AUDIO_CHANNEL_OPTIONS: Readonly<Record<string, readonly AudioChannelLayout[]>> = {
  libmp3lame: ['mono', 'stereo', 'joint_stereo'],
  aac: ['mono', 'stereo'],
  libopus: ['mono', 'stereo'],
  libvorbis: ['mono', 'stereo'],
  ac3: ['mono', 'stereo', '5.1'],
  flac: ['mono', 'stereo'],
  pcm_s16le: ['mono', 'stereo'],
  pcm_s24le: ['mono', 'stereo'],
  pcm_f32le: ['mono', 'stereo'],
}

export const SAMPLE_RATES_BY_FORMAT: Readonly<Record<string, readonly number[]>> = {
  mp3: [22050, 32000, 44100, 48000],
  aac: [22050, 32000, 44100, 48000, 88200, 96000],
  m4a: [22050, 32000, 44100, 48000, 88200, 96000],
  ogg: [22050, 32000, 44100, 48000, 88200, 96000, 192000],
  ac3: [32000, 44100, 48000],
  wav: [22050, 32000, 44100, 48000, 88200, 96000, 176400, 192000],
  flac: [22050, 32000, 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000],
}

export const BIT_DEPTHS_BY_FORMAT: Readonly<Record<string, readonly (16 | 24 | 32)[]>> = {
  wav: [16, 24, 32],
  flac: [16, 24, 32],
  aac: [16, 24],
  m4a: [16, 24],
  ogg: [16],
  mp3: [],
}

export function targetKind(ext: string): MediaTargetKind {
  return AUDIO_TARGETS.has(ext.toLowerCase()) ? 'audio' : 'video'
}

export function targetMime(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream'
}

export function getDefaultVideoCodec(ext: string): VideoCodec {
  return DEFAULT_VIDEO_CODEC_BY_EXT[ext.toLowerCase()] ?? 'libx264'
}

export function getDefaultAudioCodec(ext: string): AudioCodec {
  return DEFAULT_AUDIO_CODEC_BY_EXT[ext.toLowerCase()] ?? 'aac'
}

export function getAvailableVideoCodecs(ext: string): readonly VideoCodec[] {
  return AVAILABLE_VIDEO_CODECS[ext.toLowerCase()] ?? ['libx264']
}

export function getAvailableAudioCodecs(ext: string): readonly AudioCodec[] {
  return AVAILABLE_AUDIO_CODECS[ext.toLowerCase()] ?? ['aac']
}

export function getVideoProfiles(codec: string): readonly VideoProfile[] {
  return VIDEO_PROFILES[codec] ?? []
}

export function getAudioBitrates(extOrCodec: string): readonly string[] {
  return AUDIO_BITRATES_BY_FORMAT[extOrCodec.toLowerCase()] ?? ['64k', '128k', '192k', '256k', '320k']
}

export function getSampleRates(ext: string): readonly number[] {
  return SAMPLE_RATES_BY_FORMAT[ext.toLowerCase()] ?? [22050, 44100, 48000]
}

export function getBitDepths(ext: string): readonly (16 | 24 | 32)[] {
  return BIT_DEPTHS_BY_FORMAT[ext.toLowerCase()] ?? []
}

export function formatSupportsBitrate(ext: string): boolean {
  return (AUDIO_BITRATES_BY_FORMAT[ext.toLowerCase()] ?? []).length > 0
}

export function formatSupportsBitDepth(ext: string): boolean {
  return (BIT_DEPTHS_BY_FORMAT[ext.toLowerCase()] ?? []).length > 0
}

export function codecSupportsVbr(codec: string): boolean {
  return (AUDIO_RATE_MODES_BY_CODEC[codec] ?? []).includes('vbr')
}

export function getAudioRateModes(codec: string): readonly AudioRateMode[] {
  return AUDIO_RATE_MODES_BY_CODEC[codec] ?? ['cbr']
}

export function getAudioChannelOptions(codec: string): readonly AudioChannelLayout[] {
  return AUDIO_CHANNEL_OPTIONS[codec] ?? ['mono', 'stereo']
}

export function getAudioVbrQualities(codec: string): readonly number[] {
  return AUDIO_VBR_QUALITY[codec] ?? []
}

function resolveVideoCodec(ext: string, opts: MediaArgsContext['options']): VideoCodec {
  if (opts.videoCodec && opts.videoCodec !== 'copy') return opts.videoCodec
  return getDefaultVideoCodec(ext)
}

function resolveAudioCodec(ext: string, opts: MediaArgsContext['options']): AudioCodec {
  if (opts.audioCodec && opts.audioCodec !== 'copy') return opts.audioCodec
  return getDefaultAudioCodec(ext)
}

function channelLayoutToCount(layout: AudioChannelLayout): number {
  switch (layout) {
    case 'mono': return 1
    case 'stereo': return 2
    case 'joint_stereo': return 2
    case '5.1': return 6
    case '7.1': return 8
  }
}

export function buildFfmpegArgs(ctx: MediaArgsContext): string[] {
  const ext = ctx.targetExt.toLowerCase()
  const kind = targetKind(ext)
  const opts = ctx.options
  const args: string[] = ['-i', ctx.inputName, '-y']

  if (kind === 'audio') {
    args.push('-vn')
  } else {
    const hasVideoFilters = (opts.resolution?.width && opts.resolution?.height) || (opts.fps && opts.fps > 0)
    // Default to re-encoding: source codec may not be compatible with the target
    // container (e.g. ProRes in .mov → .mp4 needs libx264). Users can opt out
    // explicitly by setting videoCodec: 'copy'.
    const needsReencode = opts.videoCodec !== 'copy'

    if (needsReencode) {
      const vcodec = resolveVideoCodec(ext, opts)
      args.push('-c:v', vcodec)

      if (opts.videoProfile && VIDEO_PROFILES[vcodec]?.includes(opts.videoProfile)) {
        args.push('-profile:v', opts.videoProfile)
      }

      if ((vcodec === 'libx264' || vcodec === 'libx265') && opts.videoPreset) {
        args.push('-preset', opts.videoPreset)
      }

      if (opts.videoCrf !== undefined && (vcodec === 'libx264' || vcodec === 'libx265' || vcodec === 'libvpx-vp9')) {
        args.push('-crf', String(opts.videoCrf))
      } else if (opts.videoBitrate) {
        args.push('-b:v', opts.videoBitrate)
      }

      if (opts.videoGopSize && opts.videoGopSize > 0) {
        args.push('-g', String(opts.videoGopSize))
      }

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

      const pixFmt = opts.pixFmt ?? ((vcodec === 'libx264' || vcodec === 'libx265' || vcodec === 'libvpx-vp9') ? 'yuv420p' : undefined)
      if (pixFmt) {
        args.push('-pix_fmt', pixFmt)
      }

      if (!ctx.desktop) {
        args.push('-threads', '1')
        if (vcodec === 'libx265') {
          args.push('-x265-params', 'log-level=warning:frame-threads=1:wpp=0:pools=none')
        }
      }
    } else {
      args.push('-c:v', 'copy')
    }
  }

  if (kind === 'video' && opts.enableAudio === false) {
    args.push('-an')
  } else {
    // Default to re-encoding: the source audio codec may not be compatible with
    // the target container (e.g. AAC in .mp4 cannot be copied into .webm which
    // requires Opus/Vorbis, and MP3 streams cannot be copied into FLAC).
    // Users can opt out explicitly with audioCodec: 'copy'.
    const audioNeedsReencode = opts.audioCodec !== 'copy'
    if (audioNeedsReencode) {
      const acodec = resolveAudioCodec(ext, opts)
      args.push('-c:a', acodec)

      const rateMode = opts.audioRateMode ?? 'cbr'

      if (opts.audioVbrQuality !== undefined && (rateMode === 'vbr') && codecSupportsVbr(acodec)) {
        if (acodec === 'libmp3lame') {
          args.push('-q:a', String(opts.audioVbrQuality))
        } else if (acodec === 'libvorbis') {
          args.push('-q:a', String(opts.audioVbrQuality))
        } else if (acodec === 'libopus') {
          args.push('-vbr', 'on', '-b:a', `${opts.audioVbrQuality}k`)
        } else if (acodec === 'aac') {
          args.push('-vbr', String(Math.min(5, Math.round(opts.audioVbrQuality / 2))))
        }
      } else if (opts.audioBitrate && rateMode !== 'vbr') {
        args.push('-b:a', opts.audioBitrate)
        if (rateMode === 'abr' && acodec === 'libmp3lame') {
          args.push('-abr', '1')
        }
      }

      if (opts.sampleRate && opts.sampleRate > 0) {
        args.push('-ar', String(opts.sampleRate))
      }

      if (opts.audioChannels) {
        const chCount = channelLayoutToCount(opts.audioChannels)
        args.push('-ac', String(chCount))
        if (opts.audioChannels === 'joint_stereo' && acodec === 'libmp3lame') {
          args.push('-joint_stereo', '1')
        }
      }

      if (opts.bitDepth) {
        if (acodec.startsWith('pcm_')) {
          const pcmCodec: Record<number, string> = { 16: 'pcm_s16le', 24: 'pcm_s24le', 32: 'pcm_f32le' }
          const codec = pcmCodec[opts.bitDepth]
          if (codec) {
            const idx = args.indexOf('-c:a')
            if (idx !== -1) args[idx + 1] = codec
          }
        } else if (acodec === 'flac' && opts.bitDepth === 32) {
          args.push('-sample_fmt', 's32')
        }
      }
    } else {
      args.push('-c:a', 'copy')
    }
  }

  if (ext === 'mp4' || ext === 'm4a') {
    args.push('-movflags', '+faststart')
  }

  args.push('-stats_period', '1')
  args.push(ctx.outputName)
  return args
}
