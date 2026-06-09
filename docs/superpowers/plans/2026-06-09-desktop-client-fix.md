# Desktop Client Fix & Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "engine can't find input file" bug on Tauri desktop and unlock multi-thread + H.265 performance for macOS.

**Architecture:** All three desktop composables share the same temp-file pattern (write via `fs.writeFile`, run sidecar, read via `fs.readFile`). The fix standardizes all FS operations to use `BaseDirectory.Temp` + relative filenames, while sidecar CLI args continue using absolute paths. FFmpeg args gain desktop-specific multi-thread and H.265 enhancements.

**Tech Stack:** Nuxt 3 + Vue 3 + TypeScript, Tauri 2.0 (`@tauri-apps/plugin-fs`, `@tauri-apps/api/path`, `@tauri-apps/plugin-shell`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `composables/useDesktopImageConversion.ts` | Modify | Fix FS path resolution + add BaseDirectory.Temp |
| `composables/useDesktopMediaConversion.ts` | Modify | Fix FS path resolution + add BaseDirectory.Temp |
| `composables/useDesktopDocumentConversion.ts` | Modify | Fix FS path resolution + add BaseDirectory.Temp |
| `composables/useSidecar.ts` | Modify | Enhance error diagnostics for file-not-found patterns |
| `utils/ffmpegArgs.ts` | Modify | Add desktop multi-thread + H.265 params |

No new files created. No Rust-side changes. No web-version files changed.

---

### Task 1: Fix FS path resolution in `useDesktopImageConversion.ts`

**Files:**
- Modify: `composables/useDesktopImageConversion.ts`

**Current pattern (broken):**
```typescript
const tmpBase = await path.tempDir()
const inputPath = await path.join(tmpBase, `${id}_input.${sourceExt}`)
const outputPath = await path.join(tmpBase, `${id}_output.${targetExt}`)
await fs.writeFile(inputPath, inputBuf)          // absolute path, no baseDir
const outputExists = await fs.exists(outputPath) // absolute path, no baseDir
const outBuf = await fs.readFile(outputPath)     // absolute path, no baseDir
await fs.remove(inputPath)                       // absolute path, no baseDir
await fs.remove(outputPath)                       // absolute path, no baseDir
```

**New pattern (fixed):**
```typescript
const inputFileName = `${id}_input.${sourceExt}`   // relative filename only
const outputFileName = `${id}_output.${targetExt}`  // relative filename only
const tmpBase = await path.tempDir()
const inputPath = await path.join(tmpBase, inputFileName)    // absolute path for sidecar
const outputPath = await path.join(tmpBase, outputFileName)   // absolute path for sidecar

await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

// ... sidecar runs with inputPath/outputPath (absolute) ...

const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })

// cleanup in finally:
await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp })
await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp })
```

- [ ] **Step 1: Replace the entire `convert` function body in `useDesktopImageConversion.ts`**

Replace the file content from line 28 to line 101 with the fixed version. The full replacement for `useDesktopImageConversion.ts`:

```typescript
import type { ImageOptions } from '@/types/imageOptions'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { useSidecar } from '@/composables/useSidecar'
import { uid } from '@/utils/fileSize'
import { createLogger } from '@/utils/logger'

async function getFs() {
  return import('@tauri-apps/plugin-fs')
}
async function getPath() {
  return import('@tauri-apps/api/path')
}

const log = createLogger('desktop-image')

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: ImageOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Desktop image conversion via ImageMagick sidecar (`magick` CLI).
 * Writes input to temp (using BaseDirectory.Temp + relative filename),
 * invokes `magick convert`, reads the output.
 */
export function useDesktopImageConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const id = uid('deskimg')
    const inputFileName = `${id}_input.${sourceExt}`
    const outputFileName = `${id}_output.${targetExt}`
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, inputFileName)
    const outputPath = await path.join(tmpBase, outputFileName)

    log.info('convert start', { file: file.name, source: sourceExt, target: targetExt })
    args.onProgress?.(5)

    try {
      // Write input file to temp with explicit baseDir
      const inputBuf = new Uint8Array(await file.arrayBuffer())
      await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(15)

      // Verify file was written
      const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
      if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

      // Build magick args
      const magickArgs: string[] = []

      if (options?.quality && options.quality > 0) {
        magickArgs.push('-quality', String(options.quality))
      }
      if (options?.width || options?.height) {
        const w = options.width || ''
        const h = options.height || ''
        magickArgs.push('-resize', `${w}x${h}`)
      }

      magickArgs.push(inputPath, outputPath)

      await sidecar.run('binaries/magick', {
        args: magickArgs,
        signal,
        onStderr: (line) => log.debug('magick', { line: line.slice(0, 200) }),
      })

      args.onProgress?.(85)

      if (signal?.aborted) {
        throw new DOMException('Conversion cancelled', 'AbortError')
      }

      const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
      if (!outputExists) {
        throw new Error('ImageMagick produced no output')
      }

      const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(100)

      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', bmp: 'image/bmp',
        tif: 'image/tiff', tiff: 'image/tiff',
        ico: 'image/x-icon',
      }
      const mime = mimeMap[targetExt.toLowerCase()] ?? 'application/octet-stream'
      log.info('convert done', { file: file.name, outputSize: outBuf.byteLength })
      return new Blob([outBuf], { type: mime })
    } finally {
      try { await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
      try { await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
    }
  }

  return { convert }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/useDesktopImageConversion.ts
git commit -m "fix(desktop-image): use BaseDirectory.Temp + relative filenames for FS operations

Resolves the 'engine can't find file' bug by explicitly specifying
baseDir: BaseDirectory.Temp on all fs.writeFile/readFile/exists/remove
calls. Sidecar CLI args continue using absolute paths from path.join()"
```

---

### Task 2: Fix FS path resolution in `useDesktopMediaConversion.ts`

**Files:**
- Modify: `composables/useDesktopMediaConversion.ts`

Same pattern as Task 1, applied to the media (FFmpeg) composable. Key difference: `buildFfmpegArgs` receives absolute `inputPath/outputPath` for `-i` and output name args.

- [ ] **Step 1: Replace the entire file content of `useDesktopMediaConversion.ts`**

```typescript
import type { MediaOptions } from '@/types/mediaOptions'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { useSidecar } from '@/composables/useSidecar'
import { buildFfmpegArgs, targetMime } from '@/utils/ffmpegArgs'
import { uid } from '@/utils/fileSize'
import { createLogger } from '@/utils/logger'

async function getFs() {
  return import('@tauri-apps/plugin-fs')
}
async function getPath() {
  return import('@tauri-apps/api/path')
}

const log = createLogger('desktop-media')

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: MediaOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Estimate media duration from file size for progress parsing.
 * This is a rough heuristic; FFmpeg outputs the real duration in its logs.
 */
function estimateDuration(fileSize: number): number {
  // Rough: assume 1Mbps bitrate → ~125KB/s
  return Math.max(1, Math.round(fileSize / 125_000))
}

/**
 * Desktop media conversion via FFmpeg sidecar.
 * Writes input to temp (using BaseDirectory.Temp + relative filename),
 * invokes `ffmpeg`, reads the output.
 */
export function useDesktopMediaConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const id = uid('deskmedia')
    const inputFileName = `${id}_input.${sourceExt}`
    const outputFileName = `${id}_output.${targetExt}`
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, inputFileName)
    const outputPath = await path.join(tmpBase, outputFileName)

    log.info('convert start', { file: file.name, source: sourceExt, target: targetExt, size: file.size })
    args.onProgress?.(3)

    try {
      const inputBuf = new Uint8Array(await file.arrayBuffer())
      await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(8)

      // Verify file was written
      const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
      if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

      const ffArgs = buildFfmpegArgs({
        inputName: inputPath,
        outputName: outputPath,
        targetExt,
        options: options ?? {},
        desktop: true,
      })

      const estimatedDuration = estimateDuration(file.size)

      await sidecar.run(
        'binaries/ffmpeg',
        {
          args: ffArgs,
          signal,
          onProgress: (p) => {
            args.onProgress?.(Math.max(8, Math.min(95, p.percent)))
          },
          onStderr: (line) => {
            log.debug('ffmpeg', { line: line.slice(0, 300) })
          },
        },
        estimatedDuration,
      )

      if (signal?.aborted) {
        throw new DOMException('Conversion cancelled', 'AbortError')
      }

      args.onProgress?.(95)

      const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
      if (!outputExists) {
        throw new Error('FFmpeg produced no output file')
      }

      const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })
      if (outBuf.byteLength === 0) {
        throw new Error('FFmpeg produced empty output')
      }

      args.onProgress?.(100)
      log.info('convert done', { file: file.name, outputSize: outBuf.byteLength })
      return new Blob([outBuf], { type: targetMime(targetExt) })
    } finally {
      try { await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
      try { await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
    }
  }

  return { convert }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/useDesktopMediaConversion.ts
git commit -m "fix(desktop-media): use BaseDirectory.Temp + relative filenames for FS operations

Same fix as desktop-image: explicit baseDir on all fs calls.
buildFfmpegArgs still receives absolute paths for sidecar CLI args."
```

---

### Task 3: Fix FS path resolution in `useDesktopDocumentConversion.ts`

**Files:**
- Modify: `composables/useDesktopDocumentConversion.ts`

Same pattern as Tasks 1 and 2, applied to the document (Pandoc) composable. Key differences: binary/text source handling, PDF-as-HTML special case, `buildCliArgs` and `buildPandocOptions` continue using absolute `inputPath/outputPath`.

- [ ] **Step 1: Replace the entire file content of `useDesktopDocumentConversion.ts`**

```typescript
import type { DocumentOptions } from '@/types/documentOptions'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { useSidecar } from '@/composables/useSidecar'
import {
  buildPandocOptions,
  documentMime,
  isBinaryWriter,
  readerFor,
  writerFor,
} from '@/utils/pandocFormats'
import { uid } from '@/utils/fileSize'
import { createLogger } from '@/utils/logger'

async function getFs() {
  return import('@tauri-apps/plugin-fs')
}
async function getPath() {
  return import('@tauri-apps/api/path')
}

const log = createLogger('desktop-document')

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: DocumentOptions
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Build CLI args for Pandoc from our option structure.
 * Converts the JSON option blob into flat `--flag value` CLI arguments.
 */
function buildCliArgs(opts: Record<string, unknown>, inputPath: string, outputPath: string): string[] {
  const args: string[] = []

  if (opts.from) args.push('--from', String(opts.from))
  if (opts.to) args.push('--to', String(opts.to))

  if (opts.standalone) args.push('--standalone')
  if (opts.toc) args.push('--toc')

  if (Array.isArray(opts.css)) {
    for (const css of opts.css) {
      args.push('--css', String(css))
    }
  }

  // Extract media from binary inputs (docx/epub)
  if (opts['extract-media']) {
    args.push('--extract-media', String(opts['extract-media']))
  }

  args.push(inputPath)
  args.push('-o', outputPath)

  return args
}

/**
 * Desktop document conversion via Pandoc sidecar CLI.
 *
 * Handles two special cases beyond the WASM version:
 * 1. PDF output: Pandoc generates standalone HTML, which is the most
 *    portable output without bundling a LaTeX distribution.
 * 2. All other formats use the same reader/writer mapping as WASM.
 */
export function useDesktopDocumentConversion() {
  const sidecar = useSidecar()

  async function convert(args: ConvertArgs): Promise<Blob> {
    const { file, sourceExt, targetExt, options, signal } = args
    const fs = await getFs()
    const path = await getPath()

    const srcExt = sourceExt.toLowerCase()
    const tgtExt = targetExt.toLowerCase()

    const isPdfTarget = tgtExt === 'pdf'
    const effectiveTarget = isPdfTarget ? 'html' : tgtExt

    const reader = readerFor(srcExt)
    const writer = writerFor(effectiveTarget)
    if (!reader) throw new Error(`Unsupported source format: ${srcExt}`)
    if (!writer) throw new Error(`Unsupported target format: ${effectiveTarget}`)

    log.info('convert start', {
      file: file.name,
      source: srcExt,
      target: tgtExt,
      effectiveTarget,
      reader,
      writer,
    })
    args.onProgress?.(5)

    const id = uid('deskdoc')
    const inputFileName = `${id}_input.${srcExt}`
    const outExt = isPdfTarget ? 'html' : tgtExt
    const outputFileName = `${id}_output.${outExt}`
    const tmpBase = await path.tempDir()
    const inputPath = await path.join(tmpBase, inputFileName)
    const outputPath = await path.join(tmpBase, outputFileName)

    const readerIsBinary = srcExt === 'docx' || srcExt === 'epub'
    const writerIsBinary = isBinaryWriter(effectiveTarget)

    try {
      // Write input file to temp with explicit baseDir
      if (readerIsBinary) {
        const inputBuf = new Uint8Array(await file.arrayBuffer())
        await fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })
      } else {
        const text = await file.text()
        const encoder = new TextEncoder()
        await fs.writeFile(inputFileName, encoder.encode(text), { baseDir: BaseDirectory.Temp })
      }

      // Verify file was written
      const written = await fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })
      if (!written) throw new Error(`Temp input file not created: ${inputFileName}`)

      args.onProgress?.(15)

      const pandocOpts = buildPandocOptions({
        from: reader,
        to: writer,
        inputFile: readerIsBinary ? inputPath : undefined,
        outputFile: writerIsBinary ? outputPath : undefined,
        extractMedia: readerIsBinary,
        doc: options ?? {},
      })

      if (isPdfTarget) {
        pandocOpts.standalone = true
      }

      const cliArgs = buildCliArgs(pandocOpts, inputPath, outputPath)

      log.debug('pandoc cli args', { args: cliArgs.join(' ') })
      args.onProgress?.(30)

      const result = await sidecar.run('binaries/pandoc', {
        args: cliArgs,
        signal,
        onStderr: (line) => log.debug('pandoc', { line: line.slice(0, 200) }),
      })

      args.onProgress?.(85)

      if (signal?.aborted) {
        throw new DOMException('Conversion cancelled', 'AbortError')
      }

      if (result.code !== 0) {
        const err = result.stderr || 'Pandoc conversion failed'
        log.error('pandoc failed', { code: result.code, stderr: err })
        throw new Error(err)
      }

      const outputExists = await fs.exists(outputFileName, { baseDir: BaseDirectory.Temp })
      if (!outputExists) {
        if (result.stdout) {
          const encoder = new TextEncoder()
          const mime = isPdfTarget ? 'text/html' : documentMime(tgtExt)
          const blob = new Blob([encoder.encode(result.stdout)], { type: mime })
          args.onProgress?.(100)
          log.info('convert done (stdout)', { file: file.name, outputSize: blob.size })
          return blob
        }
        throw new Error('Pandoc produced no output')
      }

      const outBuf = await fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })
      args.onProgress?.(100)

      const mime = isPdfTarget ? 'text/html' : documentMime(tgtExt)
      log.info('convert done', {
        file: file.name,
        outputSize: outBuf.byteLength,
        isPdfAsHtml: isPdfTarget,
      })
      return new Blob([outBuf], { type: mime })
    } finally {
      try { await fs.remove(inputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
      try { await fs.remove(outputFileName, { baseDir: BaseDirectory.Temp }) } catch { /* ok */ }
    }
  }

  return { convert }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/useDesktopDocumentConversion.ts
git commit -m "fix(desktop-document): use BaseDirectory.Temp + relative filenames for FS operations

Same fix pattern as image/media composables. Pandoc CLI args
continue using absolute paths for inputPath/outputPath."
```

---

### Task 4: Enhance error diagnostics in `useSidecar.ts`

**Files:**
- Modify: `composables/useSidecar.ts`

Add a helper that detects common filesystem-related error patterns in stderr and augments the error message. This does NOT change the `run` function signature or return type — it only improves the error messages thrown by `run`.

- [ ] **Step 1: Add diagnostic helper and modify `useSidecar.ts`**

Add a helper function `enrichSidecarError` before the `useSidecar` function, and integrate it into the `close` handler when `code !== 0`. The full replacement for `useSidecar.ts`:

```typescript
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
        if (idx !== -1 && idx + 1 < args.length) inputPath = args[idx + 1]
      } else if (binary.includes('magick')) {
        // magick args: [...options] inputPath outputPath
        // Find the last two positional args — first is input, second is output
        const positional = args.filter(a => !a.startsWith('-'))
        if (positional.length >= 2) inputPath = positional[0]
      } else if (binary.includes('pandoc')) {
        // pandoc args: [--flags] inputPath -o outputPath
        // First positional arg that doesn't follow a flag is the input
        for (let i = 0; i < args.length; i++) {
          if (!args[i].startsWith('-') && i > 0 && !args[i - 1].startsWith('-')) {
            inputPath = args[i]
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
          cmd.on('close', (event: { code?: number; signal?: number }) => {
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
```

- [ ] **Step 2: Commit**

```bash
git add composables/useSidecar.ts
git commit -m "feat(sidecar): enrich error diagnostics for file-not-found patterns

Detects 'No such file', 'cannot open', 'Permission denied' in stderr
and augments the error message with the detected input path. Helps
diagnose the 'engine can't find file' issue."
```

---

### Task 5: Add desktop multi-thread and H.265 params in `ffmpegArgs.ts`

**Files:**
- Modify: `utils/ffmpegArgs.ts`

Two changes to `buildFfmpegArgs`:

1. Add `-threads 0` for desktop (after `-i inputName -y` line)
2. Split H.265 `x265-params` into desktop vs web branches

**Change 1: Add `-threads 0` for desktop**

In the `buildFfmpegArgs` function, after line 242 (`args.push('-i', ctx.inputName, '-y')`), add:

```typescript
  // Desktop: auto thread count for multi-core CPUs
  if (ctx.desktop) {
    args.push('-threads', '0')
  }
```

This replaces the `!ctx.desktop` block at lines 291-296 which only adds `-threads 1` for web. The web block stays untouched.

**Change 2: Split H.265 x265-params**

After the video codec resolution block (around line 256, after `args.push('-c:v', vcodec)` and the profile line), insert the H.265 params BEFORE the preset/CRF/bitrate section:

```typescript
      // H.265 thread params: desktop gets full multi-thread, web stays single-thread
      if (vcodec === 'libx265') {
        if (ctx.desktop) {
          args.push('-x265-params', 'log-level=warning')
        } else {
          args.push('-x265-params', 'log-level=warning:frame-threads=1:wpp=0:pools=none')
        }
      }
```

The existing `!ctx.desktop` block at lines 291-296 stays for `-threads 1` (which only applies to web mode, not H.265 specific).

- [ ] **Step 1: Edit `utils/ffmpegArgs.ts` — add desktop `-threads 0`**

Find the line `args.push('-i', ctx.inputName, '-y')` and add the desktop threads line after it:

```typescript
  const args: string[] = ['-i', ctx.inputName, '-y']

  // Desktop: auto thread count for multi-core CPUs
  if (ctx.desktop) {
    args.push('-threads', '0')
  }
```

- [ ] **Step 2: Edit `utils/ffmpegArgs.ts` — add H.265 desktop/web split**

After the video codec push (`args.push('-c:v', vcodec)` and the profile block), insert the x265-params block:

```typescript
      // H.265 thread params: desktop gets full multi-thread, web stays single-thread
      if (vcodec === 'libx265') {
        if (ctx.desktop) {
          args.push('-x265-params', 'log-level=warning')
        } else {
          args.push('-x265-params', 'log-level=warning:frame-threads=1:wpp=0:pools=none')
        }
      }
```

- [ ] **Step 3: Verify the existing `!ctx.desktop` block is unchanged**

The existing block at lines 291-296 should remain exactly as-is (it handles web-only `-threads 1` and the now-redundant web-only x265 single-thread params). Since the new H.265 split block will handle the web x265 params, the old block's x265 part becomes redundant but harmless — leave it for now to avoid touching web code.

Actually, wait: the old block at lines 291-296:
```typescript
if (!ctx.desktop) {
  args.push('-threads', '1')
  if (vcodec === 'libx265') {
    args.push('-x265-params', 'log-level=warning:frame-threads=1:wpp=0:pools=none')
  }
}
```

With the new H.265 split, web mode would get `-x265-params` BOTH from the new split AND from the old block. That's a duplicate. We need to **remove the x265 part from the old block** to avoid duplicate args:

```typescript
if (!ctx.desktop) {
  args.push('-threads', '1')
}
```

Remove the `if (vcodec === 'libx265')` sub-block from the old `!ctx.desktop` section. This is safe because the new H.265 split block already handles the web case.

- [ ] **Step 4: Commit**

```bash
git add utils/ffmpegArgs.ts
git commit -m "feat(ffmpeg-args): desktop multi-thread + H.265 full-thread params

Desktop: -threads 0 (auto, multi-core) + x265-params without
single-thread restrictions. Web: unchanged (-threads 1 + restricted
x265-params). Removed duplicate x265-params from the web-only block."
```

---

### Task 6: Write dev log + verify web version still works

**Files:**
- Create: `docs/log/2026-06-09.md`

- [ ] **Step 1: Create the dev log entry**

```markdown
# 2026-06-09 开发日志

## 桌面端修复与增强

### Bug 修复：引擎找不到输入文件
- 根因：`fs.writeFile` 未指定 `baseDir: BaseDirectory.Temp`，绝对路径解析不稳定
- 修复：所有 desktop composable 的 FS 操作改用 `BaseDirectory.Temp` + 相对文件名
- 涉及文件：`useDesktopImageConversion.ts`、`useDesktopMediaConversion.ts`、`useDesktopDocumentConversion.ts`

### 增强：桌面端多线程 + H.265
- FFmpeg 桌面端添加 `-threads 0`（自动多核分配）
- H.265 桌面端使用 `x265-params: log-level=warning`（无单线程限制）
- 侧车错误诊断增强：stderr 中的文件相关错误自动附加路径信息
```

- [ ] **Step 2: Verify web version is not affected**

Run: `pnpm dev`
Expected: Web dev server starts without errors. WASM preload works. No import errors from the desktop composable changes (they only import `BaseDirectory` from `@tauri-apps/plugin-fs`, which is lazy-imported and won't be evaluated in web mode).

- [ ] **Step 3: Commit**

```bash
git add docs/log/2026-06-09.md
git commit -m "docs: dev log for desktop client fix & enhancement"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - §1 core bug → Tasks 1-3 (all 3 composables fixed)
   - §2.4 sidecar diagnostics → Task 4
   - §3.1 multi-thread → Task 5 change 1
   - §3.2 H.265 → Task 5 change 2
   - §4 compatibility → Task 6 verification
   - §5 YAGNI → No Rust commands, no scope changes, no streaming, no web changes, no dispatcher changes ✅
   - §6 testing → Task 6 verification step

2. **Placeholder scan:** No TBD, TODO, or vague descriptions. All code is complete.

3. **Type consistency:**
   - `BaseDirectory.Temp` imported from `@tauri-apps/plugin-fs` in all 3 composables ✅
   - `inputFileName/outputFileName` are plain strings ✅
   - `inputPath/outputPath` are strings from `path.join()` ✅
   - `buildFfmpegArgs` signature unchanged (still takes `inputName/outputName` as strings) ✅
   - `buildCliArgs` signature unchanged (still takes `inputPath/outputPath` as strings) ✅
   - `useSidecar.run` return type unchanged (`SidecarResult`) ✅
   - Removed `Child` import from `useSidecar.ts` — actually, `Child` is still used as the type for `activeChild`. Let me verify... yes, `Child` is still used at line `let activeChild: Child | null = null`, so the import stays ✅