import type { Child } from '@tauri-apps/plugin-shell'
import { createLogger } from '@/utils/logger'

/**
 * Lazy-load the Tauri shell plugin so SSG / web builds never evaluate the
 * Tauri-specific code path (which would crash without `__TAURI_INTERNALS__`).
 */
async function getShellPlugin(): Promise<typeof import('@tauri-apps/plugin-shell')> {
  return import('@tauri-apps/plugin-shell')
}

const log = createLogger('sidecar')

export interface SidecarProgress {
  /** 0-100, parsed from CLI output */
  percent: number
  /** Raw progress line */
  raw: string
}

export interface SidecarResult {
  stdout: string
  stderr: string
  code: number
}

export interface SidecarOptions {
  args: string[]
  onStdout?: (line: string) => void
  onStderr?: (line: string) => void
  onProgress?: (progress: SidecarProgress) => void
  signal?: AbortSignal
}

/**
 * Parse FFmpeg's `time=HH:MM:SS.ss` progress line against a known duration.
 * Returns -1 if no progress could be parsed (caller should ignore).
 */
function parseFfmpegProgress(line: string, durationSec?: number): number {
  const timeMatch = /time=(\d+):(\d+):(\d+\.?\d*)/.exec(line)
  if (!timeMatch || !durationSec) return -1
  const [, h, m, s] = timeMatch
  const elapsed = Number(h) * 3600 + Number(m) * 60 + Number(s)
  return Math.min(100, Math.round((elapsed / durationSec) * 100))
}

/**
 * Detect common filesystem error patterns in sidecar stderr and augment
 * the error message with helpful context. Returns the enriched error string,
 * or the original stderr if no patterns match.
 */
function enrichSidecarError(stderr: string, binary: string, args: string[]): string {
  const patterns: Array<{ re: RegExp; hint: string }> = [
    { re: /No such file or directory/i, hint: 'File path not found — check that the temp file was written correctly' },
    { re: /cannot open/i, hint: 'Cannot open file — may be a permission or path issue' },
    { re: /Permission denied/i, hint: 'Permission denied — the sidecar cannot access the specified path' },
    { re: /No route to host/i, hint: 'Network error — sidecar tried to reach a remote resource' },
  ]

  for (const { re, hint } of patterns) {
    if (re.test(stderr)) {
      // Extract the input path from args (first arg after '-i' for ffmpeg,
      // first positional arg for magick, first positional arg for pandoc)
      let inputPath = ''
      if (binary.includes('ffmpeg')) {
        const idx = args.indexOf('-i')
        if (idx !== -1 && idx + 1 < args.length) inputPath = args[idx + 1] ?? ''
      } else if (binary.includes('magick')) {
        // magick args: [...options] inputPath outputPath
        // Find the last two positional args — first is input, second is output
        const positional = args.filter(a => !a.startsWith('-'))
        if (positional.length >= 2) inputPath = positional[0] ?? ''
      } else if (binary.includes('pandoc')) {
        // pandoc args: [--flags] inputPath -o outputPath
        // First positional arg that doesn't follow a flag is the input
        for (let i = 0; i < args.length; i++) {
          const cur = args[i]
          const prev = args[i - 1]
          if (cur && !cur.startsWith('-') && prev && !prev.startsWith('-')) {
            inputPath = cur
            break
          }
        }
      }
      return `${stderr}\n[Diagnostic] ${hint}. Input path: ${inputPath || '(not detected from args)'}`
    }
  }

  return stderr
}

/**
 * Wrap Tauri shell plugin's `Command.sidecar()` with progress parsing and
 * abort-signal support. Each CLI has its own progress-parsing heuristic.
 */
export function useSidecar() {
  let activeChild: Child | null = null

  async function run(
    binary: string,
    options: SidecarOptions,
    durationSec?: number,
  ): Promise<SidecarResult> {
    log.info('sidecar run', { binary, args: options.args.slice(0, 5).join(' ') })

    const shell = await getShellPlugin()
    const cmd = shell.Command.sidecar(binary, options.args, {})
    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    return new Promise<SidecarResult>((resolve, reject) => {
      let settled = false

      const onAbort = () => {
        if (settled) return
        settled = true
        log.info('sidecar aborted', { binary })
        activeChild?.kill().catch(() => {})
        activeChild = null
        reject(new DOMException('Sidecar cancelled', 'AbortError'))
      }

      options.signal?.addEventListener('abort', onAbort, { once: true })

      cmd
        .spawn()
        .then((child) => {
          activeChild = child

          // In plugin-shell v2.x, events are emitted on the Command instance,
          // not on a separate eventStream object.
          cmd.on('close', (event: { code?: number | null; signal?: number | null }) => {
            if (settled) return
            settled = true
            activeChild = null
            options.signal?.removeEventListener('abort', onAbort)
            const code = event.code ?? 0
            log.info('sidecar closed', { binary, code })

            // Enrich error message for non-zero exit codes
            const stderr = stderrChunks.join('')
            if (code !== 0 && stderr) {
              const enriched = enrichSidecarError(stderr, binary, options.args)
              if (enriched !== stderr) {
                log.warn('sidecar diagnostic', { binary, enriched: enriched.slice(0, 300) })
              }
            }

            resolve({
              stdout: stdoutChunks.join(''),
              stderr: stderrChunks.join(''),
              code,
            })
          })

          cmd.on('error', (error: string) => {
            if (settled) return
            settled = true
            activeChild = null
            options.signal?.removeEventListener('abort', onAbort)
            log.error('sidecar error', { binary, error })
            reject(new Error(error))
          })

          cmd.stdout.on('data', (data: Uint8Array | string) => {
            const line = typeof data === 'string' ? data : new TextDecoder().decode(data)
            stdoutChunks.push(line)
            options.onStdout?.(line)
            const pct = parseFfmpegProgress(line, durationSec)
            if (pct >= 0) {
              options.onProgress?.({ percent: pct, raw: line })
            }
          })

          cmd.stderr.on('data', (data: Uint8Array | string) => {
            const line = typeof data === 'string' ? data : new TextDecoder().decode(data)
            stderrChunks.push(line)
            options.onStderr?.(line)
            // FFmpeg outputs progress to stderr
            const pct = parseFfmpegProgress(line, durationSec)
            if (pct >= 0) {
              options.onProgress?.({ percent: pct, raw: line })
            }
          })
        })
        .catch((err) => {
          if (settled) return
          settled = true
          activeChild = null
          options.signal?.removeEventListener('abort', onAbort)
          log.error('sidecar spawn failed', { binary, error: String(err) })
          reject(new Error(`Failed to start ${binary}: ${String(err)}`))
        })
    })
  }

  function killActive(): void {
    activeChild?.kill().catch(() => {})
    activeChild = null
  }

  return { run, killActive }
}
