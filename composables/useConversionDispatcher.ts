import { useDocumentConversion } from '@/composables/useDocumentConversion'
import { useDesktopDocumentConversion } from '@/composables/useDesktopDocumentConversion'
import { useDesktopImageConversion } from '@/composables/useDesktopImageConversion'
import { useDesktopMediaConversion } from '@/composables/useDesktopMediaConversion'
import { useHistory } from '@/composables/useHistory'
import { useImageConversion } from '@/composables/useImageConversion'
import { useMediaConversion } from '@/composables/useMediaConversion'
import { usePlatform } from '@/composables/usePlatform'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionRunner } from '@/stores/conversion'
import type { DocumentOptions } from '@/types/documentOptions'
import type { ImageOptions } from '@/types/imageOptions'
import type { MediaOptions } from '@/types/mediaOptions'
import { createLogger } from '@/utils/logger'

const log = createLogger('dispatcher')

/**
 * Engine-agnostic dispatcher: routes a `ConversionTask` to the right
 * engine composable based on the file category and platform.
 *
 * - Desktop (Tauri): uses native CLI sidecars via `useDesktop*` composables.
 * - Web (browser): uses WASM engines via the original composables.
 *
 * Also wires the finished-hook so successful or failed tasks land in
 * IndexedDB history (metadata only, never file contents).
 */
export function useConversionDispatcher(): { install: () => void; uninstall: () => void } {
  const store = useConversionStore()
  const { isDesktop } = usePlatform()

  // WASM engines (web)
  const wasmImage = useImageConversion()
  const wasmMedia = useMediaConversion()
  const wasmDocument = useDocumentConversion()

  // Native CLI engines (desktop)
  const desktopImage = useDesktopImageConversion()
  const desktopMedia = useDesktopMediaConversion()
  const desktopDocument = useDesktopDocumentConversion()

  const history = useHistory()

  const runner: ConversionRunner = async (task, onProgress, signal) => {
    const { fileItem, targetFormat } = task
    const detected = fileItem.detected
    const desktop = isDesktop.value

    log.info('dispatch', {
      id: task.id,
      file: detected.file.name,
      category: detected.category,
      source: detected.ext,
      target: targetFormat,
      engine: desktop ? 'sidecar' : 'wasm',
    })

    if (detected.category === 'image') {
      const engine = desktop ? desktopImage : wasmImage
      const blob = await engine.convert({
        file: detected.file,
        sourceExt: detected.ext || 'png',
        targetExt: targetFormat,
        options: (fileItem.options as ImageOptions | undefined) ?? {},
        onProgress,
        signal,
      })
      log.debug('image conversion done', { id: task.id, size: blob.size })
      return { blob }
    }

    if (detected.category === 'media') {
      const engine = desktop ? desktopMedia : wasmMedia
      const blob = await engine.convert({
        file: detected.file,
        sourceExt: detected.ext || 'mp4',
        targetExt: targetFormat,
        options: (fileItem.options as MediaOptions | undefined) ?? {},
        onProgress,
        signal,
      })
      log.debug('media conversion done', { id: task.id, size: blob.size })
      return { blob }
    }

    if (detected.category === 'document') {
      const engine = desktop ? desktopDocument : wasmDocument
      const blob = await engine.convert({
        file: detected.file,
        sourceExt: detected.ext || 'md',
        targetExt: targetFormat,
        options: (fileItem.options as DocumentOptions | undefined) ?? {},
        onProgress,
        signal,
      })
      log.debug('document conversion done', { id: task.id, size: blob.size })
      return { blob }
    }

    log.error('no engine for category', { category: detected.category, file: detected.file.name })
    throw new Error(`No engine wired for category: ${detected.category}`)
  }

  function install(): void {
    log.info('installing dispatcher')
    store.setRunner(runner)
    store.setFinishedHook((task) => {
      const original = task.fileItem.detected.file.name
      const dot = original.lastIndexOf('.')
      const stem = dot > 0 ? original.slice(0, dot) : original
      const convertedName = `${stem}.${task.targetFormat}`
      void history.append({
        id: task.id,
        fileName: convertedName,
        sourceFormat: task.fileItem.detected.ext || 'unknown',
        targetFormat: task.targetFormat,
        category: task.fileItem.detected.category,
        sizeBytes: task.fileItem.detected.file.size,
        outputBytes: task.resultBlob?.size ?? 0,
        durationMs:
          task.startedAt && task.completedAt
            ? Math.max(0, task.completedAt - task.startedAt)
            : 0,
        status: task.status === 'success' ? 'success' : task.status === 'cancelled' ? 'cancelled' : 'error',
        error: task.error,
        completedAt: task.completedAt ?? Date.now(),
      })
    })
  }

  function uninstall(): void {
    log.info('uninstalling dispatcher')
    store.setRunner(null)
    store.setFinishedHook(null)
  }

  return { install, uninstall }
}
