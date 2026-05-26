import { useImageConversion } from '@/composables/useImageConversion'
import { useMediaConversion } from '@/composables/useMediaConversion'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionRunner } from '@/stores/conversion'
import type { ImageOptions } from '@/types/imageOptions'
import type { MediaOptions } from '@/types/mediaOptions'

/**
 * Engine-agnostic dispatcher: routes a `ConversionTask` to the right
 * engine composable based on the file category and forwards progress.
 *
 * Phase 3 added the image branch; Phase 4 adds media. Phase 5 will add
 * document.
 */
export function useConversionDispatcher(): { install: () => void; uninstall: () => void } {
  const store = useConversionStore()
  const image = useImageConversion()
  const media = useMediaConversion()

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
