import { describe, expect, it } from 'vitest'
import {
  AUDIO_BITRATES,
  FRAME_RATES,
  SAMPLE_RATES,
  VIDEO_BITRATES,
  buildFfmpegArgs,
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

  it('audioOnly=true on a video target still drops video', () => {
    const args = buildFfmpegArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      targetExt: 'mp4',
      options: { audioOnly: true },
    })
    expect(args).toContain('-vn')
    expect(args).not.toContain('libx264')
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

describe('utils/ffmpegArgs constants', () => {
  it('exposes non-empty bitrate / fps / sample rate suggestions', () => {
    expect(AUDIO_BITRATES.length).toBeGreaterThan(0)
    expect(VIDEO_BITRATES.length).toBeGreaterThan(0)
    expect(SAMPLE_RATES.length).toBeGreaterThan(0)
    expect(FRAME_RATES.length).toBeGreaterThan(0)
  })
})
