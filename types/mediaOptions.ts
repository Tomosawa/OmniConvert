export type VideoCodec = 'libx264' | 'libx265' | 'libvpx-vp9' | 'mpeg4' | 'copy'
export type VideoProfile = 'baseline' | 'main' | 'main10' | 'high' | 'high10' | 'high422' | 'high444'
export type VideoPreset = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow'
export type AudioCodec = 'aac' | 'libmp3lame' | 'flac' | 'libvorbis' | 'libopus' | 'pcm_s16le' | 'pcm_s24le' | 'pcm_f32le' | 'ac3' | 'copy'
export type AudioChannelLayout = 'mono' | 'stereo' | 'joint_stereo' | '5.1' | '7.1'
export type AudioRateMode = 'cbr' | 'vbr' | 'abr'

export interface MediaOptions {
  videoCodec?: VideoCodec
  videoProfile?: VideoProfile
  videoPreset?: VideoPreset
  videoBitrate?: string
  videoCrf?: number
  videoGopSize?: number
  pixFmt?: string
  fps?: number
  resolution?: { width: number; height: number }
  enableAudio?: boolean
  audioCodec?: AudioCodec
  audioBitrate?: string
  audioRateMode?: AudioRateMode
  audioVbrQuality?: number
  sampleRate?: number
  bitDepth?: 16 | 24 | 32
  audioChannels?: AudioChannelLayout
}

export type MediaTargetKind = 'audio' | 'video'

export interface MediaArgsContext {
  inputName: string
  outputName: string
  targetExt: string
  options: MediaOptions
  /** When true, skip WASM-specific workarounds (thread limits, etc.) */
  desktop?: boolean
}

export interface MediaMetadata {
  width?: number
  height?: number
  duration?: number
  videoBitrate?: number
  audioBitrate?: number
  fps?: number
  sampleRate?: number
  bitDepth?: number
  audioCodec?: string
  videoCodec?: string
  channels?: number
}
