import { useDocumentConversion } from '@/composables/useDocumentConversion'
import { useHistory } from '@/composables/useHistory'
import { useImageConversion } from '@/composables/useImageConversion'
import { useMediaConversion } from '@/composables/useMediaConversion'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionRunner } from '@/stores/conversion'
import type { DocumentOptions } from '@/types/documentOptions'
import type { ImageOptions } from '@/types/imageOptions'
import type { MediaOptions } from '@/types/mediaOptions'

/**
 * Engine-agnostic dispatcher: routes a `ConversionTask` to the right
 * engine composable based on the file category and forwards progress.
 *
 * Phase 6 also wires the finished-hook so successful or failed tasks land
 * in IndexedDB history (metadata only, never file contents).
 */
export function useConversionDispatcher(): { install: () => void; uninstall: () => void } {
  const store = useConversionStore()
  const image = useImageConversion()
  const media = useMediaConversion()
  const document = useDocumentConversion()
  const history = useHistory()

  const runner: ConversionRunner = async (task, onProgress) => {
    const { fileItem, targetFormat } = task
    const detected = fileItem.detected

    if (detected.category === 'image') {
      const blob = await image.convert({
        file: detected.file,
        sourceExt: detected.ext || 'png',
        targetExt: targetFormat,
        options: (fileItem.options as ImageOptions | undefined) ?? {},
        onProgress,
      })
      return { blob }
    }

    if (detected.category === 'media') {
      const blob = await media.convert({
        file: detected.file,
        sourceExt: detected.ext || 'mp4',
        targetExt: targetFormat,
        options: (fileItem.options as MediaOptions | undefined) ?? {},
        onProgress,
      })
      return { blob }
    }

    if (detected.category === 'document') {
      const blob = await document.convert({
        file: detected.file,
        sourceExt: detected.ext || 'md',
        targetExt: targetFormat,
        options: (fileItem.options as DocumentOptions | undefined) ?? {},
        onProgress,
      })
      return { blob }
    }

    throw new Error(`No engine wired for category: ${detected.category}`)
  }

  function install(): void {
    store.setRunner(runner)
    store.setFinishedHook((task) => {
      void history.append({
        id: task.id,
        fileName: task.fileItem.detected.file.name,
        sourceFormat: task.fileItem.detected.ext || 'unknown',
        targetFormat: task.targetFormat,
        category: task.fileItem.detected.category,
        sizeBytes: task.fileItem.detected.file.size,
        outputBytes: task.resultBlob?.size ?? 0,
        durationMs:
          task.startedAt && task.completedAt
            ? Math.max(0, task.completedAt - task.startedAt)
            : 0,
        status: task.status === 'success' ? 'success' : 'error',
        error: task.error,
        completedAt: task.completedAt ?? Date.now(),
      })
    })
  }

  function uninstall(): void {
    store.setRunner(null)
    store.setFinishedHook(null)
  }

  return { install, uninstall }
}
