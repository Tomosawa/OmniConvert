import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useFormatRecommend } from '@/composables/useFormatRecommend'
import type { DetectedFile } from '@/types/file'

function makeDetected(ext: string, category: DetectedFile['category'] = 'image'): DetectedFile {
  return {
    file: new File([new Uint8Array([0])], `f.${ext}`),
    category,
    mime: '',
    ext,
    magicMatch: true,
  }
}

describe('composables/useFormatRecommend', () => {
  it('returns empty list when input is null', () => {
    const detected = ref<DetectedFile | null>(null)
    const { targets, defaultTarget } = useFormatRecommend(detected)
    expect(targets.value).toEqual([])
    expect(defaultTarget.value).toBe(null)
  })

  it('returns recommendations for an image', () => {
    const detected = ref<DetectedFile | null>(makeDetected('png'))
    const { targets, defaultTarget } = useFormatRecommend(detected)
    expect(targets.value.length).toBeGreaterThan(0)
    expect(targets.value).toContain('png')
    expect(defaultTarget.value).toBe(targets.value[0])
  })

  it('reacts when the source ref changes', () => {
    const detected = ref<DetectedFile | null>(makeDetected('jpg'))
    const { targets } = useFormatRecommend(detected)
    const initial = [...targets.value]
    detected.value = makeDetected('mp4', 'media')
    expect(targets.value).not.toEqual(initial)
    expect(targets.value).toContain('mp3')
  })

  it('returns empty list for unknown extensions', () => {
    const detected = ref<DetectedFile | null>(makeDetected('xyz', 'unknown'))
    const { targets } = useFormatRecommend(detected)
    expect(targets.value).toEqual([])
  })
})
