<script setup lang="ts">
import type { ConversionTask } from '@/types/conversion'

defineProps<{ task: ConversionTask }>()
</script>

<template>
  <div v-if="task.resultUrl" class="rounded-md border bg-muted/30 p-2">
    <img
      v-if="task.fileItem.detected.category === 'image'"
      :src="task.resultUrl"
      :alt="task.fileItem.detected.file.name"
      class="max-h-48 w-full rounded object-contain"
    >
    <audio
      v-else-if="task.targetFormat === 'mp3' || task.targetFormat === 'wav' || task.targetFormat === 'aac' || task.targetFormat === 'flac' || task.targetFormat === 'ogg' || task.targetFormat === 'm4a'"
      controls
      :src="task.resultUrl"
      class="w-full"
    />
    <video
      v-else-if="task.fileItem.detected.category === 'media'"
      controls
      :src="task.resultUrl"
      class="max-h-64 w-full rounded"
    />
  </div>
</template>
