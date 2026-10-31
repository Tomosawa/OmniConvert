<script setup lang="ts">
import { ref, computed } from 'vue'
import { Play, Download } from 'lucide-vue-next'
import type { ConversionTask } from '@/types/conversion'
import { usePlatform } from '@/composables/usePlatform'

const props = defineProps<{ task: ConversionTask }>()
const { t } = useI18n()
const { isDesktop } = usePlatform()

/** Audio-only formats */
const AUDIO_FORMATS = new Set(['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus', 'wma'])

/** Determine if the task output is H.265/HEVC — browser can't decode it */
const isH265 = computed(() => {
  const codec = (props.task.fileItem.options as Record<string, unknown> | undefined)?.videoCodec as string | undefined
  if (codec === 'libx265') return true
  const fmt = props.task.targetFormat
  return fmt === 'hevc' || fmt === 'h265'
})

const isOpeningWithPlayer = ref(false)

/** Save blob to Tauri temp dir and open with system default player */
async function openWithSystemPlayer(): Promise<void> {
  if (!props.task.resultBlob) return
  isOpeningWithPlayer.value = true
  try {
    const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    const { tempDir } = await import('@tauri-apps/api/path')
    const { openPath } = await import('@tauri-apps/plugin-opener')

    const original = props.task.fileItem.detected.file.name
    const dot = original.lastIndexOf('.')
    const stem = dot > 0 ? original.slice(0, dot) : original
    const filename = `${stem}_preview.${props.task.targetFormat}`

    const tmp = await tempDir()
    // Construct full path — tempDir ends with separator on some platforms
    const sep = tmp.endsWith('/') || tmp.endsWith('\\') ? '' : '/'
    const filePath = `${tmp}${sep}${filename}`

    const buffer = new Uint8Array(await props.task.resultBlob.arrayBuffer())
    await writeFile(filePath, buffer)
    await openPath(filePath)
  }
  catch (e) {
    console.error('Failed to open with system player', e)
  }
  finally {
    isOpeningWithPlayer.value = false
  }
}

/** Trigger browser download */
function downloadFile(): void {
  if (!props.task.resultUrl) return
  const original = props.task.fileItem.detected.file.name
  const dot = original.lastIndexOf('.')
  const stem = dot > 0 ? original.slice(0, dot) : original
  const a = document.createElement('a')
  a.href = props.task.resultUrl
  a.download = `${stem}.${props.task.targetFormat}`
  a.click()
}
</script>

<template>
  <div v-if="task.resultUrl" class="rounded-md border bg-muted/30 p-2">
    <!-- Image preview -->
    <img
      v-if="task.fileItem.detected.category === 'image'"
      :src="task.resultUrl"
      :alt="task.fileItem.detected.file.name"
      class="max-h-48 w-full rounded object-contain"
    >

    <!-- Audio preview -->
    <audio
      v-else-if="AUDIO_FORMATS.has(task.targetFormat)"
      controls
      :src="task.resultUrl"
      class="w-full"
    />

    <!-- H.265 video — browser can't decode HEVC -->
    <div
      v-else-if="task.fileItem.detected.category === 'media' && isH265"
      class="flex flex-col items-center gap-3 py-4 text-center"
    >
      <div class="text-2xl">🎬</div>
      <p class="text-sm font-medium">{{ t('preview.h265NoSupport') }}</p>
      <p class="text-xs text-muted-foreground">{{ t('preview.h265Hint') }}</p>
      <div class="flex gap-2">
        <!-- Desktop: open with system player (VLC / IINA / etc.) -->
        <button
          v-if="isDesktop"
          class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          :disabled="isOpeningWithPlayer"
          @click="openWithSystemPlayer"
        >
          <Play class="h-3.5 w-3.5" />
          {{ isOpeningWithPlayer ? t('preview.opening') : t('preview.openWithPlayer') }}
        </button>
        <!-- Web: download and play locally -->
        <button
          v-else
          class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          @click="downloadFile"
        >
          <Download class="h-3.5 w-3.5" />
          {{ t('preview.downloadToPlay') }}
        </button>
      </div>
    </div>

    <!-- Regular video preview (H.264, VP9, etc.) -->
    <video
      v-else-if="task.fileItem.detected.category === 'media'"
      controls
      :src="task.resultUrl"
      class="max-h-64 w-full rounded"
    />
  </div>
</template>
