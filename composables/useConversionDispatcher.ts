import { useImageConversion } from '@/composables/useImageConversion'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionRunner } from '@/stores/conversion'
import type { ImageOptions } from '@/types/imageOptions'

/**
 * Engine-agnostic dispatcher: routes a `ConversionTask` to the right
 * engine composable based on the file category and forwards progress.
 *
 * Phase 3 ships the image branch only; Phase 4/5 will add media + document.
 */
export function useConversionDispatcher(): { install: () => void; uninstall: () => void } {
  const store = useConversionStore()
  const image = useImageConversion()

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

    throw new Error(`No engine wired for category: ${detected.category}`)
  }

  function install(): void {
    store.setRunner(runner)
  }

  function uninstall(): void {
    store.setRunner(null)
  }

  return { install, uninstall }
}
