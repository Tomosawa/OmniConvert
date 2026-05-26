import { computed, type Ref } from 'vue'
import type { DetectedFile } from '@/types/file'
import { recommendTargets } from '@/utils/formatTable'

/**
 * Reactive recommendation list keyed off a detected file. The list excludes
 * the source format itself (no point converting JPG → JPG) and is stable in
 * order so the first entry is always a sensible default.
 */
export function useFormatRecommend(detected: Ref<DetectedFile | null>) {
  const targets = computed<string[]>(() => {
    const d = detected.value
    if (!d) return []
    return recommendTargets(d.ext).filter((t) => t !== d.ext)
  })

  const defaultTarget = computed<string | null>(() => targets.value[0] ?? null)

  return { targets, defaultTarget }
}
