import { describe, expect, it } from 'vitest'
import {
  buildFfmpegArgs,
  formatSupportsBitDepth,
  formatSupportsBitrate,
  getAudioBitrates,
  getBitDepths,
  getSampleRates,
  targetKind,
  targetMime,
} from '@/utils/ffmpegArgs'

describe('utils/ffmpegArgs#targetKind', () => {
  it('classifies audio extensions', () => {
    expect(targetKind('mp3')).toBe('audio')
    expect(targetKind('wav')).toBe('audio')
    expect(targetKind('flac')).toBe('audio')
    expect(targetKind('OGG')).toBe('audio')
  })

  it('classifies video extensions', () => {
    expect(targetKind('mp4')).toBe('video')
    expect(targetKind('webm')).toBe('video')
    expect(targetKind('MOV')).toBe('video')
  })
})

describe('utils/ffmpegArgs#targetMime', () => {
  it('returns the right MIME for known formats', () => {
    expect(targetMime('mp3')).toBe('audio/mpeg')
    expect(targetMime('mp4')).toBe('video/mp4')
    expect(targetMime('webm')).toBe('video/webm')
  })

  it('falls back to octet-stream for unknown', () => {
    expect(targetMime('xyz')).toBe('application/octet-stream')
  })
})

describe('utils/ffmpegArgs#buildFfmpegArgs — audio targets', () => {
  it('drops video stream and uses libmp3lame for mp3', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp3',
      targetExt: 'mp3',
      options: {},
    })
    expect(args).toContain('-vn')
    expect(args).toContain('-c:a')
    expect(args).toContain('libmp3lame')
    expect(args[0]).toBe('-i')
    expect(args[1]).toBe('in.mp4')
    expect(args[args.length - 1]).toBe('out.mp3')
  })

  it('uses pcm_s16le for wav', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mov',
      outputName: 'out.wav',
      targetExt: 'wav',
      options: {},
    })
    expect(args).toContain('pcm_s16le')
  })

  it('respects audioBitrate and sampleRate', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.flac',
      outputName: 'out.mp3',
      targetExt: 'mp3',
      options: { audioBitrate: '320k', sampleRate: 48000 },
    })
    expect(args).toContain('-b:a')
    expect(args).toContain('320k')
    expect(args).toContain('-ar')
    expect(args).toContain('48000')
  })

  it('applies bitDepth for wav — 24-bit uses pcm_s24le', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.flac',
      outputName: 'out.wav',
      targetExt: 'wav',
      options: { bitDepth: 24 },
    })
    expect(args).toContain('pcm_s24le')
  })

  it('applies bitDepth for wav — 32-bit uses pcm_f32le', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.wav',
      outputName: 'out.wav',
      targetExt: 'wav',
      options: { bitDepth: 32 },
    })
    expect(args).toContain('pcm_f32le')
  })

  it('always re-encodes for audio-only targets (mp3→flac with no options)', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp3',
      outputName: 'out.flac',
      targetExt: 'flac',
      options: {},
    })
    expect(args).toContain('-vn')
    expect(args).toContain('-c:a')
    expect(args).toContain('flac')
    expect(args).not.toContain('copy')
  })

  it('applies bitDepth for flac — 32-bit adds sample_fmt', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.wav',
      outputName: 'out.flac',
      targetExt: 'flac',
      options: { bitDepth: 32 },
    })
    expect(args).toContain('-sample_fmt')
    expect(args).toContain('s32')
  })
})

describe('utils/ffmpegArgs#buildFfmpegArgs — video targets', () => {
  it('uses libx264 for mp4 by default', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mov',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: {},
    })
    expect(args).toContain('-c:v')
    expect(args).toContain('libx264')
    expect(args).not.toContain('-vn')
  })

  it('uses libvpx-vp9 for webm', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.webm',
      targetExt: 'webm',
      options: {},
    })
    expect(args).toContain('libvpx-vp9')
    expect(args).toContain('libopus')
  })

  it('builds filter chain for resolution + fps', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mov',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: { resolution: { width: 1280, height: 720 }, fps: 30 },
    })
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).toBeGreaterThan(-1)
    expect(args[vfIdx + 1]).toBe('scale=1280:720,fps=30')
  })

  it('enableAudio=false on a video target adds -an to drop audio', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: { enableAudio: false },
    })
    expect(args).toContain('-an')
    expect(args).not.toContain('-c:a')
  })

  it('default (enableAudio undefined) includes audio stream for video targets', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: {},
    })
    expect(args).not.toContain('-an')
    expect(args).toContain('-c:a')
  })

  it('libx265 sets -pix_fmt yuv420p, -threads 1, and -x265-params', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: { videoCodec: 'libx265' },
    })
    expect(args).toContain('libx265')
    expect(args).toContain('-pix_fmt')
    expect(args).toContain('yuv420p')
    expect(args).toContain('-threads')
    expect(args).toContain('1')
    expect(args).toContain('-x265-params')
    const paramsIdx = args.indexOf('-x265-params')
    expect(args[paramsIdx + 1]).toContain('frame-threads=1')
  })

  it('respects videoBitrate', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.webm',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: { videoBitrate: '2M' },
    })
    expect(args).toContain('-b:v')
    expect(args).toContain('2M')
  })
})

describe('utils/ffmpegArgs — format-specific helpers', () => {
  it('getAudioBitrates returns correct lists per format', () => {
    expect(getAudioBitrates('mp3')).toEqual(['64k', '96k', '128k', '160k', '192k', '256k', '320k'])
    expect(getAudioBitrates('wav')).toEqual([])
    expect(getAudioBitrates('flac')).toEqual([])
    expect(getAudioBitrates('ogg').length).toBeGreaterThan(5)
  })

  it('getSampleRates returns correct lists per format', () => {
    expect(getSampleRates('mp3')).toEqual([22050, 32000, 44100, 48000])
    expect(getSampleRates('flac')).toContain(192000)
    expect(getSampleRates('flac')).toContain(384000)
    expect(getSampleRates('wav')).toContain(176400)
  })

  it('getBitDepths returns correct lists per format', () => {
    expect(getBitDepths('wav')).toEqual([16, 24, 32])
    expect(getBitDepths('flac')).toEqual([16, 24, 32])
    expect(getBitDepths('mp3')).toEqual([])
    expect(getBitDepths('ogg')).toEqual([16])
  })

  it('formatSupportsBitrate works correctly', () => {
    expect(formatSupportsBitrate('mp3')).toBe(true)
    expect(formatSupportsBitrate('wav')).toBe(false)
    expect(formatSupportsBitrate('flac')).toBe(false)
    expect(formatSupportsBitrate('aac')).toBe(true)
  })

  it('formatSupportsBitDepth works correctly', () => {
    expect(formatSupportsBitDepth('wav')).toBe(true)
    expect(formatSupportsBitDepth('flac')).toBe(true)
    expect(formatSupportsBitDepth('mp3')).toBe(false)
    expect(formatSupportsBitDepth('ogg')).toBe(true)
  })
})
