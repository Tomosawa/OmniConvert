import { computed, type Ref } from 'vue'
import type { DetectedFile } from '@/types/file'
import { recommendTargets } from '@/utils/formatTable'
import { usePlatform } from '@/composables/usePlatform'

/**
 * Reactive recommendation list keyed off a detected file. The list is stable
 * in order so the first entry is always a sensible default. Same-format
 * targets (e.g. JPG → JPG for resize / compress) are included.
 *
 * On desktop, PDF is added to document target recommendations since the
 * native Pandoc CLI can produce PDF output.
 */
export function useFormatRecommend(detected: Ref<DetectedFile | null>) {
  const { isDesktop } = usePlatform()

  const targets = computed<string[]>(() => {
    const d = detected.value
    if (!d) return []
    const list = recommendTargets(d.ext, isDesktop.value)
    if (d.category === 'document') {
      return list.filter((t) => t !== d.ext)
    }
    return list
  })

  const defaultTarget = computed<string | null>(() => targets.value[0] ?? null)

  return { targets, defaultTarget }
}
